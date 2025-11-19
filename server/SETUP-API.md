# Configuration de l'API DATAtourisme

## Étape 1 : Créer le fichier .env

Dans le dossier `server/`, créez un fichier `.env` avec le contenu suivant :

```env
# Configuration API DATAtourisme
DATATOURISME_API_BASE_URL=https://api.datatourisme.gouv.fr/api/v2
DATATOURISME_API_KEY=ee7e1ae1-6586-4dca-8cb2-51a1b031337d
```

⚠️ **IMPORTANT** : Ne partagez jamais ce fichier `.env` publiquement. Il est déjà listé dans `.gitignore` pour éviter qu'il soit poussé vers un dépôt Git.

## Étape 2 : Vérifier l'installation des dépendances

Assurez-vous que les dépendances sont installées :

```bash
cd server
npm install
```

Les packages suivants doivent être installés :
- `dotenv` : Pour charger les variables d'environnement
- `axios` : Pour effectuer les requêtes HTTP vers l'API

## Étape 3 : Lancer l'importation

Une fois le serveur démarré (par défaut sur le port 5000), vous pouvez déclencher l'importation via :

```bash
# Avec curl
curl -X POST http://localhost:5000/admin/import-data

# Ou avec PowerShell (Windows)
Invoke-WebRequest -Uri http://localhost:5000/admin/import-data -Method POST -UseBasicParsing
```

**Note** : Le port peut être modifié via la variable d'environnement `PORT` dans le fichier `.env`.

## Sécurité

- ✅ La clé API est stockée uniquement dans `.env` (jamais dans le code source)
- ✅ Le fichier `.env` est ignoré par Git (voir `.gitignore`)
- ✅ L'API est appelée uniquement depuis le serveur (jamais depuis le client)
- ✅ Le client récupère les données via `GET /api/events` (données déjà stockées)

## Format de réponse

L'importation retourne un JSON avec :
- `success` : true/false
- `message` : Message descriptif
- `imported` : Nombre d'événements importés
- `skipped` : Nombre de doublons ignorés
- `invalid` : Nombre d'événements invalides ignorés
- `totalEvents` : Nombre total d'événements dans la base

