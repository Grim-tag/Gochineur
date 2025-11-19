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


