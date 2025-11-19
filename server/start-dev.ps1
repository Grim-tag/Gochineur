# Script PowerShell pour démarrer le serveur en mode développement
# Usage: .\start-dev.ps1

$env:NODE_ENV = "development"

Write-Host "MODE DE DEVELOPPEMENT DEMARRE" -ForegroundColor Cyan
Write-Host "NODE_ENV = $env:NODE_ENV" -ForegroundColor Yellow

node server.js

