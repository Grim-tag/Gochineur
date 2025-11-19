# Script PowerShell pour démarrer le serveur en mode production
# Usage: .\start-production.ps1

$env:NODE_ENV = "production"

Write-Host "MODE DE PRODUCTION DEMARRE" -ForegroundColor Green
Write-Host "NODE_ENV = $env:NODE_ENV" -ForegroundColor Yellow

node server.js

