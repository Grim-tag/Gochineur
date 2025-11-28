const express = require('express');
const router = express.Router();
const { getEventsCollection, getUsersCollection, cleanDatabase } = require('../config/db');
const { normalizeEventType } = require('../utils/dataTransform');
const { authenticateJWT, requireAdminOrModerator, requireAdmin } = require('../middleware/auth');
const { importAllData } = require('../services/dataImporter');

/**
 * Routes d'administration
 */
module.exports = function () {
  // Appliquer l'authentification JWT à toutes les routes admin
  // Sauf si on veut laisser certaines routes publiques (ce qui n'est pas le cas ici)
  router.use(authenticateJWT);

  // Route d'importation depuis DATAtourisme et Open Event Database (OED)
  router.post('/import-data', requireAdmin, async (req, res) => {
    try {
      const result = await importAllData();

      res.status(200).json({
        success: result.success,
        message: `Importation terminée: ${result.imported} événements importés (${result.details.datatourisme.imported} DATAtourisme, ${result.details.oed.imported} OED), ${result.skipped} doublons ignorés.`,
        imported: result.imported,
        skipped: result.skipped,
        invalid: result.invalid,
        filtered: result.filtered,
        errors: result.errors,
        totalEvents: result.totalEvents,
        details: result.details
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation:', error.message);
      return res.status(500).json({
        error: `Erreur lors de l'importation: ${error.message}`
      });
    }
  });

  // Route temporaire pour normaliser les types d'événements existants
  router.post('/normalize-types', requireAdmin, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();

      const events = await eventsCollection.find({}).toArray();
      let updatedCount = 0;
      const typeChanges = {};

      // Parcourir tous les événements et normaliser les types
      for (const event of events) {
        if (event.type) {
          const oldType = event.type;
          const newType = normalizeEventType(oldType);

          if (oldType !== newType) {
            await eventsCollection.updateOne(
              { _id: event._id },
              { $set: { type: newType } }
            );
            updatedCount++;

            // Compter les changements par type
            if (!typeChanges[oldType]) {
              typeChanges[oldType] = { to: newType, count: 0 };
            }
            typeChanges[oldType].count++;
          }
        }
      }

      const totalEvents = await eventsCollection.countDocuments({});

      res.status(200).json({
        success: true,
        message: `${updatedCount} événements mis à jour avec des types normalisés`,
        updated: updatedCount,
        totalEvents: totalEvents,
        changes: typeChanges
      });
    } catch (error) {
      console.error('Erreur lors de la normalisation des types:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });



  // Route temporaire pour publier tous les événements (une seule fois) - PROTÉGÉE
  router.post('/publish-all', requireAdmin, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();

      // Compter les événements avant la mise à jour
      const totalEvents = await eventsCollection.countDocuments({});
      const pendingEvents = await eventsCollection.countDocuments({
        statut_validation: { $in: ['pending_review', 'En attente', 'En Attente', 'en attente', 'pending'] }
      });

      // Mettre à jour tous les événements avec le statut 'published'
      const result = await eventsCollection.updateMany(
        {},
        {
          $set: {
            statut_validation: 'published',
            publishedAt: new Date().toISOString()
          }
        }
      );

      const updatedCount = result.modifiedCount;

      res.status(200).json({
        success: true,
        message: `${updatedCount} événements publiés avec succès`,
        totalEvents,
        pendingBefore: pendingEvents,
        published: updatedCount
      });
    } catch (error) {
      console.error('❌ Erreur lors de la publication des événements:', error);
      return res.status(500).json({
        error: 'Erreur lors de la publication des événements',
        details: error.message
      });
    }
  });

  // Route temporaire pour mettre à jour les statuts des événements existants
  // Cette route met tous les événements en pending_review pour validation manuelle
  router.post('/update-status-to-pending', requireAdmin, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();

      const result = await eventsCollection.updateMany(
        {
          statut_validation: {
            $nin: ['pending_review', 'En attente', 'En Attente', 'en attente']
          }
        },
        {
          $set: { statut_validation: 'pending_review' }
        }
      );

      const updatedCount = result.modifiedCount;
      const totalEvents = await eventsCollection.countDocuments({});

      res.status(200).json({
        success: true,
        message: `${updatedCount} événements mis à jour avec le statut 'pending_review' pour validation manuelle.`,
        updated: updatedCount,
        totalEvents: totalEvents
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statuts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route de nettoyage de la base de données
  router.post('/clean-database', requireAdmin, async (req, res) => {
    try {
      const result = await cleanDatabase();

      res.status(200).json({
        success: result.success,
        message: `Base de données nettoyée. ${result.deleted} événement(s) supprimé(s).`,
        deleted: result.deleted
      });
    } catch (error) {
      console.error('Erreur lors du nettoyage de la base de données:', error);
      res.status(500).json({ error: 'Erreur lors du nettoyage de la base de données' });
    }
  });

  router.post('/clear-data', requireAdmin, async (req, res) => {
    try {
      const result = await cleanDatabase();

      res.status(200).json({
        success: result.success,
        message: `Base de données nettoyée. ${result.deleted} événement(s) supprimé(s).`,
        deleted: result.deleted
      });
    } catch (error) {
      console.error('Erreur lors du nettoyage de la base de données:', error);
      res.status(500).json({ error: 'Erreur lors du nettoyage de la base de données' });
    }
  });

  // Route de migration des IDs (Nettoyage des URLs)
  router.post('/migrate-ids', requireAdmin, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();

      // Trouver tous les événements dont l'ID commence par http (donc les anciens IDs DataTourisme)
      const eventsToMigrate = await eventsCollection.find({
        id: { $regex: /^http/ }
      }).toArray();

      let migratedCount = 0;
      let errors = 0;

      for (const event of eventsToMigrate) {
        try {
          // Extraire l'UUID de l'URL
          // Ex: https://data.datatourisme.fr/23/eaee8540-5625-3790-b055-8e69f0c60f1f
          const parts = event.id.split('/');
          const uuid = parts[parts.length - 1];

          if (uuid && (uuid.length === 36 || uuid.includes('-'))) {
            const newId = `DT_${uuid}`;

            // Vérifier si le nouvel ID existe déjà
            const existing = await eventsCollection.findOne({ id: newId });

            if (!existing) {
              await eventsCollection.updateOne(
                { _id: event._id },
                { $set: { id: newId } }
              );
              migratedCount++;
            } else {
              // Si l'ID existe déjà (doublon), on supprime l'ancien (celui avec l'URL moche)
              // car le nouveau est probablement une réimportation plus récente
              await eventsCollection.deleteOne({ _id: event._id });
              migratedCount++; // On compte comme traité
            }
          }
        } catch (err) {
          console.error(`Erreur migration event ${event.id}:`, err);
          errors++;
        }
      }

      res.status(200).json({
        success: true,
        message: `${migratedCount} événements migrés avec succès.`,
        migrated: migratedCount,
        errors: errors
      });
    } catch (error) {
      console.error('Erreur lors de la migration des IDs:', error);
      res.status(500).json({ error: 'Erreur lors de la migration des IDs' });
    }
  });

  // ==================== ROUTES ADMIN API ====================

  // Route pour obtenir tous les utilisateurs
  router.get('/users', requireAdminOrModerator, async (req, res) => {
    try {
      const usersCollection = getUsersCollection();

      const users = await usersCollection.find({}).toArray();
      const formattedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        displayName: u.displayName,
        role: u.role || 'user',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));

      res.json({ success: true, users: formattedUsers, total: formattedUsers.length });
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour modifier le rôle d'un utilisateur
  router.put('/users/:userId/role', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['admin', 'moderator', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide. Valeurs possibles: admin, moderator, user' });
      }

      if (userId === req.user.id && role !== 'admin' && req.user.role === 'admin') {
        return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits admin' });
      }

      const usersCollection = getUsersCollection();

      const result = await usersCollection.updateOne(
        { id: userId },
        { $set: { role: role, updatedAt: new Date().toISOString() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const updatedUser = await usersCollection.findOne({ id: userId });

      res.json({
        success: true,
        message: 'Rôle modifié avec succès',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error('Erreur lors de la modification du rôle:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour supprimer un utilisateur (RGPD - Droit à l'oubli)
  router.delete('/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (userId === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
      }

      const usersCollection = getUsersCollection();
      const eventsCollection = getEventsCollection();

      const deletedUser = await usersCollection.findOne({ id: userId });
      if (!deletedUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Supprimer l'utilisateur
      await usersCollection.deleteOne({ id: userId });

      // Mettre à jour les événements associés
      await eventsCollection.updateMany(
        { user_id: userId },
        {
          $unset: { user_id: '' },
          $set: { submitted_by_pseudo: 'Utilisateur supprimé' }
        }
      );

      res.json({
        success: true,
        message: 'Utilisateur supprimé avec succès (RGPD)'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour obtenir tous les événements avec détails pour l'admin
  router.get('/events', requireAdminOrModerator, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();

      let events = await eventsCollection.find({}).toArray();
      events = events.map(event => ({
        ...event,
        submitted_by_pseudo: event.submitted_by_pseudo || 'Inconnu',
        user_id: event.user_id || null
      }));

      // Calcul des périodes par rapport à la date du jour (2025-11-18)
      const today = new Date('2025-11-18');
      today.setHours(0, 0, 0, 0);

      // Période 1 : Aujourd'hui jusqu'à 2 mois après
      const period1Start = new Date(today);
      const period1End = new Date(today);
      period1End.setMonth(period1End.getMonth() + 2);
      period1End.setDate(0); // Dernier jour du 2ème mois
      period1End.setHours(23, 59, 59, 999);

      // Période 2 : De la fin de la période 1 jusqu'à la fin de l'année 2025
      const period2Start = new Date(period1End);
      period2Start.setDate(period2Start.getDate() + 1);
      period2Start.setHours(0, 0, 0, 0);
      const period2End = new Date('2025-12-31');
      period2End.setHours(23, 59, 59, 999);

      // Période 3 : Toute l'année 2026
      const period3Start = new Date('2026-01-01');
      period3Start.setHours(0, 0, 0, 0);
      const period3End = new Date('2026-12-31');
      period3End.setHours(23, 59, 59, 999);

      // Filtrer par période si le paramètre est fourni
      const period = req.query.period;
      if (period === '1' || period === '2-months') {
        // Période 1 : 2 mois en cours
        events = events.filter(event => {
          if (!event.date_debut) return false;
          const eventDate = new Date(event.date_debut);
          return eventDate >= period1Start && eventDate <= period1End;
        });
      } else if (period === '2' || period === 'rest-2025') {
        // Période 2 : Reste de l'année 2025
        events = events.filter(event => {
          if (!event.date_debut) return false;
          const eventDate = new Date(event.date_debut);
          return eventDate >= period2Start && eventDate <= period2End;
        });
      } else if (period === '3' || period === '2026') {
        // Période 3 : Année 2026
        events = events.filter(event => {
          if (!event.date_debut) return false;
          const eventDate = new Date(event.date_debut);
          return eventDate >= period3Start && eventDate <= period3End;
        });
      }
      // Si period n'est pas fourni ou est 'all', on retourne tous les événements

      // Tri optimisé pour la modération :
      // 1. Priorité primaire : Statut (pending_review en premier pour modération)
      // 2. Priorité secondaire : Date de début (ascendante, du plus proche au plus éloigné)
      events.sort((a, b) => {
        // Fonction pour déterminer la priorité du statut (pending_review = 1, published = 2)
        const getStatusPriority = (statut) => {
          const normalizedStatut = (statut || '').toLowerCase();
          if (normalizedStatut === 'pending_review' || normalizedStatut === 'en attente' || normalizedStatut === 'en attente de validation') {
            return 1; // Priorité haute
          }
          return 2; // Priorité basse (published ou autres)
        };

        // Tri primaire par statut (pending_review en premier)
        const statusPriorityA = getStatusPriority(a.statut_validation);
        const statusPriorityB = getStatusPriority(b.statut_validation);

        if (statusPriorityA !== statusPriorityB) {
          return statusPriorityA - statusPriorityB; // pending_review (1) avant published (2)
        }

        // Tri secondaire par date_debut (ascendante, du plus proche au plus éloigné)
        const dateA = a.date_debut ? new Date(a.date_debut).getTime() : 0;
        const dateB = b.date_debut ? new Date(b.date_debut).getTime() : 0;
        const fallbackA = a.date_creation ? new Date(a.date_creation).getTime() : 0;
        const fallbackB = b.date_creation ? new Date(b.date_creation).getTime() : 0;

        const finalDateA = dateA || fallbackA;
        const finalDateB = dateB || fallbackB;

        // Tri ascendant (du plus proche au plus éloigné)
        return finalDateA - finalDateB;
      });

      res.json({ success: true, events, total: events.length });
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour valider un événement (changer le statut)
  router.put('/events/:eventId/validate', requireAdminOrModerator, async (req, res) => {
    try {
      const { eventId } = req.params;
      const eventsCollection = getEventsCollection();
      const usersCollection = getUsersCollection();

      // 1. Récupérer l'événement pour obtenir l'ID de l'utilisateur
      const event = await eventsCollection.findOne({ id: eventId });
      if (!event) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      // Si l'événement est déjà validé, ne rien faire de plus (pour éviter de compter deux fois)
      if (event.statut_validation === 'published') {
        return res.json({ success: true, message: 'Événement déjà validé', event });
      }

      // 2. Mettre à jour l'événement
      const result = await eventsCollection.updateOne(
        { id: eventId },
        {
          $set: {
            statut_validation: 'published',
            validatedAt: new Date().toISOString(),
            validatedBy: req.user.id
          }
        }
      );

      // 3. Si l'événement a un auteur (user_id), mettre à jour ses statistiques
      if (event.user_id) {
        // Incrémenter le compteur d'événements validés
        await usersCollection.updateOne(
          { id: event.user_id },
          { $inc: { validatedEventsCount: 1 } }
        );

        // Vérifier si l'utilisateur devient expert (>= 10 événements validés)
        const user = await usersCollection.findOne({ id: event.user_id });
        if (user && user.validatedEventsCount >= 10 && !user.isExpert) {
          await usersCollection.updateOne(
            { id: event.user_id },
            { $set: { isExpert: true } }
          );
          console.log(`🎉 L'utilisateur ${user.displayName} (${user.id}) est devenu Chineur Expert !`);
        }
      }

      const updatedEvent = await eventsCollection.findOne({ id: eventId });

      res.json({
        success: true,
        message: 'Événement validé avec succès',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Erreur lors de la validation de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour refuser un événement
  router.put('/events/:eventId/reject', requireAdminOrModerator, async (req, res) => {
    try {
      const { eventId } = req.params;
      const eventsCollection = getEventsCollection();

      const result = await eventsCollection.updateOne(
        { id: eventId },
        {
          $set: {
            statut_validation: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: req.user.id
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      const updatedEvent = await eventsCollection.findOne({ id: eventId });

      res.json({
        success: true,
        message: 'Événement refusé',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Erreur lors du refus de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour mettre à jour un événement
  router.put('/events/:eventId', requireAdminOrModerator, async (req, res) => {
    try {
      const { eventId } = req.params;
      const updates = req.body;

      const eventsCollection = getEventsCollection();

      // Mettre à jour les champs autorisés
      const allowedFields = ['name', 'type', 'date_debut', 'date_fin', 'city', 'address', 'postalCode', 'latitude', 'longitude', 'description', 'prix_visiteur', 'prix_montant'];
      const updateData = {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.id
      };

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      });

      const result = await eventsCollection.updateOne(
        { id: eventId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      const updatedEvent = await eventsCollection.findOne({ id: eventId });

      res.json({
        success: true,
        message: 'Événement mis à jour avec succès',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour supprimer un événement
  router.delete('/events/:eventId', requireAdminOrModerator, async (req, res) => {
    try {
      const { eventId } = req.params;
      const eventsCollection = getEventsCollection();

      const deletedEvent = await eventsCollection.findOne({ id: eventId });
      if (!deletedEvent) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      await eventsCollection.deleteOne({ id: eventId });

      res.json({
        success: true,
        message: 'Événement supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  return router;
};

