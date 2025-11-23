const express = require('express');
const router = express.Router();
const { getEventsCollection } = require('../config/db');
const { calculateDistance, normalizeEventType } = require('../utils/dataTransform');
const { generateEventHash, eventExists } = require('../utils/eventHash');
const { getTodayISO, formatDateISO } = require('../utils/dateUtils');
const { EVENTS, EVENT_STATUS, GEOLOCATION } = require('../config/constants');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Routes publiques pour les événements
 */
module.exports = function () {
  // Route pour obtenir tous les événements (futurs uniquement) avec filtrage géographique et par période optionnel
  router.get('/', async (req, res) => {
    try {
      // Vérifier que la collection est disponible
      let eventsCollection;
      try {
        eventsCollection = getEventsCollection();
      } catch (collectionError) {
        console.error('❌ Erreur: Impossible de récupérer la collection events:', collectionError);
        return res.status(500).json({
          error: 'Erreur de connexion à la base de données',
          details: collectionError.message
        });
      }

      // Vérifier que la collection existe et est accessible
      const collectionExists = await eventsCollection.countDocuments({}).catch(err => {
        console.error('❌ Erreur lors du comptage des documents:', err);
        return -1;
      });

      if (collectionExists === -1) {
        return res.status(500).json({
          error: 'Erreur d\'accès à la collection events',
          details: 'Impossible de compter les documents'
        });
      }

      // Date d'aujourd'hui pour filtrer les événements passés
      const todayISO = getTodayISO();

      // Paramètres de filtrage géographique (optionnels)
      let userLat = req.query.lat ? parseFloat(req.query.lat) : null;
      let userLon = req.query.lon ? parseFloat(req.query.lon) : null;
      const radius = req.query.radius ? parseFloat(req.query.radius) : EVENTS.DEFAULT_RADIUS;

      // Validation des coordonnées
      if (userLat !== null && (isNaN(userLat) || userLat < -90 || userLat > 90)) {
        userLat = null;
      }
      if (userLon !== null && (isNaN(userLon) || userLon < -180 || userLon > 180)) {
        userLon = null;
      }

      // Paramètres de filtrage par période (optionnels)
      const startDateParam = req.query.start_date;
      const endDateParam = req.query.end_date;
      const eventTypeParam = req.query.type; // Filtre par type d'événement
      let startDate = null;
      let endDate = null;

      if (startDateParam) {
        startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
      }
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      }


      // Construction de la requête MongoDB avec filtres de base
      const query = {};

      // Filtre de statut : uniquement les événements publiés
      query.statut_validation = { $in: EVENT_STATUS.PUBLISHED };

      // Filtre de date : utiliser les paramètres start_date et end_date du frontend
      // CRITIQUE: Exclure les événements passés (date_debut < aujourd'hui)
      // MongoDB peut stocker les dates comme strings (YYYY-MM-DD) ou comme Date objects
      // On utilise une comparaison de strings pour être compatible avec les deux formats
      const dateFilter = {};

      // Toujours exclure les événements passés (date_debut >= aujourd'hui)
      // Utiliser la date la plus récente entre startDate et today
      let minDate = todayISO;
      if (startDate) {
        const startDateISO = startDate.toISOString().split('T')[0];
        // Utiliser la date la plus récente (aujourd'hui ou startDate)
        minDate = startDateISO < todayISO ? todayISO : startDateISO;
      }

      // MongoDB compare les strings lexicographiquement, ce qui fonctionne pour YYYY-MM-DD
      dateFilter.$gte = minDate;

      if (endDate) {
        const endDateISO = endDate.toISOString().split('T')[0];
        // Pour la date de fin, on compare avec <= endDate, donc on utilise $lte
        // Mais on doit s'assurer que les dates avec heure sont incluses
        dateFilter.$lte = endDateISO + 'T23:59:59.999Z';
      }

      query.date_debut = dateFilter;

      // Filtre de type d'événement si fourni
      if (eventTypeParam && eventTypeParam !== 'tous') {
        query.type = eventTypeParam;
      }


      // Récupérer les événements depuis MongoDB avec les filtres de base
      // Si une recherche géographique est active, on augmente la limite pour être sûr de trouver les événements proches
      // car le filtrage se fait en mémoire (pour gérer les types mixtes string/number des coordonnées)
      const isGeoSearch = userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon);
      const limit = isGeoSearch ? 10000 : EVENTS.DEFAULT_LIMIT;

      let futureEvents = await eventsCollection.find(query)
        .sort({ date_debut: 1 }) // Trier par date croissante
        .limit(limit)
        .toArray();

      if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
        // Calculer les distances pour tous les événements
        futureEvents.forEach(event => {
          // CRITIQUE: Les coordonnées peuvent être stockées comme nombres ou chaînes dans MongoDB
          const lat = typeof event.latitude === 'number' ? event.latitude : parseFloat(event.latitude);
          const lon = typeof event.longitude === 'number' ? event.longitude : parseFloat(event.longitude);

          // Validation stricte des coordonnées
          if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0 &&
            lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            event.distance = Math.round(calculateDistance(userLat, userLon, lat, lon) * 10) / 10;
          } else {
            // Événement sans coordonnées valides
            event.distance = null;
          }
        });

        // Filtrer par rayon de recherche
        futureEvents = futureEvents.filter(event => {
          if (!event.distance || event.distance === null) {
            return false; // Exclure les événements sans coordonnées valides
          }
          return event.distance <= radius;
        });
      }

      // S'assurer que la réponse est bien un tableau, même s'il est vide
      if (!Array.isArray(futureEvents)) {
        console.error('❌ Erreur: futureEvents n\'est pas un tableau:', typeof futureEvents);
        return res.status(500).json({ error: 'Erreur: la réponse n\'est pas un tableau' });
      }

      res.json(futureEvents);
    } catch (error) {
      console.error('Erreur lors de la lecture des événements:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour obtenir un événement par son ID
  router.get('/:id', async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();
      const eventId = req.params.id;

      const event = await eventsCollection.findOne({ id: eventId });

      if (!event) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      res.json(event);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route pour récupérer les événements de l'utilisateur connecté
  router.get('/my-events', authenticateJWT, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();
      const userId = req.user.id;
      console.log(`🔍 Récupération des événements pour user_id: ${userId}`);

      const myEvents = await eventsCollection.find({ user_id: userId })
        .sort({ date_creation: -1 }) // Plus récents d'abord
        .toArray();

      console.log(`✅ ${myEvents.length} événements trouvés pour user_id: ${userId}`);
      res.json(myEvents);
    } catch (error) {
      console.error('Erreur lors de la récupération des événements utilisateur:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Route de soumission d'événement par l'utilisateur
  router.post('/submit', authenticateJWT, async (req, res) => {
    // L'utilisateur est déjà authentifié par le middleware authenticateJWT
    // req.user contient les infos du token décodé

    try {
      const {
        role, type, address, city, postalCode, latitude, longitude,
        date_debut, date_fin, heure_debut, heure_fin,
        name, telephone, pays, prix_visiteur, prix_montant,
        description_visiteurs, description_exposants
      } = req.body;

      // Validation des champs obligatoires
      if (!name || !type || !date_debut || !city || !address || !latitude || !longitude) {
        return res.status(400).json({
          error: 'Champs obligatoires manquants.',
          required: ['name', 'type', 'date_debut', 'city', 'address', 'latitude', 'longitude']
        });
      }

      // Validation des coordonnées
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ error: 'Coordonnées GPS invalides.' });
      }

      const eventsCollection = getEventsCollection();

      // Construire la date de début avec l'heure
      let dateDebutISO = new Date(date_debut);
      if (heure_debut) {
        const [hours, minutes] = heure_debut.split(':');
        dateDebutISO.setHours(parseInt(hours) || 6, parseInt(minutes) || 0, 0, 0);
      } else {
        dateDebutISO.setHours(6, 0, 0, 0);
      }

      // Construire la date de fin avec l'heure
      let dateFinISO = date_fin ? new Date(date_fin) : new Date(dateDebutISO);
      if (heure_fin) {
        const [hours, minutes] = heure_fin.split(':');
        dateFinISO.setHours(parseInt(hours) || 23, parseInt(minutes) || 59, 59, 999);
      } else {
        dateFinISO.setHours(23, 59, 59, 999);
      }

      // Construire la description complète
      let description = '';
      if (description_visiteurs) {
        description += `Informations visiteurs :\n${description_visiteurs}\n\n`;
      }
      if (description_exposants) {
        description += `Modalités d'inscription / Horaires exposants :\n${description_exposants}`;
      }

      // Normaliser le type d'événement
      const normalizedType = normalizeEventType(type);

      // Vérifier que l'utilisateur a un pseudo (displayName)
      if (!req.user.displayName) {
        return res.status(400).json({
          error: 'Pseudo requis. Veuillez définir votre pseudo avant de soumettre un événement.',
          redirectTo: '/set-pseudo'
        });
      }

      // Construire l'objet événement pour la vérification de doublon
      const eventToCheck = {
        date_debut: dateDebutISO.toISOString(),
        latitude: lat,
        longitude: lon
      };

      // Vérification anti-doublon avec MongoDB
      const exists = await eventExists(eventToCheck, eventsCollection);
      if (exists) {
        return res.status(409).json({
          error: 'Cet événement semble déjà exister. Si vous souhaitez le mettre à jour, veuillez contacter l\'administration.',
          duplicate: true
        });
      }

      // Générer le hash pour l'événement
      const eventHash = generateEventHash(eventToCheck);

      const newEvent = {
        id: `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        id_source: `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source_name: 'Utilisateur',
        name: name.trim(),
        type: normalizedType,
        date: date_debut.split('T')[0],
        date_debut: dateDebutISO.toISOString(),
        date_fin: dateFinISO.toISOString(),
        city: city.trim(),
        postalCode: postalCode || '',
        address: address.trim(),
        latitude: lat,
        longitude: lon,
        description: description.trim(),
        distance: 0,
        statut_validation: 'pending_review',
        date_creation: new Date().toISOString(),
        role: role || 'Autre',
        telephone: telephone || '',
        pays: pays || 'France',
        prix_visiteur: prix_visiteur || 'Gratuite',
        prix_montant: prix_montant ? parseFloat(prix_montant) : null,
        user_id: req.user.id,
        submitted_by_pseudo: req.user.displayName, // Utiliser uniquement displayName (pseudo)
        eventHash: eventHash // Ajouter le hash pour la détection de doublons
      };

      // Si l'utilisateur est un expert, l'événement est automatiquement publié
      if (req.user.isExpert) {
        newEvent.statut_validation = 'published';
        newEvent.publishedAt = new Date().toISOString();
      }

      await eventsCollection.insertOne(newEvent);

      res.status(201).json({
        success: true,
        message: req.user.isExpert
          ? 'Événement publié instantanément (Mode Expert) !'
          : 'Événement soumis avec succès. Il est en attente de validation.',
        event: {
          id: newEvent.id,
          name: newEvent.name,
          statut_validation: newEvent.statut_validation
        }
      });
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      res.status(500).json({ error: 'Erreur lors de la soumission de l\'événement' });
    }
  });

  // Route pour modifier un événement (PUT /:id)
  router.put('/:id', authenticateJWT, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();
      const eventId = req.params.id;
      const userId = req.user.id;

      // Vérifier si l'événement existe et appartient à l'utilisateur
      const event = await eventsCollection.findOne({ id: eventId });

      if (!event) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      // Vérification de propriété (seul le créateur ou un admin peut modifier)
      // TODO: Ajouter vérification admin si nécessaire
      if (event.user_id !== userId) {
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cet événement' });
      }

      const {
        role, type, address, city, postalCode, latitude, longitude,
        date_debut, date_fin, heure_debut, heure_fin,
        name, telephone, pays, prix_visiteur, prix_montant,
        description_visiteurs, description_exposants
      } = req.body;

      // Validation des champs obligatoires (similaire à POST)
      if (!name || !type || !date_debut || !city || !address || !latitude || !longitude) {
        return res.status(400).json({
          error: 'Champs obligatoires manquants.',
          required: ['name', 'type', 'date_debut', 'city', 'address', 'latitude', 'longitude']
        });
      }

      // Validation des coordonnées
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ error: 'Coordonnées GPS invalides.' });
      }

      // Construire les dates
      let dateDebutISO = new Date(date_debut);
      if (heure_debut) {
        const [hours, minutes] = heure_debut.split(':');
        dateDebutISO.setHours(parseInt(hours) || 6, parseInt(minutes) || 0, 0, 0);
      } else {
        dateDebutISO.setHours(6, 0, 0, 0);
      }

      let dateFinISO = date_fin ? new Date(date_fin) : new Date(dateDebutISO);
      if (heure_fin) {
        const [hours, minutes] = heure_fin.split(':');
        dateFinISO.setHours(parseInt(hours) || 23, parseInt(minutes) || 59, 59, 999);
      } else {
        dateFinISO.setHours(23, 59, 59, 999);
      }

      // Construire la description
      let description = '';
      if (description_visiteurs) {
        description += `Informations visiteurs :\n${description_visiteurs}\n\n`;
      }
      if (description_exposants) {
        description += `Modalités d'inscription / Horaires exposants :\n${description_exposants}`;
      }

      const normalizedType = normalizeEventType(type);

      // Mise à jour de l'événement
      const updateData = {
        name: name.trim(),
        type: normalizedType,
        date: date_debut.split('T')[0],
        date_debut: dateDebutISO.toISOString(),
        date_fin: dateFinISO.toISOString(),
        city: city.trim(),
        postalCode: postalCode || '',
        address: address.trim(),
        latitude: lat,
        longitude: lon,
        description: description.trim(),
        role: role || 'Autre',
        telephone: telephone || '',
        pays: pays || 'France',
        prix_visiteur: prix_visiteur || 'Gratuite',
        prix_montant: prix_montant ? parseFloat(prix_montant) : null,
        updatedAt: new Date().toISOString(),
        // Si l'événement était publié, il repasse en attente de validation (sauf si expert)
        statut_validation: req.user.isExpert ? 'published' : 'pending_review'
      };

      await eventsCollection.updateOne(
        { id: eventId },
        { $set: updateData }
      );

      res.json({
        success: true,
        message: 'Événement mis à jour avec succès.',
        event: { ...event, ...updateData }
      });

    } catch (error) {
      console.error('Erreur lors de la modification de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la modification' });
    }
  });

  // Route pour annuler un événement (PATCH /:id/cancel)
  router.patch('/:id/cancel', authenticateJWT, async (req, res) => {
    try {
      const eventsCollection = getEventsCollection();
      const eventId = req.params.id;
      const userId = req.user.id;

      const event = await eventsCollection.findOne({ id: eventId });

      if (!event) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      if (event.user_id !== userId) {
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à annuler cet événement' });
      }

      await eventsCollection.updateOne(
        { id: eventId },
        {
          $set: {
            cancelled: true,
            updatedAt: new Date().toISOString()
          }
        }
      );

      res.json({
        success: true,
        message: 'Événement annulé avec succès.',
        eventId: eventId
      });

    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'événement:', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'annulation' });
    }
  });

  return router;
};
