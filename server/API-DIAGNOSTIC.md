# Diagnostic de l'API DATAtourisme

## Problème identifié

L'API DATAtourisme ne répond pas avec l'erreur DNS suivante :
```
getaddrinfo ENOTFOUND api.datatourisme.gouv.fr
```

## Causes possibles

1. **URL incorrecte** : L'URL `https://api.datatourisme.gouv.fr/api/v2` pourrait être incorrecte ou obsolète
2. **Domaine changé** : Le domaine de l'API pourrait avoir changé
3. **Problème réseau** : Problème de connexion ou de résolution DNS
4. **API dépréciée** : L'API v2 pourrait ne plus être disponible

## Solution actuelle

**Utilisation des fichiers locaux** : Les fichiers JSON sont déjà disponibles dans `server/datatourisme_data/` avec **21 239 fichiers**. L'importation depuis ces fichiers locaux fonctionne correctement.

## Test de l'API

Pour tester l'API, exécutez :
```bash
cd C:\Users\charl\Gochineur\server
node test-import.js
```

## Recommandations

1. **Utiliser les fichiers locaux** : C'est la solution la plus fiable actuellement
2. **Vérifier la documentation DATAtourisme** : Consulter https://info.datatourisme.fr pour la bonne URL de l'API
3. **Contacter le support DATAtourisme** : Si vous avez besoin d'accéder à l'API en temps réel

## Importation depuis les fichiers locaux

L'importation fonctionne avec :
- ✅ 21 239 fichiers disponibles
- ✅ Structure des données correcte
- ✅ Mapping Apidae fonctionnel
- ✅ Filtrage des événements de "chine"

Pour lancer l'importation :
```bash
curl -X POST http://localhost:5000/admin/import-data
```





