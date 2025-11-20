# Plan de Refactorisation - GoChineur

## 🎯 Objectifs
- Améliorer la maintenabilité du code
- Réduire la duplication
- Centraliser la configuration
- Nettoyer les fichiers obsolètes
- Améliorer la gestion des erreurs

## 📋 Tâches

### 1. Système de Logging Structuré
**Problème** : Logs de debug excessifs avec `console.log` partout
**Solution** : Créer un module de logging avec niveaux (debug, info, warn, error)

### 2. Utilitaires de Dates Centralisés
**Problème** : Logique de dates dupliquée entre backend et frontend
**Solution** : Créer `server/utils/dateUtils.js` et `client/src/utils/dateUtils.ts`

### 3. Service API Centralisé (Frontend)
**Problème** : Appels fetch dispersés dans les composants
**Solution** : Créer `client/src/services/api.ts` pour centraliser les appels API

### 4. Constantes de Configuration
**Problème** : Valeurs magiques (rayons, limites, statuts) dispersées
**Solution** : Créer `server/config/constants.js` et `client/src/config/constants.ts`

### 5. Gestion d'Erreurs Améliorée
**Problème** : Gestion d'erreurs générique et peu informative
**Solution** : Créer des classes d'erreur personnalisées

### 6. Nettoyage des Fichiers Obsolètes
**Problème** : Fichiers inutiles (database.json, docs dupliqués)
**Solution** : Supprimer ou archiver les fichiers obsolètes

## 🚀 Priorités
1. **Haute** : Constantes de configuration (impact immédiat)
2. **Haute** : Service API centralisé (réduit la duplication)
3. **Moyenne** : Utilitaires de dates (améliore la cohérence)
4. **Moyenne** : Système de logging (améliore le debug)
5. **Basse** : Gestion d'erreurs (amélioration progressive)
6. **Basse** : Nettoyage fichiers (maintenance)



