/**
 * Script pour remplacer alert() par toast dans tous les fichiers React
 * Usage: node scripts/replace-alerts-with-toast.js
 */

const fs = require('fs');
const path = require('path');

const clientSrcDir = path.join(__dirname, '../../client/src');

// Mapping des remplacements
const replacements = [
    // alert('message') → toast.success('message') ou toast.error('message')
    // On détecte le contexte pour choisir success ou error
];

function shouldBeError(message) {
    const errorKeywords = ['erreur', 'error', 'échec', 'failed', 'impossible', 'invalide'];
    return errorKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Vérifier si toast est déjà importé
    const hasToastImport = content.includes("import toast from 'react-hot-toast'") ||
        content.includes('import { toast } from "react-hot-toast"');

    // Regex pour trouver alert('...')
    const alertRegex = /alert\((['"`])(.*?)\1\)/g;

    let match;
    const replacementsToMake = [];

    while ((match = alertRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const message = match[2];
        const isError = shouldBeError(message);
        const replacement = isError ? `toast.error(${match[1]}${message}${match[1]})` : `toast.success(${match[1]}${message}${match[1]})`;

        replacementsToMake.push({ from: fullMatch, to: replacement });
        modified = true;
    }

    // Appliquer les remplacements
    replacementsToMake.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });

    // Ajouter l'import de toast si nécessaire
    if (modified && !hasToastImport) {
        // Trouver la dernière ligne d'import
        const importLines = content.match(/^import .+$/gm);
        if (importLines && importLines.length > 0) {
            const lastImport = importLines[importLines.length - 1];
            const lastImportIndex = content.indexOf(lastImport);
            const insertPosition = lastImportIndex + lastImport.length;

            content = content.slice(0, insertPosition) +
                "\nimport toast from 'react-hot-toast';" +
                content.slice(insertPosition);
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${path.relative(clientSrcDir, filePath)}`);
        return true;
    }

    return false;
}

function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    let updatedCount = 0;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            updatedCount += walkDirectory(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            if (processFile(filePath)) {
                updatedCount++;
            }
        }
    });

    return updatedCount;
}

console.log('🔄 Replacing alert() with toast...\n');
const updatedCount = walkDirectory(clientSrcDir);
console.log(`\n✅ Done! ${updatedCount} files updated.`);
