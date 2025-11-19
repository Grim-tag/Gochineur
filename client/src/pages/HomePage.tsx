import { useEffect, useState } from 'react'
import SearchBar from '../components/SearchBar'
import EventCard from '../components/EventCard'
import type { Event } from '../types'
import { groupEventsByDay, type GroupedEvents } from '../utils/appUtils'
import { reverseGeocode } from '../utils/appUtils'
import { calculatePeriodDates } from '../utils/dateUtils'
import { fetchEvents } from '../services/api'
import { EVENTS, GEOLOCATION, API } from '../config/constants'

interface UserPosition {
  latitude: number
  longitude: number
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvents[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [city, setCity] = useState<string>('')
  const [currentRadius, setCurrentRadius] = useState<number>(EVENTS.DEFAULT_RADIUS)
  const [_currentStartDate, setCurrentStartDate] = useState<Date | null>(null)
  const [currentEndDate, setCurrentEndDate] = useState<Date | null>(null)
  const [hasMoreEvents, setHasMoreEvents] = useState(true)

  // Coordonnées de test (Landes/Pays Basque Sud)
  const testPositionFallback: UserPosition = {
    latitude: GEOLOCATION.DEFAULT_LAT,
    longitude: GEOLOCATION.DEFAULT_LON
  }

  // Géolocalisation de l'utilisateur avec fallback sur position de test
  useEffect(() => {
    const loadPosition = async () => {
      let position: UserPosition
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            position = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }
            setUserPosition(position)
            setLocationLoading(false)
            // Géocodage inverse pour obtenir le nom de la ville
            reverseGeocode(position.latitude, position.longitude).then(setCity)
          },
          (error) => {
            console.error('Erreur de géolocalisation:', error)
            position = testPositionFallback
            setUserPosition(position)
            setLocationError('Position non disponible. Utilisation de la position de test comme point de référence.')
            setLocationLoading(false)
            // Géocodage inverse pour la position de test
            reverseGeocode(position.latitude, position.longitude).then(setCity)
          },
          {
            enableHighAccuracy: true,
            timeout: GEOLOCATION.TIMEOUT,
            maximumAge: GEOLOCATION.MAX_AGE
          }
        )
      } else {
        position = testPositionFallback
        setUserPosition(position)
        setLocationError('La géolocalisation n\'est pas supportée. Utilisation de la position de test comme point de référence.')
        setLocationLoading(false)
        // Géocodage inverse pour la position de test
        reverseGeocode(position.latitude, position.longitude).then(setCity)
      }
    }
    
    loadPosition()
  }, [])

  // Fonction pour charger les événements avec une période donnée
  const loadEvents = async (
    startDate: Date,
    endDate: Date,
    append: boolean = false,
    eventType?: string,
    customRadius?: number
  ): Promise<Event[]> => {
    const position = userPosition || testPositionFallback
    const radiusToUse = customRadius !== undefined ? customRadius : currentRadius
    
    const data = await fetchEvents({
      lat: position.latitude,
      lon: position.longitude,
      radius: radiusToUse,
      startDate,
      endDate,
      eventType
    })
    
    if (append) {
      // Ajouter les nouveaux événements à la liste existante
      setEvents(prev => {
        // Éviter les doublons basés sur l'ID
        const existingIds = new Set(prev.map(e => e.id))
        const newEvents = data.filter(e => !existingIds.has(e.id))
        console.log(`📊 loadEvents (append): ${newEvents.length} nouveaux événements ajoutés à ${prev.length} existants`)
        return [...prev, ...newEvents]
      })
    } else {
      // Remplacer la liste complète
      console.log(`📊 loadEvents: Remplacement de events avec ${data.length} événements`)
      setEvents(data)
    }
    
    return data
  }

  // Charger les événements initiaux (2 premiers mois)
  useEffect(() => {
    // CRITIQUE: Ne pas bloquer le chargement si userPosition n'est pas encore défini
    // Utiliser testPositionFallback si userPosition est null
    console.log(`📍 Chargement initial: userPosition=${userPosition ? 'défini' : 'null'}, utilisation de position de fallback`)
    
    const today = new Date()
    const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
    
    setCurrentStartDate(start)
    setCurrentEndDate(end)
    setLoading(true)
    setHasMoreEvents(true)
    
    // Utiliser la position disponible (userPosition ou fallback)
    console.log(`🚀 Démarrage du chargement des événements...`)
    loadEvents(start, end, false)
      .then((data: Event[]) => {
        console.log(`📦 Frontend: ${data.length} événements reçus depuis l'API`)
        console.log(`📋 Frontend: Premier événement:`, data[0] ? {
          id: data[0].id,
          name: data[0].name,
          date_debut: data[0].date_debut
        } : 'Aucun événement')
        
        // CRITIQUE: Mettre à jour events d'abord, puis filteredEvents sera mis à jour par le useEffect
        console.log(`💾 Mise à jour de events avec ${data.length} événements`)
        setEvents(data)
        
        // Mettre à jour filteredEvents directement aussi pour éviter le délai
        setFilteredEvents(data)
        const grouped = groupEventsByDay(data)
        console.log(`📅 Frontend: ${grouped.length} groupes créés depuis ${data.length} événements`)
        if (grouped.length > 0) {
          console.log(`📅 Frontend: Premier groupe:`, {
            date: grouped[0].date,
            label: grouped[0].label,
            eventsCount: grouped[0].events.length
          })
        }
        setGroupedEvents(grouped)
        setLoading(false)
        // Vérifier s'il y a plus d'événements à charger
        setHasMoreEvents(data.length > 0)
      })
      .catch(err => {
        console.error('❌ Erreur lors du chargement des événements:', err)
        setError(err.message)
        setLoading(false)
        // Même en cas d'erreur, s'assurer que les états sont réinitialisés
        setEvents([])
        setFilteredEvents([])
        setGroupedEvents([])
      })
  }, []) // Charger une seule fois au montage du composant

  // Mettre à jour les événements filtrés quand la liste change
  useEffect(() => {
    console.log(`🔄 useEffect [events]: ${events.length} événements dans events, mise à jour de filteredEvents`)
    setFilteredEvents(events)
    const grouped = groupEventsByDay(events)
    console.log(`🔄 useEffect [events]: ${grouped.length} groupes créés`)
    setGroupedEvents(grouped)
  }, [events])

  // Charger le circuit depuis localStorage
  useEffect(() => {
    const loadCircuit = () => {
      const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
      setCircuitIds(circuit)
    }
    loadCircuit()
    window.addEventListener('storage', loadCircuit)
    return () => window.removeEventListener('storage', loadCircuit)
  }, [])

  // Fonction pour charger plus d'événements (2 mois suivants)
  const handleLoadMore = async () => {
    if (!currentEndDate || loadingMore) return
    
    setLoadingMore(true)
    
    // Calculer la nouvelle période (2 mois à partir de la fin actuelle)
    const nextStartDate = new Date(currentEndDate)
    nextStartDate.setDate(nextStartDate.getDate() + 1) // Jour suivant
    nextStartDate.setHours(0, 0, 0, 0)
    
    const { start, end } = calculatePeriodDates(nextStartDate)
    
    try {
      const newEvents = await loadEvents(start, end, true)
      
      // Mettre à jour les dates courantes
      setCurrentStartDate(start)
      setCurrentEndDate(end)
      
      // Vérifier s'il y a encore des événements à charger
      setHasMoreEvents(newEvents.length > 0)
      
      // Mettre à jour les événements filtrés
      setFilteredEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const uniqueNewEvents = newEvents.filter(e => !existingIds.has(e.id))
        return [...prev, ...uniqueNewEvents]
      })
    } catch (err: any) {
      console.error('Erreur lors du chargement supplémentaire:', err)
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  // Fonction pour charger les événements avec une position spécifique
  const loadEventsWithPosition = async (
    startDate: Date,
    endDate: Date,
    append: boolean = false,
    eventType?: string,
    customRadius?: number,
    customPosition?: UserPosition
  ): Promise<Event[]> => {
    const position = customPosition || userPosition || testPositionFallback
    const radiusToUse = customRadius !== undefined ? customRadius : currentRadius
    
    // Construire l'URL correctement selon que BASE_URL est vide (relative) ou absolue
    const endpoint = API.ENDPOINTS.EVENTS;
    const apiUrl = API.BASE_URL 
      ? new URL(`${API.BASE_URL}${endpoint}`)
      : new URL(endpoint, window.location.origin);
    
    apiUrl.searchParams.set('lat', position.latitude.toString())
    apiUrl.searchParams.set('lon', position.longitude.toString())
    apiUrl.searchParams.set('radius', radiusToUse.toString())
    apiUrl.searchParams.set('start_date', startDate.toISOString().split('T')[0])
    apiUrl.searchParams.set('end_date', endDate.toISOString().split('T')[0])
    
    // Ajouter le filtre de type si fourni
    if (eventType && eventType !== 'tous') {
      apiUrl.searchParams.set('type', eventType)
    }
    
    const response = await fetch(apiUrl.toString())
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des événements')
    }
    
    const data: Event[] = await response.json()
    
    if (append) {
      // Ajouter les nouveaux événements à la liste existante
      setEvents(prev => {
        // Éviter les doublons basés sur l'ID
        const existingIds = new Set(prev.map(e => e.id))
        const newEvents = data.filter(e => !existingIds.has(e.id))
        return [...prev, ...newEvents]
      })
    } else {
      // Remplacer la liste complète
      setEvents(data)
    }
    
    return data
  }

  // Fonction de recherche et filtrage
  const handleSearch = (
    searchTerm: string, 
    radius: number, 
    eventType: string, 
    coordinates?: { latitude: number; longitude: number; city: string }
  ) => {
    setCurrentRadius(radius)
    
    // Si des coordonnées sont fournies (géocodage réussi), mettre à jour la position et la ville
    if (coordinates) {
      setUserPosition({ latitude: coordinates.latitude, longitude: coordinates.longitude })
      setCity(coordinates.city)
    }
    
    // Utiliser le rayon spécifié (plus besoin de 2000 km car on a les bonnes coordonnées)
    const searchRadius = radius
    
    // Recharger les événements avec le nouveau rayon et type depuis le serveur
    // On réinitialise la période à 2 mois à partir d'aujourd'hui
    const today = new Date()
    const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
    
    setCurrentStartDate(start)
    setCurrentEndDate(end)
    setLoading(true)
    
    // Utiliser les nouvelles coordonnées si disponibles, sinon la position actuelle
    const positionToUse = coordinates 
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
      : (userPosition || testPositionFallback)
    
    // Passer le type d'événement et le rayon personnalisé à l'API avec les nouvelles coordonnées
    loadEventsWithPosition(start, end, false, eventType, searchRadius, positionToUse)
      .then((data: Event[]) => {
        console.log(`📦 Frontend (recherche): ${data.length} événements reçus depuis l'API`)
        
        let filtered = [...data]

        // Filtre par nom, ville ou code postal (côté client) si recherche textuelle
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase()
          const beforeFilter = filtered.length
          filtered = filtered.filter(
            event =>
              event.name.toLowerCase().includes(searchLower) ||
              (event.city && event.city.toLowerCase().includes(searchLower)) ||
              (event.postalCode && event.postalCode.includes(searchTerm))
          )
          console.log(`🔍 Frontend: Filtre texte "${searchTerm}": ${filtered.length} événements après filtrage (${beforeFilter} avant)`)
        }

        setFilteredEvents(filtered)
        const grouped = groupEventsByDay(filtered)
        console.log(`📅 Frontend (recherche): ${grouped.length} groupes créés depuis ${filtered.length} événements`)
        setGroupedEvents(grouped)
        setLoading(false)
        setHasMoreEvents(data.length > 0)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        console.error('Erreur lors de la recherche:', err)
      })
  }

  // Ajouter un événement au circuit
  const handleAddToCircuit = (eventId: string | number) => {
    const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
    if (!circuit.includes(eventId)) {
      const newCircuit = [...circuit, eventId]
      localStorage.setItem('gochineur-circuit', JSON.stringify(newCircuit))
      setCircuitIds(newCircuit)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SearchBar 
        onSearch={handleSearch} 
        onRadiusChange={setCurrentRadius}
        events={events} 
      />

      <div className="container mx-auto px-4 py-6">
        {locationLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-blue-700 text-sm">
              🌍 Recherche de votre position...
            </p>
          </div>
        )}

        {!locationLoading && locationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-700 text-sm">⚠️ {locationError}</p>
          </div>
        )}

        {/* Titre H1 principal pour le SEO */}
        {!locationLoading && userPosition && city && (
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Vide-greniers, brocantes et bourses - {city} ({currentRadius} km)
          </h1>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des événements...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-semibold">Erreur</p>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-sm text-gray-500 mt-4">
              Assurez-vous que le serveur backend est démarré sur le port 5000
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-600">
                {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} trouvé{filteredEvents.length > 1 ? 's' : ''}
              </p>
              {userPosition && (
                <p className="text-sm text-gray-500">
                  Filtrage par distance activé
                </p>
              )}
            </div>

            {/* Affichage groupé par jour */}
            {/* Message informatif (non bloquant) */}
            {import.meta.env.DEV && filteredEvents.length > 0 && (
              <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <p>ℹ️ {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} affiché{filteredEvents.length > 1 ? 's' : ''} dans {groupedEvents.length} groupe{groupedEvents.length > 1 ? 's' : ''}</p>
              </div>
            )}
            {filteredEvents.length > 0 && groupedEvents.length > 0 ? (
              <>
                <div className="space-y-8">
                  {groupedEvents.map((group) => {
                    // Déterminer si c'est aujourd'hui
                    const isToday = group.label === 'Aujourd\'hui'
                    const h2Label = isToday ? 'Vide-greniers aujourd\'hui' : group.label
                    
                    return (
                      <div key={group.date}>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">
                          {h2Label}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {group.events.map((event) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              onAddToCircuit={handleAddToCircuit}
                              isInCircuit={circuitIds.includes(event.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Bouton "Voir Plus" */}
                {hasMoreEvents && !loading && (
                  <div className="flex justify-center mt-8 mb-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                        loadingMore
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Chargement...
                        </span>
                      ) : (
                        'Voir Plus'
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg font-semibold">Aucun événement trouvé</p>
                <p className="text-gray-400 text-sm mt-2">
                  {filteredEvents.length === 0 
                    ? 'Aucun événement ne correspond à vos critères de recherche.'
                    : 'Les événements trouvés ne peuvent pas être groupés par date.'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Essayez de modifier vos critères de recherche ou d'augmenter le rayon de recherche.
                </p>
                {/* Message spécial si la base est probablement vide */}
                {filteredEvents.length === 0 && !loading && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm font-semibold">💡 Information</p>
                    <p className="text-blue-600 text-sm mt-1">
                      Si vous êtes administrateur, vérifiez que la base de données contient des événements.
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      Testez la connexion MongoDB: <a href="http://localhost:5000/api/test-mongodb" target="_blank" rel="noopener noreferrer" className="underline">http://localhost:5000/api/test-mongodb</a>
                    </p>
                  </div>
                )}
                {/* Debug: Afficher le nombre d'événements filtrés */}
                {import.meta.env.DEV && (
                  <p className="text-gray-300 text-xs mt-4">
                    Debug: {filteredEvents.length} événement(s) filtré(s), {groupedEvents.length} groupe(s) créé(s)
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

