/**
 * Service d'importation de données depuis les sources externes
 * Regroupe toute la logique d'importation depuis DATAtourisme et Open Event Database (OED)
 */

const fs = require('fs');
const path = require('path');
const { getEventsCollection } = require('../config/db');
const { transformDataTourismeEventFromFile, transformOEDEvent } = require('../utils/dataTransform');
const { fetchOEDEvents } = require('./openEventService');
const { generateEventHash, eventExists } = require('../utils/eventHash');

/**
 * Calcule la plage de dates pour l'importation (2 mois à partir d'aujourd'hui)
 * @returns {{startDate: Date, endDate: Date, startDateISO: string, endDateISO: string}}
 */
function calculateDateRange() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 6);
  endDate.setDate(1);
  endDate.setDate(0); // Dernier jour du mois
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate,
    endDate,
    startDateISO: startDate.toISOString(),
    endDateISO: endDate.toISOString()
  };
}

/**
 * Importe les événements depuis DATAtourisme
 * @returns {Promise<{imported: number, skipped: number, invalid: number, filtered: number, errors: number}>}
 */
async function importFromDataTourisme() {
  const datatourismeDataPath = path.join(__dirname, '..', 'datatourisme_data');
  const indexFilePath = path.join(datatourismeDataPath, 'index.json');

  let imported = 0;
  let skipped = 0;
  let invalid = 0;
  let filtered = 0;
  let errors = 0;

  if (!fs.existsSync(datatourismeDataPath) || !fs.existsSync(indexFilePath)) {
    console.log('⚠️ Dossier datatourisme_data introuvable, flux DATAtourisme ignoré');
    return { imported, skipped, invalid, filtered, errors };
  }

  try {
    const indexContent = fs.readFileSync(indexFilePath, 'utf8');
    const indexData = JSON.parse(indexContent);

    if (!Array.isArray(indexData) || indexData.length === 0) {
      console.log('⚠️ Aucun fichier trouvé dans index.json');
      return { imported, skipped, invalid, filtered, errors };
    }

    console.log(`📋 ${indexData.length} fichiers trouvés dans index.json, traitement en cours...`);

    const eventsCollection = getEventsCollection();

    for (let i = 0; i < indexData.length; i++) {
      const fileEntry = indexData[i];
      const filePath = path.join(datatourismeDataPath, 'objects', fileEntry.file);

      try {
        if (!fs.existsSync(filePath)) {
          errors++;
          continue;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const apidaeEvent = JSON.parse(fileContent);

        const transformedEvent = transformDataTourismeEventFromFile(apidaeEvent);

        if (!transformedEvent) {
          invalid++;
          continue;
        }

        // Le filtre strict est déjà appliqué dans transformDataTourismeEventFromFile
        // Tous les événements qui ne contiennent pas de mots-clés pertinents sont rejetés (retour null)

        // Générer le hash pour l'événement
        const eventHash = generateEventHash(transformedEvent);
        transformedEvent.eventHash = eventHash;

        // Vérification anti-doublon avec MongoDB
        const exists = await eventExists(transformedEvent, eventsCollection);
        if (!exists) {
          await eventsCollection.insertOne(transformedEvent);
          imported++;
        } else {
          skipped++;
        }

        if ((i + 1) % 100 === 0) {
          console.log(`📊 Progression DATAtourisme: ${i + 1}/${indexData.length} fichiers traités...`);
        }
      } catch (fileError) {
        errors++;
        continue;
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation DATAtourisme:', error.message);
    errors++;
  }

  return { imported, skipped, invalid, filtered, errors };
}

/**
 * Importe les événements depuis Open Event Database (OED)
 * @param {string} startDateISO - Date de début au format ISO
 * @param {string} endDateISO - Date de fin au format ISO
 * @returns {Promise<{imported: number, skipped: number, invalid: number, errors: number}>}
 */
async function importFromOED(startDateISO, endDateISO) {
  let imported = 0;
  let skipped = 0;
  let invalid = 0;
  let errors = 0;

  try {
    // Récupérer les événements depuis l'OED (couverture nationale)
    const oedFeatures = await fetchOEDEvents(startDateISO, endDateISO, 10000);

    if (!Array.isArray(oedFeatures) || oedFeatures.length === 0) {
      console.log('⚠️ Aucun événement récupéré depuis l\'OED');
      return { imported, skipped, invalid, errors };
    }

    console.log(`📋 ${oedFeatures.length} événements récupérés depuis l'OED, transformation en cours...`);

    const eventsCollection = getEventsCollection();

    for (let i = 0; i < oedFeatures.length; i++) {
      try {
        const transformedEvent = transformOEDEvent(oedFeatures[i]);

        if (!transformedEvent) {
          invalid++;
          continue;
        }

        // Générer le hash pour l'événement
        const eventHash = generateEventHash(transformedEvent);
        transformedEvent.eventHash = eventHash;

        // Vérification anti-doublon avec MongoDB (inclut les événements DATAtourisme déjà importés)
        const exists = await eventExists(transformedEvent, eventsCollection);
        if (!exists) {
          await eventsCollection.insertOne(transformedEvent);
          imported++;
        } else {
          skipped++;
        }

        if ((i + 1) % 100 === 0) {
          console.log(`📊 Progression OED: ${i + 1}/${oedFeatures.length} événements traités...`);
        }
      } catch (eventError) {
        errors++;
        continue;
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation OED:', error.message);
    errors++;
  }

  return { imported, skipped, invalid, errors };
}

/**
 * Importe tous les événements depuis toutes les sources disponibles
 * @returns {Promise<{success: boolean, imported: number, skipped: number, invalid: number, filtered: number, errors: number, totalEvents: number, details: Object}>}
 */
async function importAllData() {
  try {
    const { startDateISO, endDateISO } = calculateDateRange();

    console.log(`📅 Plage de dates: ${startDateISO} → ${endDateISO}`);
    console.log(`🌍 Couverture: France entière (sans filtre géographique)\n`);

    const eventsCollection = getEventsCollection();

    // ==================== FLUX 1 : DATAtourisme ====================
    console.log('📂 === FLUX 1 : Importation DATAtourisme ===');
    const datatourismeResult = await importFromDataTourisme();
    console.log(`✅ DATAtourisme: ${datatourismeResult.imported} importés, ${datatourismeResult.skipped} doublons, ${datatourismeResult.invalid} invalides, ${datatourismeResult.filtered} filtrés`);

    // ==================== FLUX 2 : Open Event Database (OED) ====================
    console.log('\n🌐 === FLUX 2 : Importation Open Event Database ===');
    const oedResult = await importFromOED(startDateISO, endDateISO);
    console.log(`✅ OED: ${oedResult.imported} importés, ${oedResult.skipped} doublons, ${oedResult.invalid} invalides`);

    // ==================== RÉSUMÉ FINAL ====================
    const totalImported = datatourismeResult.imported + oedResult.imported;
    const totalSkipped = datatourismeResult.skipped + oedResult.skipped;
    const totalInvalid = datatourismeResult.invalid + oedResult.invalid;
    const totalFiltered = datatourismeResult.filtered;
    const totalErrors = datatourismeResult.errors + oedResult.errors;

    // Obtenir le total final depuis MongoDB
    const totalEvents = await eventsCollection.countDocuments({});

    console.log(`\n📥 === IMPORTATION TERMINÉE ===`);
    console.log(`✅ Total importés: ${totalImported} (DATAtourisme: ${datatourismeResult.imported}, OED: ${oedResult.imported})`);
    console.log(`⏭️  Total doublons ignorés: ${totalSkipped} (DATAtourisme: ${datatourismeResult.skipped}, OED: ${oedResult.skipped})`);
    console.log(`❌ Total invalides: ${totalInvalid} (DATAtourisme: ${datatourismeResult.invalid}, OED: ${oedResult.invalid})`);
    console.log(`🚫 Total filtrés: ${totalFiltered}`);
    console.log(`⚠️  Total erreurs: ${totalErrors}`);
    console.log(`📊 Total événements en base: ${totalEvents}`);

    return {
      success: true,
      imported: totalImported,
      skipped: totalSkipped,
      invalid: totalInvalid,
      filtered: totalFiltered,
      errors: totalErrors,
      totalEvents,
      details: {
        datatourisme: datatourismeResult,
        oed: oedResult
      }
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

module.exports = {
  calculateDateRange,
  importFromDataTourisme,
  importFromOED,
  importAllData
};

