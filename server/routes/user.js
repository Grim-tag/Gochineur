const express = require('express');
const router = express.Router();
const { getUsersCollection } = require('../config/db');

/**
 * Routes API pour les utilisateurs
 */
module.exports = function () {
  // Route POST /api/user/set-pseudo
  router.post('/set-pseudo', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { displayName } = req.body;

      if (!displayName || displayName.trim().length === 0) {
        return res.status(400).json({ error: 'Le pseudo est requis' });
      }

      if (displayName.trim().length > 50) {
        return res.status(400).json({ error: 'Le pseudo ne peut pas dépasser 50 caractères' });
      }

      const usersCollection = getUsersCollection();

      if (!usersCollection) {
        return res.status(500).json({
          error: 'Erreur de connexion à la base de données',
          details: 'La collection users n\'est pas disponible'
        });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Utilisateur non authentifié ou ID manquant' });
      }

      const result = await usersCollection.updateOne(
        { id: req.user.id },
        { $set: { displayName: displayName.trim(), updatedAt: new Date().toISOString() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const updatedUser = await usersCollection.findOne({ id: req.user.id });

      if (!updatedUser) {
        return res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur mis à jour' });
      }

      req.user.displayName = updatedUser.displayName;
      req.user.role = updatedUser.role || 'user';

      return res.status(200).json({
        success: true,
        message: 'Pseudo mis à jour avec succès',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          displayName: updatedUser.displayName,
          photo: updatedUser.photo,
          role: updatedUser.role || 'user'
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du pseudo:', error);
      return res.status(500).json({
        error: 'Erreur serveur lors de la mise à jour du pseudo',
        details: error.message || 'Erreur inconnue'
      });
    }
  });

  // Route GET /api/user/current
  router.get('/current', (req, res) => {
    // Empêcher le cache pour cette route critique
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (req.isAuthenticated() && req.user) {
      res.json({
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          displayName: req.user.displayName,
          photo: req.user.photo,
          role: req.user.role || 'user'
        }
      });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  return router;
};


