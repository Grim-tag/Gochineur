# 🛍️ GoChineur

Application web pour découvrir et partager des événements de vide-greniers, brocantes et bourses dans la région des Landes et du Pays Basque.

## 📋 Description

GoChineur est une plateforme qui permet aux utilisateurs de :
- 🔍 Rechercher des événements (vide-greniers, brocantes, bourses) à proximité
- 📍 Filtrer par localisation, rayon de recherche, période et type d'événement
- ➕ Soumettre de nouveaux événements (après authentification)
- 👥 Gérer une liste personnelle d'événements favoris
- 🔐 Administration pour valider et gérer les événements soumis

## 🏗️ Architecture

### Frontend (Client)
- **Framework**: React + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Port**: 5173 (développement) ou servi par le backend (production)

### Backend (Server)
- **Framework**: Node.js + Express
- **Base de données**: MongoDB Atlas
- **Authentification**: Passport.js avec Google OAuth 2.0
- **Sessions**: MongoDB Session Store (production)
- **Port**: 5000

## 🚀 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn
- Compte MongoDB Atlas
- Compte Google Cloud (pour OAuth)

### Configuration

1. **Cloner le dépôt**
```bash
git clone https://github.com/votre-nom/gochineur.git
cd gochineur
```

2. **Configurer le Backend**
```bash
cd server
npm install
```

Créer un fichier `.env` dans le dossier `server/` :
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gochineur
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=votre_secret_session_tres_securise
MASTER_ADMIN_EMAIL=votre_email@example.com
PORT=5000
```

3. **Configurer le Frontend**
```bash
cd client
npm install
```

## 🛠️ Développement

### Démarrer en mode développement

**Backend :**
```powershell
cd server
.\start-dev.ps1
```

**Frontend :**
```powershell
cd client
npm run dev
```

L'application sera accessible sur :
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Démarrer en mode production (local)

**Backend (sert aussi le frontend) :**
```powershell
cd server
.\start-production.ps1
```

L'application complète sera accessible sur http://localhost:5000

## 📦 Build du Frontend

```bash
cd client
npm run build
```

Les fichiers compilés seront générés dans `client/dist/` et servis automatiquement par le backend en mode production.

## 🌐 Déploiement

### Variables d'environnement requises

**Backend (.env) :**
- `MONGODB_URI` - URI de connexion MongoDB Atlas
- `GOOGLE_CLIENT_ID` - Client ID Google OAuth
- `GOOGLE_CLIENT_SECRET` - Client Secret Google OAuth
- `GOOGLE_CALLBACK_URL` - URL de callback (ex: https://gochineur.fr/auth/google/callback)
- `SESSION_SECRET` - Secret pour les sessions (générer une clé aléatoire)
- `MASTER_ADMIN_EMAIL` - Email de l'administrateur principal
- `PORT` - Port du serveur (généralement défini par la plateforme)
- `NODE_ENV=production` - Mode production
- `HTTPS=true` - Si vous utilisez HTTPS (pour les cookies secure)

### Plateformes recommandées
- **Render** (https://render.com)
- **Railway** (https://railway.app)
- **Heroku** (https://heroku.com)

### Étapes de déploiement

1. Créer un nouveau service sur votre plateforme d'hébergement
2. Connecter le dépôt Git
3. Configurer les variables d'environnement
4. Définir la commande de démarrage : `cd server && npm start`
5. Définir le répertoire racine : `server/`
6. Le build du frontend sera exécuté automatiquement si configuré dans les scripts de build

## 📁 Structure du Projet

```
Gochineur/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── pages/         # Pages de l'application
│   │   ├── services/      # Services API
│   │   ├── utils/         # Utilitaires
│   │   └── config/        # Configuration
│   ├── dist/              # Build de production (généré)
│   └── package.json
├── server/                # Backend Express
│   ├── config/            # Configuration (DB, Passport, Session)
│   ├── routes/            # Routes API
│   ├── services/          # Services métier
│   ├── utils/             # Utilitaires
│   ├── middleware/        # Middlewares Express
│   └── server.js          # Point d'entrée
└── README.md
```

## 🔐 Sécurité

- ✅ Variables d'environnement pour les secrets
- ✅ Cookies HTTP-only pour les sessions
- ✅ CORS configuré pour les origines autorisées
- ✅ Sessions stockées dans MongoDB (production)
- ✅ Validation des entrées utilisateur
- ✅ Authentification OAuth 2.0

## 📝 API Endpoints

### Publiques
- `GET /api/events` - Liste des événements (publiés uniquement)
- `GET /api/health` - Vérification de santé

### Authentifiées
- `POST /api/events/submit` - Soumettre un événement
- `GET /api/user/current` - Utilisateur actuel
- `POST /api/user/set-pseudo` - Définir le pseudo

### Administration
- `GET /admin/api/events` - Tous les événements (tous statuts)
- `PUT /admin/api/events/:id/validate` - Valider un événement
- `PUT /admin/api/events/:id` - Modifier un événement
- `DELETE /admin/api/events/:id` - Supprimer un événement
- `GET /admin/api/users` - Liste des utilisateurs
- `POST /admin/import-data` - Importer des données depuis DATAtourisme

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 👤 Auteur

GoChineur - Application de découverte d'événements de vide-greniers

---

**Note**: Assurez-vous de ne jamais commiter les fichiers `.env` contenant vos secrets !


