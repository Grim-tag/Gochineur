const express = require('express');
const passport = require('passport');
const router = express.Router();
const { getUsersCollection } = require('../config/db');

/**
 * Routes d'authentification
 */
module.exports = function (googleClientId, googleClientSecret) {
  // Route de connexion Google
  router.get('/google', (req, res, next) => {
    if (!googleClientId || !googleClientSecret) {
      return res.status(500).json({
        error: 'Configuration Google OAuth manquante. Vérifiez les variables d\'environnement.'
      });
    }
    // session: false pour éviter d'utiliser express-session
    // Note: Cela désactive la vérification du paramètre state par défaut qui requiert une session
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false
    })(req, res, next);
  });

  // Callback Google OAuth
  router.get('/google/callback', (req, res, next) => {
    // Déterminer l'URL du client selon l'environnement
    const isProduction = process.env.NODE_ENV === 'production';
    const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

    if (!googleClientId || !googleClientSecret) {
      return res.redirect(`${mainClientUrl}/?error=config_missing`);
    }

    // Redirection d'échec vers l'accueil
    const failureUrl = `${mainClientUrl}/?error=auth_failed`;

    passport.authenticate('google', {
      failureRedirect: failureUrl,
      session: false
    })(req, res, next);
  }, async (req, res) => {
    try {
      const usersCollection = getUsersCollection();
      const user = req.user;

      // Déterminer l'URL du client selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

      if (!user) {
        console.error('❌ Aucun utilisateur dans req.user après authentification');
        return res.redirect(`${mainClientUrl}/?error=no_user`);
      }

      // Recharger l'utilisateur depuis MongoDB pour avoir les données à jour (rôle, displayName)
      const freshUser = await usersCollection.findOne({ id: user.id });
      if (!freshUser) {
        console.error(`❌ Utilisateur ${user.id} non trouvé dans MongoDB`);
        return res.redirect(`${mainClientUrl}/?error=user_not_found`);
      }

      // Mettre à jour req.user avec les données fraîches de MongoDB
      req.user = freshUser;

      // S'assurer que l'utilisateur a un rôle
      if (!freshUser.role) {
        await usersCollection.updateOne(
          { id: freshUser.id },
          { $set: { role: 'user', updatedAt: new Date().toISOString() } }
        );
        freshUser.role = 'user';
        req.user.role = 'user';
      }

      // Générer un JWT pour l'utilisateur
      const { generateToken } = require('../utils/jwt');

      try {
        const token = generateToken(freshUser);

        // Déterminer l'URL du client selon l'environnement
        const isProduction = process.env.NODE_ENV === 'production';
        const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

        // Déterminer la destination finale selon le pseudo et le rôle
        let finalDestination;
        if (!freshUser.displayName) {
          finalDestination = '/set-pseudo';
        } else if (freshUser.role === 'admin' || freshUser.role === 'moderator') {
          finalDestination = '/admin/dashboard';
        } else {
          finalDestination = '/';
        }

        // Rediriger vers la page de callback OAuth avec le token et la destination
        return res.redirect(`${mainClientUrl}/oauth/callback?token=${token}&destination=${encodeURIComponent(finalDestination)}`);
      } catch (jwtError) {
        console.error('❌ Erreur lors de la génération du JWT:', jwtError);
        const isProduction = process.env.NODE_ENV === 'production';
        const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';
        return res.redirect(`${mainClientUrl}/?error=jwt_error`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du callback Google:', error);

      // Déterminer l'URL du client selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

      return res.redirect(`${mainClientUrl}/?error=callback_error`);
    }
  });

  // Route de déconnexion (stateless)
  router.get('/logout', (req, res) => {
    // Avec JWT, la déconnexion se fait côté client en supprimant le token
    // Cette route est juste là pour confirmer
    res.json({ success: true, message: 'Déconnexion réussie (supprimez le token côté client)' });
  });



  return router;
};

