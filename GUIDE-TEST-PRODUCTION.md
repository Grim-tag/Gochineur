# Guide de Test - Mode Production

Ce guide vous explique comment tester GoChineur en mode production localement avant le déploiement.

## Prérequis

1. ✅ Le build du frontend doit être présent dans `client/dist/`
2. ✅ MongoDB Atlas doit être configuré et accessible
3. ✅ Les variables d'environnement doivent être configurées dans `server/.env`

## Étapes de Test

### 1. Arrêter tous les processus Node.js en cours

**Dans PowerShell :**
```powershell
# Trouver tous les processus Node.js
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Vérifier qu'ils sont arrêtés
Get-Process node -ErrorAction SilentlyContinue
```

**Alternative (si vous utilisez plusieurs terminaux) :**
- Fermez tous les terminaux où Node.js est en cours d'exécution
- Utilisez `Ctrl+C` dans chaque terminal pour arrêter proprement

### 2. Vérifier que le build du frontend existe

```powershell
cd C:\Users\charl\Gochineur\client
Test-Path dist\index.html
```

**Si le résultat est `False`, compilez le frontend :**
```powershell
cd C:\Users\charl\Gochineur\client
npm run build
```

### 3. Lancer le serveur en mode production

```powershell
cd C:\Users\charl\Gochineur\server
.\start-production.ps1
```

**Vous devriez voir :**
```
MODE DE PRODUCTION DEMARRE
NODE_ENV = production
🔄 Connexion à MongoDB Atlas...
✅ Connecté à MongoDB Atlas
✅ Collections et index créés
✅ Mode production: fichiers statiques servis depuis client/dist
🚀 Serveur GoChineur démarré sur le port 5000
```

### 4. Tester le site

Ouvrez votre navigateur et accédez à :
- **http://localhost:5000** - Page d'accueil du site
- **http://localhost:5000/api/health** - Vérification de santé de l'API
- **http://localhost:5000/api/events** - Liste des événements (JSON)

## Vérifications

### ✅ Le site React s'affiche
- La page d'accueil doit se charger avec le design complet
- Les événements doivent s'afficher
- La navigation doit fonctionner

### ✅ Les routes API fonctionnent
- `/api/events` retourne les événements en JSON
- `/api/health` retourne `{"status":"OK"}`

### ✅ Le routage SPA fonctionne
- Accéder à `http://localhost:5000/admin` doit servir l'application React
- Les routes React (comme `/submit-event`) doivent fonctionner

## Dépannage

### Erreur : "Le dossier client/dist n'existe pas"
**Solution :** Exécutez `npm run build` dans le dossier `client/`

### Erreur : "Port 5000 déjà utilisé"
**Solution :** Arrêtez tous les processus Node.js (voir étape 1)

### Erreur : "Connexion MongoDB échouée"
**Solution :** Vérifiez votre fichier `server/.env` et la variable `MONGODB_URI`

### Le site ne se charge pas
**Solution :** 
1. Vérifiez que le serveur est bien démarré
2. Vérifiez la console du navigateur pour les erreurs
3. Vérifiez que `NODE_ENV=production` est bien défini

## Commandes Rapides

```powershell
# Arrêter tous les processus Node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Compiler le frontend
cd C:\Users\charl\Gochineur\client; npm run build

# Démarrer en production
cd C:\Users\charl\Gochineur\server; .\start-production.ps1

# Démarrer en développement
cd C:\Users\charl\Gochineur\server; .\start-dev.ps1
```

## Prêt pour le Déploiement

Une fois que tout fonctionne en local :
1. ✅ Le build est créé (`client/dist/`)
2. ✅ Le serveur démarre sans erreur
3. ✅ Le site s'affiche sur `http://localhost:5000`
4. ✅ Les API fonctionnent

Vous pouvez maintenant déployer sur Render, Railway, ou votre plateforme d'hébergement préférée !

