# Commandes Git pour Pousser vers un Dépôt Distant

Ce document contient les commandes à exécuter pour connecter votre dépôt local à un dépôt distant (GitHub, GitLab, etc.).

## 📋 État Actuel

✅ Dépôt Git initialisé  
✅ Branche `develop` créée  
✅ Branche `main` créée  
✅ Commit initial effectué  
✅ README.md et guides ajoutés

## 🚀 Étapes pour Pousser vers GitHub/GitLab

### Étape 1 : Créer un Dépôt sur GitHub/GitLab

1. **GitHub** : Allez sur https://github.com/new
2. **GitLab** : Allez sur https://gitlab.com/projects/new

Créez un nouveau dépôt **vide** (sans README, sans .gitignore, sans licence).

### Étape 2 : Connecter le Dépôt Local au Distant

**Pour GitHub :**
```powershell
cd C:\Users\charl\Gochineur
git remote add origin https://github.com/VOTRE_NOM_UTILISATEUR/gochineur.git
```

**Pour GitLab :**
```powershell
cd C:\Users\charl\Gochineur
git remote add origin https://gitlab.com/VOTRE_NOM_UTILISATEUR/gochineur.git
```

**Remplacez `VOTRE_NOM_UTILISATEUR` par votre nom d'utilisateur GitHub/GitLab.**

### Étape 3 : Pousser la Branche Main

```powershell
git push -u origin main
```

### Étape 4 : Pousser la Branche Develop (optionnel)

```powershell
git checkout develop
git push -u origin develop
```

### Étape 5 : Vérifier

```powershell
git remote -v
```

Vous devriez voir :
```
origin  https://github.com/VOTRE_NOM_UTILISATEUR/gochineur.git (fetch)
origin  https://github.com/VOTRE_NOM_UTILISATEUR/gochineur.git (push)
```

## 📝 Commandes Utiles

### Voir l'état actuel
```powershell
git status
```

### Voir les branches
```powershell
git branch -a
```

### Voir les commits
```powershell
git log --oneline
```

### Changer de branche
```powershell
git checkout develop
# ou
git checkout main
```

### Pousser les changements futurs
```powershell
# Sur develop
git checkout develop
git add .
git commit -m "Description des changements"
git push origin develop

# Sur main (après merge)
git checkout main
git merge develop
git push origin main
```

## ⚠️ Important

### Ne JAMAIS commiter :
- ❌ Fichiers `.env` (contiennent vos secrets)
- ❌ `node_modules/` (trop volumineux)
- ❌ `client/dist/` (fichiers générés)
- ❌ `server/database.json` (données locales)
- ❌ `server/datatourisme_data/` (trop volumineux)

### Toujours vérifier avant de commit :
```powershell
git status
```

## 🔐 Sécurité

Avant de pousser, vérifiez qu'aucun fichier sensible n'est inclus :

```powershell
# Vérifier les fichiers .env
git ls-files | Select-String "\.env"

# Vérifier les fichiers sensibles
git ls-files | Select-String -Pattern "secret|password|key|token" -CaseSensitive:$false
```

Si des fichiers sensibles sont détectés, retirez-les :
```powershell
git rm --cached server/.env
git commit -m "Remove sensitive files"
```

## 📚 Ressources

- [Documentation Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com)
- [GitLab Documentation](https://docs.gitlab.com)

---

**Note** : Après avoir poussé votre code, vous pourrez connecter votre dépôt à Render, Railway ou toute autre plateforme d'hébergement pour le déploiement automatique.

