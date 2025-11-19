const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getUsersCollection } = require('./db');

/**
 * Configure Passport avec la stratégie Google OAuth
 * @param {string} clientID - Google Client ID
 * @param {string} clientSecret - Google Client Secret
 * @param {string} callbackURL - URL de callback
 * @param {string} masterAdminEmail - Email de l'admin maître (optionnel)
 */
function configurePassport(clientID, clientSecret, callbackURL, masterAdminEmail = null) {
  if (!clientID || !clientSecret) {
    console.warn('⚠️  Configuration Google OAuth manquante. Passport ne sera pas configuré.');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: clientID,
    clientSecret: clientSecret,
    callbackURL: callbackURL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const usersCollection = getUsersCollection();
      
      // Chercher l'utilisateur existant
      const existingUser = await usersCollection.findOne({ googleId: profile.id });
      
      if (existingUser) {
        // Si l'utilisateur existe mais n'a pas de rôle, lui attribuer 'user' par défaut
        if (!existingUser.role) {
          await usersCollection.updateOne(
            { googleId: profile.id },
            { $set: { role: 'user', updatedAt: new Date().toISOString() } }
          );
          existingUser.role = 'user';
        }
        
        // Vérifier si c'est l'admin maître et le promouvoir si nécessaire
        if (masterAdminEmail && existingUser.email === masterAdminEmail && existingUser.role !== 'admin') {
          await usersCollection.updateOne(
            { googleId: profile.id },
            { $set: { role: 'admin', updatedAt: new Date().toISOString() } }
          );
          existingUser.role = 'admin';
          console.log(`✅ Admin maître promu lors de la connexion: ${existingUser.email}`);
        }
        
        return done(null, existingUser);
      }
      
      // Déterminer le rôle initial pour le nouvel utilisateur
      let initialRole = 'user';
      const userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (masterAdminEmail && userEmail === masterAdminEmail) {
        initialRole = 'admin';
        console.log(`🔑 Création de l'admin maître: ${userEmail}`);
      }
      
      // Créer un nouvel utilisateur
      const newUser = {
        id: `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        googleId: profile.id,
        email: userEmail || 'unknown@email.com',
        name: profile.displayName || (profile.name && profile.name.givenName) || 'Utilisateur',
        displayName: null,
        photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        role: initialRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await usersCollection.insertOne(newUser);
      
      console.log(`✅ Nouvel utilisateur créé: ${newUser.email} (rôle: ${newUser.role})`);
      
      return done(null, newUser);
    } catch (error) {
      console.error('❌ Erreur dans la stratégie Google OAuth:', error);
      return done(error, null);
    }
  }));

  // Sérialisation de l'utilisateur pour la session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const usersCollection = getUsersCollection();
      const user = await usersCollection.findOne({ id: id });
      
      // Si l'utilisateur existe mais n'a pas de rôle, lui attribuer 'user'
      if (user && !user.role) {
        await usersCollection.updateOne(
          { id: id },
          { $set: { role: 'user', updatedAt: new Date().toISOString() } }
        );
        user.role = 'user';
      }
      
      done(null, user || null);
    } catch (error) {
      console.error('❌ Erreur lors de la désérialisation:', error);
      done(error, null);
    }
  });
}

module.exports = {
  configurePassport
};


