/**
 * Constantes de configuration pour l'application GoChineur
 */

module.exports = {
  // Limites et pagination
  EVENTS: {
    DEFAULT_LIMIT: 500,
    DEFAULT_RADIUS: 25,
    MAX_RADIUS: 1000,
    PERIOD_MONTHS: 2
  },

  // Statuts d'événements
  EVENT_STATUS: {
    PUBLISHED: ['published', 'validé', 'publie', 'Published', 'Validé'],
    PENDING: 'pending_review',
    REJECTED: 'rejected'
  },

  // Types d'événements
  EVENT_TYPES: {
    VIDE_GRENIER: 'vide-grenier',
    BROCANTE: 'brocante',
    TROC: 'troc',
    PUCES: 'puces',
    BOURSE: 'bourse',
    VIDE_MAISON: 'vide-maison',
    BRADERIE: 'braderie',
    ANTIQUAIRE: 'antiquaire'
  },

  // Géolocalisation
  GEOLOCATION: {
    DEFAULT_LAT: 46.7167, // Centre de la France
    DEFAULT_LON: 2.5000,
    TIMEOUT: 10000,
    MAX_AGE: 0
  },

  // Validation
  VALIDATION: {
    DISPLAY_NAME_MAX_LENGTH: 50,
    MIN_RADIUS: 1,
    MAX_RADIUS: 1000
  }
};



