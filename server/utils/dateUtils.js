/**
 * Utilitaires pour la manipulation des dates
 */

/**
 * Obtient la date d'aujourd'hui au format YYYY-MM-DD
 * @returns {string} Date au format YYYY-MM-DD
 */
function getTodayISO() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcule les dates de début et fin d'une période de N mois à partir d'une date
 * @param {Date} startFrom - Date de départ
 * @param {number} months - Nombre de mois (défaut: 2)
 * @returns {{start: Date, end: Date}} Objet avec start et end
 */
function calculatePeriodDates(startFrom, months = 2) {
  const start = new Date(startFrom);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  end.setDate(1);
  end.setDate(0); // Dernier jour du mois
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Formate une date en ISO string (YYYY-MM-DD)
 * @param {Date} date - Date à formater
 * @returns {string} Date au format YYYY-MM-DD
 */
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Vérifie si une date est dans le passé
 * @param {string|Date} date - Date à vérifier (string YYYY-MM-DD ou Date)
 * @returns {boolean} true si la date est dans le passé
 */
function isPastDate(date) {
  const todayISO = getTodayISO();
  const dateISO = date instanceof Date ? formatDateISO(date) : date.split('T')[0];
  return dateISO < todayISO;
}

module.exports = {
  getTodayISO,
  calculatePeriodDates,
  formatDateISO,
  isPastDate
};


