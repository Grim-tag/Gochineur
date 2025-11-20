# Instructions de Nettoyage et Ré-Importation

## Étape 1 : Vérification du Filtre Strict

✅ **Le filtre strict est déjà en place** dans `server/utils/dataTransform.js` :

- **Liste exhaustive des mots-clés pertinents** :
  - `vide-grenier`, `vide grenier`, `videgrenier`
  - `brocante`
  - `troc`
  - `puces`, `antiquités`, `antiquites`, `antiquaire`, `marché aux puces`, `marche aux puces`
  - `bourse`
  - `vide-maison`, `vide maison`, `videmaison`
  - `braderie`

- **Logique de rejet** : TOUS les événements sans au moins un mot-clé pertinent sont rejetés immédiatement

## Étape 2 : Nettoyage de la Base de Données

### Option A : Via curl (PowerShell)

```powershell
# Assurez-vous que le serveur tourne sur http://localhost:5000
# Vous devez être authentifié en tant qu'admin

curl -X POST http://localhost:5000/admin/clean-database `
  -H "Content-Type: application/json" `
  -b cookies.txt `
  -c cookies.txt
```

### Option B : Via Postman ou un client HTTP

1. **Méthode** : `POST`
2. **URL** : `http://localhost:5000/admin/clean-database`
3. **Headers** : 
   - `Content-Type: application/json`
4. **Cookies** : Inclure les cookies de session (si authentifié)

### Option C : Via le code (si vous avez accès au serveur)

La route `/admin/clean-database` vide complètement le tableau `events` dans `database.json`.

## Étape 3 : Ré-Importation avec Filtre Strict

### Option A : Via curl (PowerShell)

```powershell
# Assurez-vous que le serveur tourne sur http://localhost:5000
# Vous devez être authentifié en tant qu'admin

curl -X POST http://localhost:5000/admin/import-data `
  -H "Content-Type: application/json" `
  -b cookies.txt `
  -c cookies.txt
```

### Option B : Via Postman ou un client HTTP

1. **Méthode** : `POST`
2. **URL** : `http://localhost:5000/admin/import-data`
3. **Headers** : 
   - `Content-Type: application/json`
4. **Cookies** : Inclure les cookies de session (si authentifié)

### Résultat Attendu

L'importation va :
1. Lire les fichiers DATAtourisme dans `server/datatourisme_data/`
2. Appeler l'API Open Event Database (OED)
3. Appliquer le **filtre strict** : rejeter tous les événements sans mot-clé pertinent
4. Importer uniquement les événements de "chine" pertinents

**Logs attendus** :
```
📂 === FLUX 1 : Importation DATAtourisme ===
✅ Événements DATAtourisme importés: X
❌ Événements DATAtourisme rejetés (non pertinents): Y

🌐 === FLUX 2 : Importation Open Event Database ===
✅ Événements OED importés: Z
❌ Événements OED rejetés (non pertinents): W

📊 === RÉSUMÉ FINAL ===
Total importé: X + Z
Total rejeté: Y + W
```

## Étape 4 : Vérification

### Vérifier la Base de Données

Ouvrir `server/database.json` et vérifier que :
- ✅ Seuls les événements avec mots-clés pertinents sont présents
- ✅ Aucun événement générique (concert, exposition, etc.)
- ✅ Types uniformisés : Vide-Grenier, Brocante, Puces et Antiquités, Bourse, Vide Maison, Troc

### Vérifier le Frontend

1. Ouvrir `http://localhost:5173`
2. Vérifier la liste déroulante des types :
   - ✅ Option "Tous les types" présente
   - ✅ Options : Vide-Grenier, Brocante, Puces et Antiquités, Bourse, Vide Maison, Troc
   - ✅ Option "Autre" absente
3. Tester le filtrage :
   - Sélectionner "Tous les types" → doit afficher tous les événements pertinents
   - Sélectionner "Brocante" → doit afficher uniquement les brocantes
   - Sélectionner "Troc" → doit afficher uniquement les trocs

## Notes Importantes

⚠️ **Authentification requise** : Les routes `/admin/clean-database` et `/admin/import-data` nécessitent une authentification admin.

⚠️ **Temps d'exécution** : L'importation peut prendre plusieurs minutes selon le nombre de fichiers DATAtourisme et la réponse de l'API OED.

⚠️ **Filtre strict** : Le filtre est maintenant ultra-strict. Seuls les événements contenant au moins un mot-clé pertinent dans le titre ou la description seront importés.




