const crypto = require('crypto');

/**
 * Génère un hash unique pour un événement basé sur des données stables
 * Utilisé pour détecter les doublons indépendamment de la source
 * 
 * NOUVEAU NOYAU SIMPLIFIÉ : DateDébut (YYYY-MM-DD) + Latitude (4 décimales) + Longitude (4 décimales)
 * Ce noyau est le plus fiable car ces données sont toujours présentes dans l'Open Data
 * et sont suffisamment précises pour détecter les doublons sans être trop sensibles aux variations
 * 
 * @param {Object} event - Événement à hasher
 * @returns {string} - Hash MD5 de l'événement
 */
function generateEventHash(event) {
  // Extraire uniquement la date (sans l'heure) pour la stabilité
  let datePart = '';
  const dateDebut = event.date_debut || event.date || '';
  if (dateDebut) {
    try {
      const dateObj = new Date(dateDebut);
      datePart = dateObj.toISOString().split('T')[0]; // Format YYYY-MM-DD
    } catch (e) {
      datePart = String(dateDebut).split('T')[0];
    }
  }
  
  // Latitude tronquée à 4 décimales pour tolérer les petites variations
  let lat = '';
  if (event.latitude !== null && event.latitude !== undefined) {
    lat = parseFloat(event.latitude).toFixed(4);
  }
  
  // Longitude tronquée à 4 décimales
  let lon = '';
  if (event.longitude !== null && event.longitude !== undefined) {
    lon = parseFloat(event.longitude).toFixed(4);
  }
  
  // Construction de la chaîne à hasher (NOYAU SIMPLIFIÉ)
  // Format: dateDébut|latitude|longitude
  const hashString = `${datePart}|${lat}|${lon}`;
  
  // Génération du hash MD5
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  
  return hash;
}

/**
 * Vérifie si un événement existe déjà dans MongoDB en utilisant le hash
 * 
 * @param {Object} event - Événement à vérifier
 * @param {Object} eventsCollection - Collection MongoDB events
 * @returns {Promise<boolean>} - true si l'événement existe déjà
 */
async function eventExists(event, eventsCollection) {
  const eventHash = generateEventHash(event);
  
  const existingEvent = await eventsCollection.findOne({ eventHash: eventHash });
  return existingEvent !== null;
}

module.exports = {
  generateEventHash,
  eventExists
};



