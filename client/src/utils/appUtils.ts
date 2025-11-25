import type { Event } from '../types'

interface UserPosition {
  latitude: number
  longitude: number
}

export interface GroupedEvents {
  date: string
  label: string
  events: Event[]
}

/**
 * Calcule la distance entre deux points GPS en utilisant la formule Haversine
 * @param lat1 Latitude du premier point
 * @param lon1 Longitude du premier point
 * @param lat2 Latitude du second point
 * @param lon2 Longitude du second point
 * @returns Distance en kilomètres
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Fonction sécurisée pour obtenir le début d'un jour (minuit) dans le fuseau horaire local
 * Ignore complètement le fuseau horaire et l'heure pour la comparaison
 * @param date - L'objet Date à normaliser
 * @returns Un nouvel objet Date représentant minuit (00:00:00) au début de ce jour en local
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Convertit une chaîne de date ISO en objet Date et retourne le début du jour
 * @param dateString - Chaîne de date au format ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ)
 * @returns Un objet Date représentant le début du jour (minuit local)
 */
function getStartOfDayFromString(dateString: string): Date {
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day) // month - 1 car les mois sont 0-indexés
}

/**
 * Groupe les événements par jour avec des labels formatés
 */
export function groupEventsByDay(events: Event[]): GroupedEvents[] {
  const grouped: { [key: string]: Event[] } = {}

  let eventsWithoutDate = 0
  events.forEach(event => {
    const eventDateString = event.date_debut || event.date
    if (!eventDateString) {
      eventsWithoutDate++
      console.warn(`⚠️ Événement sans date ignoré:`, { id: event.id, name: event.name })
      return
    }

    const eventStartOfDay = getStartOfDayFromString(eventDateString)
    const year = eventStartOfDay.getFullYear()
    const month = String(eventStartOfDay.getMonth() + 1).padStart(2, '0')
    const day = String(eventStartOfDay.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(event)
  })

  const sortedKeys = Object.keys(grouped).sort()

  // Log de diagnostic
  if (events.length > 0) {
    console.log(`📅 groupEventsByDay: ${events.length} événements en entrée, ${eventsWithoutDate} sans date, ${sortedKeys.length} groupes créés`)
  }

  return sortedKeys.map(dateKey => {
    const eventStartOfDay = getStartOfDayFromString(dateKey)

    let label = eventStartOfDay.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    const eventDay = getStartOfDay(eventStartOfDay)
    const todayDay = getStartOfDay(new Date()) // Recalculer aujourd'hui à chaque fois
    const tomorrowDate = new Date(todayDay)
    tomorrowDate.setDate(todayDay.getDate() + 1)
    const tomorrowDay = getStartOfDay(tomorrowDate)

    // Comparaison stricte des timestamps pour éviter les problèmes de fuseau horaire
    const eventTimestamp = eventDay.getTime()
    const todayTimestamp = todayDay.getTime()
    const tomorrowTimestamp = tomorrowDay.getTime()

    if (eventTimestamp === todayTimestamp) {
      label = 'Aujourd\'hui'
    } else if (eventTimestamp === tomorrowTimestamp) {
      label = 'Demain'
    }
    // Sinon, garder le label formaté (ex: "lundi 18 novembre")

    return {
      date: dateKey,
      label,
      events: grouped[dateKey].sort((a, b) => {
        const dateA = new Date(a.date_debut || a.date).getTime()
        const dateB = new Date(b.date_debut || b.date).getTime()
        return dateA - dateB
      }),
    }
  })
}

/**
 * Optimise l'ordre des événements en utilisant l'algorithme du Plus Proche Voisin (Nearest Neighbor)
 * @param userPosition - Point de départ
 * @param eventsList - Liste des événements à optimiser
 * @returns Liste des événements triés dans l'ordre optimisé
 */
export function optimizeNearestNeighbor(
  userPosition: UserPosition,
  eventsList: Event[]
): Event[] {
  if (!eventsList || eventsList.length === 0) {
    return []
  }

  if (eventsList.length === 1) {
    return eventsList
  }

  // Copie pour ne pas modifier l'original
  const unvisited = [...eventsList]
  const optimizedRoute: Event[] = []
  let currentPoint = userPosition

  // Tant qu'il reste des événements non visités
  while (unvisited.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    // Trouver l'événement le plus proche du point actuel
    for (let i = 0; i < unvisited.length; i++) {
      const event = unvisited[i]
      const distance = calculateDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        event.latitude,
        event.longitude
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    // Ajouter l'événement le plus proche à la route optimisée
    const nearestEvent = unvisited.splice(nearestIndex, 1)[0]
    optimizedRoute.push(nearestEvent)

    // Le prochain point de départ est cet événement
    currentPoint = {
      latitude: nearestEvent.latitude,
      longitude: nearestEvent.longitude
    }
  }

  console.log(`🗺️ Circuit optimisé : ${optimizedRoute.length} événements ordonnés par proximité`)
  return optimizedRoute
}

/**
 * Génère l'URL Google Maps pour un circuit chronologique
 */
export function generateChronologicalCircuitUrl(
  userPosition: UserPosition,
  circuitEvents: Event[]
): string | null {
  if (!userPosition || circuitEvents.length === 0) return null

  const origin = `${userPosition.latitude},${userPosition.longitude}`
  const destination = `${circuitEvents[circuitEvents.length - 1].latitude},${circuitEvents[circuitEvents.length - 1].longitude}`

  const waypoints = circuitEvents.slice(0, -1).map(event =>
    `${event.latitude},${event.longitude}`
  ).join('|')

  const encodedOrigin = encodeURIComponent(origin)
  const encodedDestination = encodeURIComponent(destination)
  let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}&travelmode=driving`

  if (waypoints) {
    const encodedWaypoints = encodeURIComponent(waypoints)
    googleMapsUrl += `&waypoints=${encodedWaypoints}`
  }

  return googleMapsUrl
}

/**
 * Génère l'URL Google Maps pour naviguer vers un événement spécifique
 */
export function generateEventNavigationUrl(
  userPosition: UserPosition,
  event: Event
): string | null {
  if (!userPosition) return null

  const origin = `${userPosition.latitude},${userPosition.longitude}`
  const destination = `${event.latitude},${event.longitude}`

  const encodedOrigin = encodeURIComponent(origin)
  const encodedDestination = encodeURIComponent(destination)
  return `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}&travelmode=driving`
}

/**
 * Fonction de géocodage inverse
 * Retourne le nom de la ville à partir des coordonnées GPS
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const TEST_LAT = 43.5716
  const TEST_LON = -1.2780

  if (Math.abs(latitude - TEST_LAT) < 0.001 && Math.abs(longitude - TEST_LON) < 0.001) {
    return 'Saint-Martin-de-Hinx'
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GoChineur/1.0'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      return data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || 'Localisation inconnue'
    }
  } catch (error) {
    console.warn('Erreur lors du géocodage inverse:', error)
  }

  return 'Localisation inconnue'
}

/**
 * Fonction de géocodage direct (forward geocoding)
 * Convertit une adresse, ville ou code postal en coordonnées GPS
 * @param query - Adresse, ville ou code postal à rechercher
 * @returns Objet avec latitude, longitude et nom de la ville, ou null si erreur
 */
export async function forwardGeocode(query: string): Promise<{ latitude: number; longitude: number; city: string } | null> {
  if (!query || query.trim().length === 0) {
    return null
  }

  try {
    // Ajouter "France" pour améliorer la précision
    const searchQuery = `${query.trim()}, France`
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GoChineur/1.0'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0) {
        const result = data[0]
        const latitude = parseFloat(result.lat)
        const longitude = parseFloat(result.lon)
        const city = result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || query

        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude, city }
        }
      }
    }
  } catch (error) {
    console.warn('Erreur lors du géocodage direct:', error)
  }

  return null
}

/**
 * Génère un slug SEO-friendly pour un événement
 * Format: /type-slug/nom-evenement-ville-id
 */
export function generateEventSlug(event: Event): string {
  const typeSlug = event.type.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, '') // Supprimer les tirets au début et à la fin

  const nameSlug = event.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const citySlug = event.city.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // On ajoute l'ID à la fin pour l'unicité et la récupération facile
  return `/${typeSlug}/${nameSlug}-${citySlug}-${event.id}`
}

/**
 * Extrait l'ID d'un événement depuis son slug
 * Le slug est supposé se terminer par -ID
 */
export function extractIdFromSlug(slug: string): string {
  // On cherche le dernier tiret qui sépare le slug de l'ID
  // Attention : l'ID peut contenir des tirets (ex: UUID) ou des underscores (ex: DT_...)
  // Notre format est : ...-DT_12345 ou ...-USER_12345

  // Stratégie : on prend tout ce qui est après le dernier tiret précédant un préfixe connu (DT_ ou USER_ ou OED_)
  // Si pas de préfixe connu, on prend le dernier segment après le dernier tiret

  const parts = slug.split('-')

  // Recherche d'un préfixe connu en partant de la fin
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].startsWith('DT_') || parts[i].startsWith('USER_') || parts[i].startsWith('OED_')) {
      // C'est le début de l'ID. L'ID peut contenir des tirets s'il s'agit d'un UUID après le préfixe
      // Donc on reconstruit l'ID à partir de ce point
      return parts.slice(i).join('-')
    }
  }

  // Fallback : on retourne le dernier segment (cas d'un ID simple sans tiret)
  return parts[parts.length - 1]
}

/**
 * Nettoie les événements expirés du circuit
 * Supprime automatiquement les événements dont la date est passée après 22h
 * @param circuitEventIds - Liste des IDs d'événements dans le circuit
 * @param allEvents - Liste complète des événements pour vérifier les dates
 * @returns Liste nettoyée des IDs d'événements
 */
export function cleanExpiredEventsFromCircuit(
  circuitEventIds: (string | number)[],
  allEvents: Event[]
): (string | number)[] {
  const now = new Date()
  const currentHour = now.getHours()

  // Créer un Set des IDs d'événements expirés
  const expiredIds = new Set<string | number>()

  allEvents.forEach(event => {
    if (!circuitEventIds.includes(event.id)) return

    const eventDateString = event.date_debut || event.date
    if (!eventDateString) return

    const eventDate = new Date(eventDateString)
    const eventStartOfDay = getStartOfDay(eventDate)
    const todayStartOfDay = getStartOfDay(now)

    // Si l'événement est aujourd'hui et qu'il est après 22h, on le retire
    if (eventStartOfDay.getTime() === todayStartOfDay.getTime() && currentHour >= 22) {
      expiredIds.add(event.id)
    }

    // Si l'événement est dans le passé (avant aujourd'hui), on le retire aussi
    if (eventStartOfDay.getTime() < todayStartOfDay.getTime()) {
      expiredIds.add(event.id)
    }
  })

  // Filtrer les IDs expirés
  const cleanedIds = circuitEventIds.filter(id => !expiredIds.has(id))

  // Si des événements ont été retirés, mettre à jour le localStorage
  if (cleanedIds.length !== circuitEventIds.length) {
    console.log(`🧹 Nettoyage du circuit: ${circuitEventIds.length - cleanedIds.length} événement(s) expiré(s) retiré(s)`)
    localStorage.setItem('gochineur-circuit', JSON.stringify(cleanedIds))
  }

  return cleanedIds
}


