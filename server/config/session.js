const session = require('express-session');
const MongoSessionStore = require('./sessionStore');

// Référence globale au store pour l'initialisation ultérieure
let mongoStoreInstance = null;

/**
 * Configure et retourne le middleware de session Express
 * @param {string} secret - Secret de session (depuis .env)
 * @returns {Function} - Middleware Express pour les sessions
 */
function configureSession(secret) {
  // Utiliser MongoDB store en production, MemoryStore en développement
  const isProduction = process.env.NODE_ENV === 'production';

  // Détecter si on est sur HTTPS (production réelle) ou HTTP (localhost)
  // En production locale (localhost), on utilise HTTP, donc secure doit être false
  // Pour la production réelle (gochineur.fr), on utilisera HTTPS et secure sera true
  const isHttps = process.env.HTTPS === 'true' ||
    (process.env.PROTOCOL === 'https') ||
    (process.env.URL && process.env.URL.startsWith('https'));

  const sessionConfig = {
    secret: secret || 'gochineur-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false, // Ne pas créer de session pour les requêtes non authentifiées
    name: 'gochineur.sid', // Nom personnalisé du cookie de session
    cookie: {
      secure: isHttps, // true uniquement si HTTPS (pas pour localhost HTTP)
      httpOnly: true, // Empêche l'accès JavaScript au cookie (sécurité)
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
      sameSite: isProduction ? 'none' : 'lax' // 'none' en production pour OAuth, 'lax' en dev
    }
  };

  if (isProduction && !isHttps) {
    console.log('ℹ️ Mode production locale (HTTP): cookies secure désactivés pour localhost');
  }

  // Utiliser MongoDB store en production
  if (isProduction) {
    try {
      mongoStoreInstance = new MongoSessionStore();
      sessionConfig.store = mongoStoreInstance;
      console.log('✅ Store de session MongoDB configuré pour la production');
    } catch (error) {
      console.warn('⚠️ Impossible d\'initialiser le store MongoDB, utilisation de MemoryStore:', error.message);
      // Fallback sur MemoryStore si MongoDB n'est pas disponible
    }
  } else {
    // En développement, utiliser MemoryStore (plus simple, pas de persistance)
    console.log('ℹ️ Mode développement: utilisation de MemoryStore pour les sessions');
  }

  return session(sessionConfig);
}

/**
 * Initialise le store de session MongoDB (à appeler après la connexion DB)
 * @returns {Promise<void>}
 */
async function initializeSessionStore() {
  if (mongoStoreInstance) {
    try {
      await mongoStoreInstance.initialize();
    } catch (error) {
      console.warn('⚠️ Erreur lors de l\'initialisation du store de session:', error.message);
    }
  }
}

module.exports = {
  configureSession,
  initializeSessionStore
};

