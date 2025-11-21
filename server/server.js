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

// Configuration CORS avec credentials pour les sessions
// CRITIQUE: Doit être avant express.json() et les autres middlewares
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  'http://localhost:5173', // Développement local (Vite dev server)
  'http://localhost:5000', // Production locale (même serveur)
  'https://gochineur.fr', // Production
  'https://www.gochineur.fr', // Production avec www
  'https://gochineur-backend.onrender.com' // URL temporaire Render
];

app.use(cors({
  origin: function (origin, callback) {
    // En production, si le frontend est servi depuis le même serveur,
    // les requêtes same-origin n'ont pas d'en-tête Origin
    // Autoriser les requêtes sans origine (same-origin ou Postman, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // Vérifier si l'origine est autorisée
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En production locale, autoriser localhost:5000 (même serveur)
      if (isProduction && (origin === 'http://localhost:5000' || origin === 'http://127.0.0.1:5000')) {
        callback(null, true);
      } else {
        // Logger l'origine non autorisée pour le débogage (seulement en développement)
        if (!isProduction) {
          console.warn(`⚠️ Origine CORS non autorisée: ${origin}`);
        }
        callback(new Error('Non autorisé par CORS'));
      }
    }
  },
  credentials: true, // Autorise l'envoi de cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

// Parser JSON (doit être après CORS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de Passport avec Google OAuth
configurePassport(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, MASTER_ADMIN_EMAIL);

// Routes d'authentification
const authRouter = authRoutes(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
app.use('/auth', authRouter);

// Initialisation de Passport
app.use(passport.initialize());

// Routes API utilisateur
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes());

// Routes API publiques
app.use('/api/events', eventsRoutes());

// Routes d'administration
app.use('/api/admin', adminRoutes());

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur GoChineur opérationnel' });
});

// Route de test MongoDB (temporaire pour diagnostic) - DOIT être avant le middleware 404
app.get('/api/test-mongodb', async (req, res) => {
  try {
    const { getEventsCollection } = require('./config/db');
    const eventsCollection = getEventsCollection();

    const totalCount = await eventsCollection.countDocuments({});
    const sampleEvents = await eventsCollection.find({}).limit(3).toArray();

    res.json({
      success: true,
      totalEvents: totalCount,
      sampleEvents: sampleEvents.map(e => ({
        id: e.id,
        name: e.name,
        date_debut: e.date_debut,
        latitude: e.latitude,
        longitude: e.longitude
      })),
      message: totalCount > 0
        ? `${totalCount} événements trouvés dans MongoDB`
        : 'Aucun événement dans MongoDB. Exécutez POST /admin/import-data pour importer des données.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Middleware de gestion d'erreurs global (doit être après toutes les routes)
// Garantit que toutes les erreurs renvoient du JSON et non du HTML
app.use((err, req, res, next) => {
  // Gérer les erreurs CORS différemment
  if (err.message && err.message.includes('CORS')) {
    console.warn(`⚠️ Erreur CORS: ${err.message} - Origine: ${req.get('origin') || 'none'}`);
    return res.status(403).json({
      error: 'Accès refusé par la politique CORS',
      message: err.message
    });
  }

  console.error('❌ Erreur non gérée:', err);
  console.error('Stack:', err.stack);

  // Toujours renvoyer du JSON, jamais de HTML
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Servir les fichiers statiques du frontend en production
// IMPORTANT: Doit être après toutes les routes API mais avant le 404
const fs = require('fs');

if (process.env.NODE_ENV === 'production') {
  // Servir les fichiers statiques depuis le dossier dist du client
  const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');

  // Vérifier que le dossier dist existe
  if (!fs.existsSync(clientDistPath)) {
    console.error('❌ ERREUR: Le dossier client/dist n\'existe pas!');
    console.error('❌ Exécutez "npm run build" dans le dossier client/ avant de démarrer en production.');
    process.exit(1);
  }

  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(clientDistPath, {
    maxAge: '1y', // Cache des fichiers statiques pendant 1 an
    etag: true
  }));

  // Pour toutes les routes non-API, servir index.html (SPA routing)
  // Utiliser app.use avec une fonction pour éviter les conflits de routage
  app.use((req, res, next) => {
    // Ne pas intercepter les routes API backend
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next(); // Passer au middleware suivant (404)
    }



    // Si c'est une requête GET et que la réponse n'a pas encore été envoyée
    if (req.method === 'GET' && !res.headersSent) {
      const indexPath = path.resolve(clientDistPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Erreur lors de l\'envoi de index.html:', err);
          res.status(500).json({ error: 'Erreur serveur' });
        }
      });
    } else {
      next();
    }
  });

  console.log('✅ Mode production: fichiers statiques servis depuis client/dist');
} else {
  // En développement, retourner JSON pour les routes non trouvées
  app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
  });
}

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
