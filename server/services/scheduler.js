/**
 * Service de planification des tâches (Cron Jobs)
 * Gère l'automatisation des tâches récurrentes comme l'importation des données.
 */

const cron = require('node-cron');
const { importAllData } = require('./dataImporter');

/**
 * Initialise les tâches planifiées
 */
function initScheduler() {
    console.log('⏰ Initialisation du planificateur de tâches...');

    // Tâche d'importation quotidienne à 03:00 du matin
    // Cron syntax: Minute Hour Day Month DayOfWeek
    cron.schedule('0 3 * * *', async () => {
        console.log('⏰ [CRON] Lancement de l\'importation automatique quotidienne (03:00)...');
        try {
            const result = await importAllData();
            console.log('✅ [CRON] Importation automatique terminée avec succès.');
            console.log(`   - Importés: ${result.imported}`);
            console.log(`   - Total en base: ${result.totalEvents}`);
        } catch (error) {
            console.error('❌ [CRON] Erreur lors de l\'importation automatique:', error);
        }
    }, {
        scheduled: true,
        timezone: "Europe/Paris"
    });

    console.log('✅ Tâche d\'importation planifiée : Tous les jours à 03:00 (Europe/Paris)');
}

module.exports = {
    initScheduler
};
