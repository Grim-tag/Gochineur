/**
 * Service API centralisé pour les appels HTTP
 */

import { API } from '../config/constants';
import { getToken } from './auth';
import type { Event } from '../types';

/**
 * Crée les headers avec le token JWT si disponible
 */
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

interface FetchEventsParams {
  lat?: number;
  lon?: number;
  radius?: number;
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
}

/**
 * Récupère les événements depuis l'API
 */
export async function fetchEvents(params: FetchEventsParams): Promise<Event[]> {
  // Construire l'URL correctement selon que BASE_URL est vide (relative) ou absolue
  let url: URL;
  const endpoint = API.ENDPOINTS.EVENTS;

  if (API.BASE_URL) {
    // URL absolue
    url = new URL(`${API.BASE_URL}${endpoint}`);
  } else {
    // URL relative - utiliser window.location.origin comme base
    url = new URL(endpoint, window.location.origin);
  }

  if (params.lat !== undefined) {
    url.searchParams.set('lat', params.lat.toString());
  }
  if (params.lon !== undefined) {
    url.searchParams.set('lon', params.lon.toString());
  }
  if (params.radius !== undefined) {
    url.searchParams.set('radius', params.radius.toString());
  }
  if (params.startDate) {
    url.searchParams.set('start_date', params.startDate.toISOString().split('T')[0]);
  }
  if (params.endDate) {
    url.searchParams.set('end_date', params.endDate.toISOString().split('T')[0]);
  }
  if (params.eventType && params.eventType !== 'tous') {
    url.searchParams.set('type', params.eventType);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
  }

  const data: Event[] = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Format de réponse invalide: la réponse doit être un tableau');
  }

  return data;
}

/**
 * Soumet un nouvel événement
 */
export async function submitEvent(eventData: Partial<Event>): Promise<Event> {
  const endpoint = `${API.ENDPOINTS.EVENTS}/submit`;
  const url = API.BASE_URL ? `${API.BASE_URL}${endpoint}` : endpoint;

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(eventData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Erreur HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Récupère l'utilisateur actuel
 */
export async function getCurrentUser() {
  const endpoint = `${API.ENDPOINTS.USER}/current`;
  const url = API.BASE_URL ? `${API.BASE_URL}${endpoint}` : endpoint;

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Met à jour le pseudo de l'utilisateur
 */
export async function updateDisplayName(displayName: string) {
  const endpoint = `${API.ENDPOINTS.USER}/set-pseudo`;
  const url = API.BASE_URL ? `${API.BASE_URL}${endpoint}` : endpoint;

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ displayName })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Erreur HTTP ${response.status}`);
  }

  return response.json();
}


