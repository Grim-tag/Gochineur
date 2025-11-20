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

      // IMPORTANT: Régénérer la session pour forcer l'envoi du Set-Cookie header
      req.session.regenerate((err) => {
        if (err) {
          console.error('❌ Erreur lors de la régénération de la session:', err);
          const isProduction = process.env.NODE_ENV === 'production';
          const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';
          return res.redirect(`${mainClientUrl}/?error=session_error`);
        }

        // Réassigner l'utilisateur après régénération
        req.user = freshUser;

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('❌ Erreur lors de la sauvegarde de la session:', saveErr);
          } else {
            console.log(`✅ Session sauvegardée avec succès pour: ${freshUser.email}`);
            console.log(`🍪 Session ID: ${req.sessionID}`);
          }

          // Déterminer l'URL du client selon l'environnement
          const isProduction = process.env.NODE_ENV === 'production';
          const mainClientUrl = isProduction ? (process.env.URL || 'http://localhost:5000') : 'http://localhost:5173';

          // Déterminer l'URL de redirection selon le pseudo et le rôle
          let redirectUrl;
          if (!freshUser.displayName) {
            console.log(`➡️  Redirection vers /set-pseudo pour ${freshUser.email}`);
            redirectUrl = `${mainClientUrl}/set-pseudo`;
          } else if (freshUser.role === 'admin' || freshUser.role === 'moderator') {
            console.log(`➡️  Redirection vers /admin/dashboard pour ${freshUser.email} (${freshUser.role})`);
            redirectUrl = `${mainClientUrl}/admin/dashboard`;
          } else {
            console.log(`➡️  Redirection vers / pour ${freshUser.email}`);
            redirectUrl = `${mainClientUrl}/`;
          }

          // Au lieu de rediriger immédiatement, envoyer une page HTML qui redirige via JavaScript
          // Cela donne au navigateur le temps de traiter le cookie Set-Cookie
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Connexion réussie</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  text-align: center;
                  color: white;
                }
                .spinner {
                  border: 4px solid rgba(255,255,255,0.3);
                  border-radius: 50%;
                  border-top: 4px solid white;
                  width: 40px;
                  height: 40px;
                  animation: spin 1s linear infinite;
                  margin: 20px auto;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>✅ Connexion réussie !</h1>
                <div class="spinner"></div>
                <p>Redirection en cours...</p>
              </div>
              <script>
                // Attendre un peu pour que le cookie soit bien enregistré
                setTimeout(function() {
                  window.location.href = '${redirectUrl}';
                }, 1000);
              </script>
            </body>
            </html>
          `);
        });
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

