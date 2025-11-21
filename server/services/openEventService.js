const axios = require('axios');

// URL de base de l'API Open Event Database
const OED_API_BASE_URL = 'http://api.openeventdatabase.org/event';

/**
 * Récupère les événements depuis l'API Open Event Database
 * Couverture nationale (sans filtre géographique)
 * @param {string} startDate - Date de début au format ISO 8601
 * @param {string} endDate - Date de fin au format ISO 8601
 * @param {number} limit - Limite du nombre de résultats (défaut: 10000 pour couverture nationale)
 * @returns {Promise<Array>} - Tableau d'événements OED
 */
async function fetchOEDEvents(startDate, endDate, limit = 10000) {
  try {
    // Construction de l'URL avec les paramètres
    const url = new URL(OED_API_BASE_URL);

    // Paramètre what : tous les mots-clés liés aux événements de "chine"
    // Paramètre what : tous les mots-clés liés aux événements de "chine"
    // NOTE: On ne filtre plus par 'what' car l'API OED utilise des catégories génériques (ex: traffic.obstacle)
    // et le paramètre 'q' (recherche texte) semble ignoré.
    // Stratégie : On récupère TOUT (dans la limite) et on filtre localement via transformOEDEvent.
    // const keywords = [
    //   'brocante',
    //   'puces',
    //   'vide-greniers',
    //   'vide-grenier',
    //   'vide-maison',
    //   'bourse',
    //   'braderie',
    //   'marché aux puces',
    //   'troc',
    //   'antiquités',
    //   'antiquaire'
    // ];
    // url.searchParams.set('what', keywords.join('|'));

    // PAS de paramètre near : récupération de tous les événements de France entière

    // Paramètres de dates
    url.searchParams.set('start', startDate);
    url.searchParams.set('stop', endDate);

    // Limite du nombre de résultats (augmentée pour couverture nationale)
    url.searchParams.set('limit', '20000');

    console.log(`🌐 Appel API OED: ${url.toString()}`);

    const response = await axios.get(url.toString(), {
      timeout: 30000, // 30 secondes de timeout
      headers: {
        'User-Agent': 'GoChineur/1.0'
      }
    });

    // L'API OED retourne un GeoJSON FeatureCollection
    if (response.data && response.data.features) {
      console.log(`✅ ${response.data.features.length} événements récupérés depuis l'OED`);
      return response.data.features;
    }

    // Si la réponse est un tableau directement
    if (Array.isArray(response.data)) {
      console.log(`✅ ${response.data.length} événements récupérés depuis l'OED`);
      return response.data;
    }

    console.warn('⚠️ Format de réponse OED inattendu:', typeof response.data);
    return [];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des événements OED:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    return [];
  }
}

module.exports = {
  fetchOEDEvents
};

