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
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
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

    passport.authenticate('google', { failureRedirect: failureUrl })(req, res, next);
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

      // Sauvegarder la session explicitement pour s'assurer qu'elle est persistée
      console.log(`🔐 Tentative de sauvegarde de session pour: ${freshUser.email}, role: ${freshUser.role}`);

      // IMPORTANT: Utiliser req.login() de Passport pour sérialiser correctement l'utilisateur
      // Cela force la création du cookie de session
      req.login(freshUser, (loginErr) => {
        if (loginErr) {
          console.error('❌ Erreur lors du login Passport:', loginErr);
          const isProduction = process.env.NODE_ENV === 'production';
          const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';
          return res.redirect(`${mainClientUrl}/?error=login_error`);
        }

        console.log(`✅ Utilisateur connecté via Passport: ${freshUser.email}`);
        console.log(`🍪 Session ID: ${req.sessionID}`);

        // Déterminer l'URL du client selon l'environnement
        const isProduction = process.env.NODE_ENV === 'production';
        const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

        // Redirection selon le pseudo et le rôle
        if (!freshUser.displayName) {
          console.log(`➡️  Redirection vers /set-pseudo pour ${freshUser.email}`);
          return res.redirect(`${mainClientUrl}/set-pseudo`);
        }

        if (freshUser.role === 'admin' || freshUser.role === 'moderator') {
          console.log(`➡️  Redirection vers /admin/dashboard pour ${freshUser.email} (${freshUser.role})`);
          return res.redirect(`${mainClientUrl}/admin/dashboard`);
        }

        console.log(`➡️  Redirection vers / pour ${freshUser.email}`);
        return res.redirect(`${mainClientUrl}/`);
      });
    } catch (error) {
      console.error('❌ Erreur lors du callback Google:', error);

      // Déterminer l'URL du client selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

      return res.redirect(`${mainClientUrl}/?error=callback_error`);
    }
  });

  // Route de déconnexion
  router.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
      }
      res.json({ success: true, message: 'Déconnexion réussie' });
    });
  });

  // Route temporaire pour détruire toutes les sessions (nettoyage agressif)
  router.get('/logout-all', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Erreur lors de la destruction de la session:', err);
        return res.status(500).json({
          error: 'Erreur lors de la destruction de la session',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Toutes les sessions ont été détruites. Vous pouvez maintenant vous reconnecter.',
        note: 'Cette route est temporaire et devrait être supprimée en production.'
      });
    });
  });



  return router;
};

