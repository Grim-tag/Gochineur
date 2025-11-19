/**
 * Script pour nettoyer la base de données et relancer l'importation
 * Usage: node scripts/clean-and-import.js
 * 
 * Ce script exécute directement les fonctions de nettoyage et d'importation
 * sans passer par les routes HTTP, évitant ainsi le problème d'authentification.
 */

require('dotenv').config();

// Import des services
const { connectDB, cleanDatabase, closeDB } = require('../config/db');
const { importAllData } = require('../services/dataImporter');


/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 === Script de nettoyage et ré-importation ===\n');
  
  try {
    // Étape 0: Se connecter à MongoDB
    console.log('📋 Étape 0: Connexion à MongoDB...');
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');
    
    // Étape 1: Nettoyer la base de données
    console.log('📋 Étape 1: Nettoyage de la base de données...');
    const cleanResult = await cleanDatabase();
    console.log(`✅ ${cleanResult.deleted} événement(s) supprimé(s)\n`);
    
    // Étape 2: Ré-importer les données
    console.log('📋 Étape 2: Ré-importation des données...\n');
    const importResult = await importAllData();
    
    console.log('\n✅ === PROCESSUS TERMINÉ AVEC SUCCÈS ===');
    console.log(`📊 Résultat final: ${importResult.totalEvents} événements en base`);
    
    // Fermer la connexion
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ === ERREUR LORS DU PROCESSUS ===');
    console.error(error.message);
    console.error(error.stack);
    await closeDB().catch(() => {});
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}


