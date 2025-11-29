require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI manquante. Variables disponibles:', Object.keys(process.env).join(', '));
  throw new Error('❌ MONGODB_URI n\'est pas définie dans les variables d\'environnement');
}

let client = null;
let db = null;
let eventsCollection = null;
let usersCollection = null;
let userItemsCollection = null;
let priceHistoryCollection = null;
let userEstimationsTempCollection = null;

/**
 * Établit la connexion à MongoDB Atlas
 * @returns {Promise<void>}
 */
async function connectDB() {
  try {
    if (client && db) {
      console.log('✅ Connexion MongoDB déjà établie');
      return;
    }

    console.log('🔄 Connexion à MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    console.log('✅ Connecté à MongoDB Atlas');

    // Extraire le nom de la base de données depuis l'URI ou utiliser 'gochineur' par défaut
    const dbName = MONGODB_URI.split('/').pop().split('?')[0] || 'gochineur';
    db = client.db(dbName);

    // Obtenir les collections
    eventsCollection = db.collection('events');
    usersCollection = db.collection('users');
    userItemsCollection = db.collection('user_items');
    priceHistoryCollection = db.collection('price_history');
    userEstimationsTempCollection = db.collection('user_estimations_temp');

    // Créer des index pour améliorer les performances
    await eventsCollection.createIndex({ date_debut: 1 });
    await eventsCollection.createIndex({ statut_validation: 1 });
    await eventsCollection.createIndex({ latitude: 1, longitude: 1 });
    await eventsCollection.createIndex({ eventHash: 1 }); // Pour la détection de doublons
    await usersCollection.createIndex({ googleId: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await userItemsCollection.createIndex({ user_id: 1 });
    await priceHistoryCollection.createIndex({ search_query: 1 }, { unique: true });
    await db.collection('user_estimations_temp').createIndex({ user_id: 1 });
    await db.collection('price_history').createIndex({ search_query: 1 });
    await db.collection('price_history').createIndex({ timestamp: -1 });

    // TTL index: auto-delete temp estimations after 24 hours
    await db.collection('user_estimations_temp').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400 }
    );
    console.log('✅ TTL index created: temp estimations expire after 24h');

    console.log('✅ Collections et index créés');
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à MongoDB:', error);
    throw error;
  }
}

/**
 * Ferme la connexion à MongoDB
 * @returns {Promise<void>}
 */
async function closeDB() {
  try {
    if (client) {
      await client.close();
      client = null;
      db = null;
      eventsCollection = null;
      usersCollection = null;
      userItemsCollection = null;
      priceHistoryCollection = null;
      userEstimationsTempCollection = null;
      console.log('✅ Connexion MongoDB fermée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de MongoDB:', error);
    throw error;
  }
}

/**
 * Vérifie que la connexion est active
 * @returns {boolean}
 */
function isConnected() {
  return client !== null && db !== null;
}

/**
 * Nettoie la base de données (vide tous les événements)
 * @returns {Promise<{success: boolean, deleted: number}>}
 */
async function cleanDatabase() {
  try {
    if (!eventsCollection) {
      throw new Error('❌ Collection events non disponible');
    }

    const initialCount = await eventsCollection.countDocuments({});
    await eventsCollection.deleteMany({});

    console.log(`🗑️ Base de données nettoyée: ${initialCount} événement(s) supprimé(s)`);
    return { success: true, deleted: initialCount };
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la base de données:', error);
    throw error;
  }
}

module.exports = {
  connectDB,
  closeDB,
  isConnected,
  cleanDatabase,
  getDB: () => {
    if (!db) {
      throw new Error('❌ Base de données non connectée. Appelez connectDB() d\'abord.');
    }
    return db;
  },
  getEventsCollection: () => {
    if (!eventsCollection) {
      throw new Error('❌ Collection events non disponible. Appelez connectDB() d\'abord.');
    }
    return eventsCollection;
  },
  getUsersCollection: () => {
    if (!usersCollection) {
      throw new Error('❌ Collection users non disponible. Appelez connectDB() d\'abord.');
    }
    return usersCollection;
  },
  getUserItemsCollection: () => {
    if (!userItemsCollection) {
      throw new Error('❌ Collection user_items non disponible. Appelez connectDB() d\'abord.');
    }
    return userItemsCollection;
  },
  getPriceHistoryCollection: () => {
    if (!priceHistoryCollection) {
      throw new Error('❌ Collection price_history non disponible. Appelez connectDB() d\'abord.');
    }
    return priceHistoryCollection;
  },
  getUserEstimationsTempCollection: () => {
    if (!userEstimationsTempCollection) {
      throw new Error('❌ Collection user_estimations_temp non disponible. Appelez connectDB() d\'abord.');
    }
    return userEstimationsTempCollection;
  }
};

