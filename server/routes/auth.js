const express = require('express');
const passport = require('passport');
const router = express.Router();
const { getUsersCollection } = require('../config/db');

/**
 * Routes d'authentification
 */
module.exports = function(googleClientId, googleClientSecret) {
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
    const mainClientUrl = isProduction ? 'http://localhost:5000' : 'http://localhost:5173';
    
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
      const mainClientUrl = isProduction ? 'http://localhost:5000' : 'http://localhost:5173';
      
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
      
      console.log(`🔍 Utilisateur connecté: ${freshUser.email}, Rôle: ${freshUser.role}, Pseudo: ${freshUser.displayName || 'non défini'}`);
      console.log(`📋 Session ID: ${req.sessionID}`);
      console.log(`🍪 Cookie de session: ${req.headers.cookie || 'aucun cookie'}`);
      
      // CRITIQUE: Sauvegarder la session explicitement pour s'assurer qu'elle est persistée
      req.session.save((err) => {
        if (err) {
          console.error('❌ Erreur lors de la sauvegarde de la session:', err);
        } else {
          console.log('✅ Session sauvegardée avec succès');
        }
        
        // Redirection selon le pseudo et le rôle
        // Si l'utilisateur n'a pas de pseudo, rediriger vers /set-pseudo
        if (!freshUser.displayName) {
          console.log(`✅ Redirection vers /set-pseudo (pas de pseudo)`);
          return res.redirect(`${mainClientUrl}/set-pseudo`);
        }
        
        // Si admin/moderator, rediriger vers le dashboard admin
        if (freshUser.role === 'admin' || freshUser.role === 'moderator') {
          console.log(`✅ Redirection vers /admin/dashboard (rôle: ${freshUser.role})`);
          return res.redirect(`${mainClientUrl}/admin/dashboard`);
        }
        
        // Utilisateur normal avec pseudo : rediriger vers l'accueil
        console.log(`✅ Redirection vers / (utilisateur standard)`);
        return res.redirect(`${mainClientUrl}/`);
      });
    } catch (error) {
      console.error('❌ Erreur lors du callback Google:', error);
      console.error('Stack:', error.stack);
      
      // Déterminer l'URL du client selon l'environnement
      const isProduction = process.env.NODE_ENV === 'production';
      const mainClientUrl = isProduction ? 'http://localhost:5000' : 'http://localhost:5173';
      
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
    console.log('🧹 Nettoyage de toutes les sessions...');
    
    // Détruire la session actuelle
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Erreur lors de la destruction de la session:', err);
        return res.status(500).json({ 
          error: 'Erreur lors de la destruction de la session',
          message: err.message 
        });
      }
      
      console.log('✅ Session détruite avec succès');
      res.json({ 
        success: true, 
        message: 'Toutes les sessions ont été détruites. Vous pouvez maintenant vous reconnecter.',
        note: 'Cette route est temporaire et devrait être supprimée en production.'
      });
    });
  });

  // Route pour récupérer l'utilisateur actuel
  router.get('/user/current', (req, res) => {
    if (req.isAuthenticated()) {
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

  // Route pour définir le pseudo
  router.post('/user/set-pseudo', async (req, res) => {
    // Toujours renvoyer du JSON, même en cas d'erreur
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
      
      // Vérifier que la connexion MongoDB est active
      const usersCollection = getUsersCollection();
      
      if (!usersCollection) {
        console.error('❌ Collection users non disponible');
        return res.status(500).json({ 
          error: 'Erreur de connexion à la base de données',
          details: 'La collection users n\'est pas disponible'
        });
      }
      
      const result = await usersCollection.updateOne(
        { id: req.user.id },
        { $set: { displayName: displayName.trim(), updatedAt: new Date().toISOString() } }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      
      // Mettre à jour l'utilisateur dans la session
      req.user.displayName = displayName.trim();
      
      return res.json({
        success: true,
        message: 'Pseudo mis à jour avec succès',
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          displayName: req.user.displayName,
          photo: req.user.photo,
          role: req.user.role || 'user'
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du pseudo:', error);
      console.error('Stack:', error.stack);
      // Toujours renvoyer du JSON, jamais de HTML
      return res.status(500).json({ 
        error: 'Erreur serveur lors de la mise à jour du pseudo',
        details: error.message || 'Erreur inconnue'
      });
    }
  });

  return router;
};

