// Charger les variables d'environnement AVANT tout autre code
const path = require('path');
// Charger les variables d'environnement depuis .env (local) ou ../.env (racine repo)
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const passport = require('passport');

// Import des configurations
const { configurePassport } = require('./config/passport');
const { connectDB } = require('./config/db');

// Import des routes
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Variables d'environnement
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback';
const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'gochineur-secret-key-change-in-production';

const JWT_SECRET = process.env.JWT_SECRET;

// Vérification de la configuration
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  Variables d\'environnement Google OAuth non configurées. Créez un fichier .env dans le dossier server.');
}

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET n\'est pas défini. L\'authentification ne fonctionnera pas correctement.');
}

// ... (rest of the file until connectDB)

// Fonction de connexion avec réessai
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connectDB();
      console.log('✅ Connecté à MongoDB');
      return;
    } catch (err) {
      console.error(`❌ Échec de connexion à MongoDB (tentative ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`⏳ Nouvelle tentative dans ${delay / 1000} secondes...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};

// Initialiser la connexion MongoDB au démarrage
connectWithRetry().then(() => {
  // Démarrage du serveur
  app.listen(PORT, () => {
    console.log(`🚀 Serveur GoChineur démarré sur le port ${PORT}`);
    console.log(`📍 API disponible sur http://localhost:${PORT}/api/events`);
    console.log(`📥 Importation: POST http://localhost:${PORT}/admin/import-data`);
    console.log(`🗑️  Nettoyage: POST http://localhost:${PORT}/admin/clean-database`);
    console.log(`📝 Soumission: POST http://localhost:${PORT}/api/events/submit`);
  });
}).catch(err => {
  console.error('❌ Erreur fatale lors de la connexion à MongoDB après plusieurs tentatives:', err);
  process.exit(1);
});

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  const { closeDB } = require('./config/db');
  await closeDB();
  process.exit(0);
});
