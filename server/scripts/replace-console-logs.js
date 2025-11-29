/**
 * Script pour remplacer console.log par logger dans tous les fichiers routes
 * Usage: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

// Mapping des remplacements
const replacements = [
    // console.log avec emojis → logger.info
    { pattern: /console\.log\(/g, replacement: 'logger.info(' },
    // console.error → logger.error
    { pattern: /console\.error\(/g, replacement: 'logger.error(' },
    // console.warn → logger.warn
    { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    // console.debug → logger.debug
    { pattern: /console\.debug\(/g, replacement: 'logger.debug(' },
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Vérifier si logger est déjà importé
    const hasLoggerImport = content.includes("require('../config/logger')") ||
        content.includes('require("../config/logger")');

    // Appliquer les remplacements
    replacements.forEach(({ pattern, replacement }) => {
        if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            modified = true;
        }
    });

    // Ajouter l'import du logger si nécessaire
    if (modified && !hasLoggerImport) {
        // Trouver la dernière ligne de require
        const requireLines = content.match(/const .+ = require\(.+\);/g);
        if (requireLines && requireLines.length > 0) {
            const lastRequire = requireLines[requireLines.length - 1];
            const lastRequireIndex = content.lastIndexOf(lastRequire);
            const insertPosition = lastRequireIndex + lastRequire.length;

            content = content.slice(0, insertPosition) +
                "\nconst logger = require('../config/logger');" +
                content.slice(insertPosition);
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${path.basename(filePath)}`);
        return true;
    }

    return false;
}

// Parcourir tous les fichiers .js dans routes/
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
let updatedCount = 0;

console.log('🔄 Replacing console.* with logger...\n');

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    if (processFile(filePath)) {
        updatedCount++;
    }
});

console.log(`\n✅ Done! ${updatedCount} files updated.`);
