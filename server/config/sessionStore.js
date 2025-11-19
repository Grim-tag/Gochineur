const session = require('express-session');
const { getDB } = require('./db');

/**
 * Crée un store de session MongoDB personnalisé
 * Compatible avec express-session
 */
class MongoSessionStore extends session.Store {
  constructor() {
    super();
    this.collection = null;
    this.initialized = false;
  }

  /**
   * Initialise la collection de sessions
   */
  async initialize() {
    if (this.initialized && this.collection) {
      return; // Déjà initialisé
    }
    
    try {
      // Vérifier que la connexion MongoDB est établie
      const db = getDB();
      this.collection = db.collection('sessions');
      
      // Créer un index TTL pour supprimer automatiquement les sessions expirées
      await this.collection.createIndex(
        { expires: 1 },
        { expireAfterSeconds: 0 }
      );
      
      this.initialized = true;
      console.log('✅ Store de session MongoDB initialisé');
    } catch (error) {
      // Si la DB n'est pas encore connectée, on initialisera plus tard
      if (error.message && error.message.includes('non connectée')) {
        // Retourner sans erreur, l'initialisation se fera lors de la première utilisation
        console.warn('⚠️ MongoDB pas encore connecté, initialisation du store reportée');
        return;
      }
      console.error('❌ Erreur lors de l\'initialisation du store de session:', error);
      throw error;
    }
  }

  /**
   * Récupère une session par son ID
   */
  async get(sid, callback) {
    try {
      if (!this.collection) {
        await this.initialize();
        // Si l'initialisation n'a pas réussi (DB pas encore connectée), retourner null
        if (!this.collection) {
          return callback(null, null);
        }
      }
      
      const session = await this.collection.findOne({ _id: sid });
      
      if (!session) {
        return callback(null, null);
      }
      
      // Vérifier si la session est expirée
      if (session.expires && new Date() > session.expires) {
        await this.destroy(sid);
        return callback(null, null);
      }
      
      callback(null, session.session);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Sauvegarde une session
   */
  async set(sid, sessionData, callback) {
    try {
      if (!this.collection) {
        await this.initialize();
        // Si l'initialisation n'a pas réussi (DB pas encore connectée), ignorer silencieusement
        if (!this.collection) {
          return callback(null);
        }
      }
      
      const expires = sessionData.cookie?.expires 
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 heures par défaut
      
      await this.collection.updateOne(
        { _id: sid },
        {
          $set: {
            session: sessionData,
            expires: expires,
            lastModified: new Date()
          }
        },
        { upsert: true }
      );
      
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Détruit une session
   */
  async destroy(sid, callback) {
    try {
      if (!this.collection) {
        await this.initialize();
      }
      
      await this.collection.deleteOne({ _id: sid });
      
      if (callback) {
        callback(null);
      }
    } catch (error) {
      if (callback) {
        callback(error);
      }
    }
  }

  /**
   * Supprime toutes les sessions
   */
  async clear(callback) {
    try {
      if (!this.collection) {
        await this.initialize();
      }
      
      await this.collection.deleteMany({});
      
      if (callback) {
        callback(null);
      }
    } catch (error) {
      if (callback) {
        callback(error);
      }
    }
  }

  /**
   * Récupère toutes les sessions
   */
  async all(callback) {
    try {
      if (!this.collection) {
        await this.initialize();
      }
      
      const sessions = await this.collection.find({}).toArray();
      const result = {};
      
      sessions.forEach(doc => {
        result[doc._id] = doc.session;
      });
      
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Compte le nombre de sessions
   */
  async length(callback) {
    try {
      if (!this.collection) {
        await this.initialize();
      }
      
      const count = await this.collection.countDocuments({});
      callback(null, count);
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = MongoSessionStore;

