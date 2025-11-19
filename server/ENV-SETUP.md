# Configuration des Variables d'Environnement

Créez un fichier `.env` dans le dossier `server/` avec le contenu suivant :

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="59633281537-pj69589g8q48peisl3g08mlej97l2veo.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_CALLBACK_URL="http://localhost:5000/auth/google/callback"

# Session Secret (changez en production)
SESSION_SECRET="gochineur-secret-key-change-in-production"

# Admin Maître (email qui recevra automatiquement le rôle admin)
MASTER_ADMIN_EMAIL="votre-email@gmail.com"

# DATAtourisme API (optionnel)
# DATATOURISME_API_BASE_URL=""
# DATATOURISME_API_KEY=""
```

## Notes importantes

- Le fichier `.env` est déjà dans `.gitignore` et ne sera pas commité
- En production, changez `SESSION_SECRET` par une clé secrète forte
- Assurez-vous que `GOOGLE_CALLBACK_URL` correspond à l'URL de votre serveur
- `MASTER_ADMIN_EMAIL` : L'utilisateur avec cet email recevra automatiquement le rôle `admin` lors de sa première connexion

