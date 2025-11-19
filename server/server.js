// Charger les variables d'environnement AVANT tout autre code
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');

// Import des configurations
const { configureSession, initializeSessionStore } = require('./config/session');
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

// Vérification de la configuration
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  Variables d\'environnement Google OAuth non configurées. Créez un fichier .env dans le dossier server.');
}

// Configuration CORS avec credentials pour les sessions
// CRITIQUE: Doit être avant express.json() et les autres middlewares
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  'http://localhost:5173', // Développement local (Vite dev server)
  'http://localhost:5000', // Production locale (même serveur)
  'https://gochineur.fr', // Production
  'https://www.gochineur.fr' // Production avec www
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

// Configuration de la session
app.use(configureSession(SESSION_SECRET));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuration de Passport avec Google OAuth
configurePassport(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, MASTER_ADMIN_EMAIL);

// Routes d'authentification
const authRouter = authRoutes(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
app.use('/auth', authRouter);

// Routes API utilisateur (montées directement sur /api/user)
// On importe les handlers depuis authRouter pour éviter la duplication
const userApiRouter = express.Router();
const { getUsersCollection } = require('./config/db');

// Route POST /api/user/set-pseudo
userApiRouter.post('/set-pseudo', async (req, res) => {
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
    
    const usersCollection = getUsersCollection();
    
    if (!usersCollection) {
      console.error('❌ Collection users non disponible');
      return res.status(500).json({ 
        error: 'Erreur de connexion à la base de données',
        details: 'La collection users n\'est pas disponible'
      });
    }
    
    // Vérifier que req.user.id existe
    if (!req.user || !req.user.id) {
      console.error('❌ req.user ou req.user.id manquant:', req.user);
      return res.status(401).json({ error: 'Utilisateur non authentifié ou ID manquant' });
    }
    
    console.log(`🔍 Mise à jour du pseudo pour l'utilisateur: ${req.user.id}`);
    
    const result = await usersCollection.updateOne(
      { id: req.user.id },
      { $set: { displayName: displayName.trim(), updatedAt: new Date().toISOString() } }
    );
    
    console.log(`📊 Résultat updateOne: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    
    if (result.matchedCount === 0) {
      console.error(`❌ Utilisateur ${req.user.id} non trouvé dans MongoDB`);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Recharger l'utilisateur depuis MongoDB pour avoir les données à jour
    const updatedUser = await usersCollection.findOne({ id: req.user.id });
    
    if (!updatedUser) {
      console.error(`❌ Impossible de recharger l'utilisateur ${req.user.id} après mise à jour`);
      return res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur mis à jour' });
    }
    
    // Mettre à jour req.user avec les données fraîches
    req.user.displayName = updatedUser.displayName;
    req.user.role = updatedUser.role || 'user';
    
    console.log(`✅ Pseudo mis à jour avec succès pour ${updatedUser.email}: ${updatedUser.displayName}`);
    
    // CRITIQUE: Renvoyer un statut 200 OK avec une réponse JSON valide
    return res.status(200).json({
      success: true,
      message: 'Pseudo mis à jour avec succès',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        displayName: updatedUser.displayName,
        photo: updatedUser.photo,
        role: updatedUser.role || 'user'
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du pseudo:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      error: 'Erreur serveur lors de la mise à jour du pseudo',
      details: error.message || 'Erreur inconnue'
    });
  }
});

// Route GET /api/user/current
userApiRouter.get('/current', (req, res) => {
  console.log(`🔍 Vérification authentification - Session ID: ${req.sessionID}`);
  console.log(`🍪 Cookies reçus: ${req.headers.cookie || 'aucun'}`);
  console.log(`👤 req.isAuthenticated(): ${req.isAuthenticated()}`);
  console.log(`👤 req.user: ${req.user ? `${req.user.email} (${req.user.role})` : 'null'}`);
  
  if (req.isAuthenticated() && req.user) {
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

app.use('/api/user', userApiRouter);

// Routes API publiques
app.use('/api/events', eventsRoutes());

// Routes d'administration
app.use('/admin', adminRoutes());

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
const path = require('path');
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
    
    // Ne pas intercepter les routes admin API backend (/admin/api/...)
    // Mais servir les routes admin React (/admin/dashboard, etc.)
    if (req.path.startsWith('/admin/api')) {
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

// Initialiser la connexion MongoDB au démarrage
connectDB().then(async () => {
  // Initialiser le store de session MongoDB si en production
  await initializeSessionStore();
  
  // Démarrage du serveur
  app.listen(PORT, () => {
    console.log(`🚀 Serveur GoChineur démarré sur le port ${PORT}`);
    console.log(`📍 API disponible sur http://localhost:${PORT}/api/events`);
    console.log(`📥 Importation: POST http://localhost:${PORT}/admin/import-data`);
    console.log(`🗑️  Nettoyage: POST http://localhost:${PORT}/admin/clean-database`);
    console.log(`📝 Soumission: POST http://localhost:${PORT}/api/events/submit`);
  });
}).catch(err => {
  console.error('❌ Erreur lors de la connexion à MongoDB:', err);
  process.exit(1);
});

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  const { closeDB } = require('./config/db');
  await closeDB();
  process.exit(0);
});
