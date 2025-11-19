# Guide de Déploiement - GoChineur

Ce guide vous explique comment déployer GoChineur sur une plateforme d'hébergement Cloud (Render, Railway, etc.).

## 📋 Prérequis

- ✅ Compte MongoDB Atlas configuré
- ✅ Compte Google Cloud avec OAuth 2.0 configuré
- ✅ Dépôt Git (GitHub, GitLab, etc.)
- ✅ Compte sur une plateforme d'hébergement (Render, Railway, etc.)

## 🔧 Configuration des Variables d'Environnement

### Variables Requises

Créez un fichier `.env` sur votre plateforme d'hébergement avec les variables suivantes :

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gochineur

# Google OAuth
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_CALLBACK_URL=https://votre-domaine.com/auth/google/callback

# Session
SESSION_SECRET=generer_une_cle_secrete_aleatoire_tres_longue_et_securisee
MASTER_ADMIN_EMAIL=votre_email_admin@example.com

# Serveur
PORT=5000
NODE_ENV=production
HTTPS=true

# Optionnel (si vous utilisez un domaine personnalisé)
PROTOCOL=https
URL=https://gochineur.fr
```

### Génération d'un SESSION_SECRET sécurisé

```bash
# Sur Linux/Mac
openssl rand -base64 32

# Sur Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## 🚀 Déploiement sur Render

### 1. Créer un nouveau Web Service

1. Connectez-vous à [Render](https://render.com)
2. Cliquez sur "New" → "Web Service"
3. Connectez votre dépôt Git

### 2. Configuration du Service

**Settings :**
- **Name**: `gochineur` (ou votre nom)
- **Environment**: `Node`
- **Build Command**: 
  ```bash
  cd client && npm install && npm run build && cd ../server && npm install
  ```
- **Start Command**: 
  ```bash
  cd server && npm start
  ```
- **Root Directory**: `server` (ou laisser vide si la racine contient server/)

**Environment Variables :**
Ajoutez toutes les variables listées ci-dessus dans la section "Environment Variables".

### 3. Déploiement

Render déploiera automatiquement à chaque push sur la branche `main`.

## 🚂 Déploiement sur Railway

### 1. Créer un nouveau Projet

1. Connectez-vous à [Railway](https://railway.app)
2. Cliquez sur "New Project" → "Deploy from GitHub repo"
3. Sélectionnez votre dépôt

### 2. Configuration

**Settings :**
- **Root Directory**: `server`
- **Build Command**: 
  ```bash
  cd ../client && npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

**Variables d'environnement :**
Ajoutez toutes les variables dans la section "Variables".

### 3. Déploiement

Railway déploiera automatiquement à chaque push.

## 🔗 Configuration du Domaine

### 1. Ajouter un Domaine Personnalisé

Sur votre plateforme d'hébergement :
1. Allez dans les paramètres du service
2. Ajoutez votre domaine (ex: `gochineur.fr`)
3. Configurez les DNS selon les instructions

### 2. Mettre à jour Google OAuth

1. Allez dans [Google Cloud Console](https://console.cloud.google.com)
2. Ouvrez votre projet OAuth
3. Ajoutez l'URL de callback de production :
   - `https://gochineur.fr/auth/google/callback`
4. Ajoutez l'URL autorisée :
   - `https://gochineur.fr`

### 3. Mettre à jour les Variables d'Environnement

Mettez à jour sur votre plateforme :
- `GOOGLE_CALLBACK_URL=https://gochineur.fr/auth/google/callback`
- `HTTPS=true`
- `URL=https://gochineur.fr`

## ✅ Vérification Post-Déploiement

1. **Vérifier la santé de l'API** :
   ```
   https://votre-domaine.com/api/health
   ```

2. **Tester la connexion MongoDB** :
   ```
   https://votre-domaine.com/api/test-mongodb
   ```

3. **Tester l'authentification** :
   - Accédez à `https://votre-domaine.com`
   - Cliquez sur "Se connecter"
   - Vérifiez que la redirection fonctionne

4. **Importer les données** (première fois) :
   ```bash
   curl -X POST https://votre-domaine.com/admin/import-data
   ```

## 🔍 Dépannage

### Le site ne se charge pas
- Vérifiez que le build du frontend a réussi
- Vérifiez les logs de déploiement
- Vérifiez que `NODE_ENV=production` est défini

### Erreurs de connexion MongoDB
- Vérifiez que `MONGODB_URI` est correct
- Vérifiez que l'IP de la plateforme est autorisée dans MongoDB Atlas

### Erreurs d'authentification
- Vérifiez que `GOOGLE_CALLBACK_URL` correspond à votre domaine
- Vérifiez que le domaine est ajouté dans Google Cloud Console

### Sessions non persistantes
- Vérifiez que `HTTPS=true` est défini si vous utilisez HTTPS
- Vérifiez que `SESSION_SECRET` est défini et sécurisé

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Documentation Railway](https://docs.railway.app)
- [Documentation MongoDB Atlas](https://docs.atlas.mongodb.com)
- [Documentation Google OAuth](https://developers.google.com/identity/protocols/oauth2)

