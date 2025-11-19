/**
 * Constantes de configuration pour l'application GoChineur (Frontend)
 */

export const EVENTS = {
  DEFAULT_RADIUS: 25,
  MAX_RADIUS: 1000,
  PERIOD_MONTHS: 2
} as const;

export const GEOLOCATION = {
  DEFAULT_LAT: 43.5716, // Landes/Pays Basque Sud
  DEFAULT_LON: -1.2780,
  TIMEOUT: 10000,
  MAX_AGE: 0
} as const;

// URL de base de l'API : utilise une URL relative en production, ou localhost en développement
const getApiBaseUrl = () => {
  // En production, utilise une URL relative (même domaine)
  if (import.meta.env.PROD) {
    return ''; // URL relative - même domaine que le frontend
  }
  // En développement, utilise localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export const API = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    EVENTS: '/api/events',
    USER: '/api/user',
    AUTH: '/auth',
    ADMIN: '/admin'
  }
} as const;

export const VALIDATION = {
  DISPLAY_NAME_MAX_LENGTH: 50,
  MIN_RADIUS: 1,
  MAX_RADIUS: 1000
} as const;


