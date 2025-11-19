# Guide de Diagnostic - GoChineur

## 🔍 Problème : Aucun événement affiché

### Étape 1 : Redémarrer le serveur Node.js

**Important :** Le serveur doit être redémarré après chaque modification du code.

1. **Arrêter le serveur actuel :**
   - Dans le terminal où le serveur tourne, appuyer sur `Ctrl+C`
   - Attendre que le serveur s'arrête complètement

2. **Relancer le serveur :**
   ```powershell
   cd C:\Users\charl\Gochineur\server
   npm start
   ```

3. **Vérifier que le serveur démarre correctement :**
   - Vous devriez voir : `🚀 Serveur GoChineur démarré sur le port 5000`
   - Vous devriez voir : `✅ Connecté à MongoDB Atlas`

### Étape 2 : Tester la connexion MongoDB

**Dans votre navigateur**, ouvrez :
```
http://localhost:5000/api/test-mongodb
```

**Résultats possibles :**
- ✅ Si vous voyez `{"success":true,"totalEvents":X,...}` : MongoDB fonctionne, X événements trouvés
- ❌ Si vous voyez `{"error":"Route non trouvée"}` : Le serveur n'a pas été redémarré
- ❌ Si vous voyez une erreur de connexion : Problème avec MongoDB

### Étape 3 : Vérifier les logs du serveur

**Les logs du serveur s'affichent dans le terminal où vous avez lancé `npm start`.**

**Messages à chercher :**
- `📊 Total événements en base: X` - Nombre total d'événements dans MongoDB
- `📊 Vérification MongoDB: X événements trouvés dans la collection` - Vérification lors d'une requête
- `📊 Événements récupérés (sans filtre): X` - Nombre d'événements récupérés

**Si vous ne voyez pas ces messages :**
- Le serveur n'a peut-être pas été redémarré
- Ou les requêtes ne sont pas encore arrivées

### Étape 4 : Publier tous les événements (si MongoDB contient des événements)

**Si MongoDB contient des événements mais qu'ils ne sont pas visibles**, vous pouvez les publier avec cette commande PowerShell :

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/admin/temp-publish-all" -Method POST -ContentType "application/json"
```

**Ou avec plus de détails :**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/admin/temp-publish-all" -Method POST -ContentType "application/json"
$response | ConvertTo-Json
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "X événements publiés avec succès",
  "totalEvents": X,
  "published": X
}
```

### Étape 5 : Importer des données (si MongoDB est vide)

**Si MongoDB est vide (0 événements)**, vous devez importer des données :

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/admin/import-data" -Method POST -ContentType "application/json" -Headers @{"Cookie"="votre-cookie-de-session"}
```

**Note :** Cette route nécessite une authentification admin. Si vous n'êtes pas connecté, vous devrez d'abord vous authentifier via Google OAuth.

## 📋 Checklist de Diagnostic

- [ ] Serveur Node.js redémarré après les modifications
- [ ] Route `/api/test-mongodb` accessible dans le navigateur
- [ ] MongoDB contient des événements (vérifier avec `/api/test-mongodb`)
- [ ] Les logs du serveur affichent les messages de diagnostic
- [ ] Les événements sont publiés (statut `published`)

## 🔧 Commandes PowerShell Utiles

### Tester une route GET
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/test-mongodb" | ConvertTo-Json
```

### Tester une route POST
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/admin/temp-publish-all" -Method POST -ContentType "application/json"
```

### Voir la réponse complète
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/test-mongodb"
$response | ConvertTo-Json -Depth 10
```

## 🐛 Résolution de Problèmes

### Problème : "Route non trouvée"
**Solution :** Redémarrer le serveur Node.js

### Problème : "0 événements trouvés"
**Solution :** Importer des données avec `POST /admin/import-data`

### Problème : "Erreur de connexion à MongoDB"
**Solution :** Vérifier que `MONGODB_URI` est correctement défini dans `.env`

### Problème : Les logs ne s'affichent pas
**Solution :** Vérifier que vous regardez le bon terminal (celui où `npm start` a été lancé)


