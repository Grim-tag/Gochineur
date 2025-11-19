# Scripts d'administration

## Script de nettoyage et ré-importation

Le script `clean-and-import.js` permet de :
1. Vider complètement la base de données MongoDB (collection `events`)
2. Ré-importer tous les événements depuis DATAtourisme et Open Event Database (OED) avec le filtre strict activé

### Utilisation

**Option 1 : Via npm (recommandé)**
```bash
cd server
npm run clean-and-import
```

**Option 2 : Directement avec Node.js**
```bash
cd server
node scripts/clean-and-import.js
```

### Filtre strict

Le script applique un filtre **extrêmement strict** qui ne garde que les événements contenant au moins **UN** des mots-clés suivants dans le **Titre** ou la **Description** :

- `vide-grenier`, `vide grenier`, `videgrenier`
- `brocante`
- `troc`
- `puces`, `antiquités`, `antiquites`, `antiquaire`, `marché aux puces`, `marche aux puces`
- `bourse`
- `vide-maison`, `vide maison`, `videmaison`
- `braderie`

Tous les autres événements sont automatiquement rejetés, même s'ils sont catégorisés comme "Événement commercial" ou "Événement social".

### Résultat

Le script affiche un résumé détaillé :
- Nombre d'événements importés (DATAtourisme et OED séparément)
- Nombre de doublons ignorés
- Nombre d'événements invalides
- Nombre d'événements filtrés (sans mots-clés pertinents)
- Nombre d'erreurs
- Total d'événements en base après importation

### Notes importantes

- ⚠️ **Le serveur backend n'a pas besoin d'être démarré** pour exécuter ce script
- ⚠️ **Ce script vide complètement la base de données** avant de ré-importer
- ✅ Le script utilise directement les fonctions du serveur, évitant ainsi les problèmes d'authentification

