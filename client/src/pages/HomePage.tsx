import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import EventCard from '../components/EventCard'
import Breadcrumbs from '../components/Breadcrumbs'
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

interface GeoData {
  regions: { code: string; name: string; slug: string; lat: number; lon: number }[]
  departments: { code: string; name: string; region: string; lat: number; lon: number }[]
  cities: { name: string; slug: string; department: string; lat: number; lon: number }[]
}

export default function HomePage() {
  const { departmentCode, citySlug, regionSlug, departmentSlug } = useParams<{
    departmentCode?: string;
    citySlug?: string;
    regionSlug?: string;
    departmentSlug?: string;
  }>()
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
  const [currentEventType, setCurrentEventType] = useState<string>('tous')
  const [_currentStartDate, setCurrentStartDate] = useState<Date | null>(null)
  const [currentEndDate, setCurrentEndDate] = useState<Date | null>(null)
  const [hasMoreEvents, setHasMoreEvents] = useState(true)
  const [seoTitle, setSeoTitle] = useState<string>('Vide-greniers et brocantes autour de moi')

  // Coordonnées de test (Landes/Pays Basque Sud)
  const testPositionFallback: UserPosition = {
    latitude: GEOLOCATION.DEFAULT_LAT,
    longitude: GEOLOCATION.DEFAULT_LON
  }

  // Charger les données géographiques (départements et villes)
  const [geoData, setGeoData] = useState<GeoData | null>(null)

  useEffect(() => {
    fetch(`${API.BASE_URL}/api/geo/data`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGeoData(data.data)
        }
      })
      .catch(err => console.error('Erreur chargement geo data:', err))
  }, [])

  // Helper pour mettre à jour le titre SEO
  const updateSeoTitle = (locationName: string, type: string, radius: number, deptCode?: string, isCity: boolean = false) => {
    const typeLabel = type === 'tous' ? 'Vide-greniers et brocantes' : type + 's'
    let title = ''

    if (isCity) {
      // Pour les villes : "Vide-greniers à Paris (25 km)"
      title = `${typeLabel} à ${locationName}`
      if (!deptCode) {
        title += ` (${radius} km)`
      }
    } else if (deptCode) {
      // Pour les départements : "Vide-greniers Landes (33)"
      title = `${typeLabel} ${locationName} (${deptCode})`
    } else {
      // Pour les régions ou autres : "Vide-greniers Nouvelle-Aquitaine"
      title = `${typeLabel} ${locationName}`
    }

    setSeoTitle(title)
    document.title = `${title} - GoChineur`
  }

  // Fonction de chargement de la position (extraite pour être réutilisable)
  const loadUserPosition = async () => {
    setLocationLoading(true)
    let position: UserPosition

    const handlePosition = (pos: UserPosition, cityName?: string) => {
      setUserPosition(pos)
      setLocationLoading(false)
      // Si un nom de ville est fourni (via reverse geocode ou autre), on l'utilise
      if (cityName) {
        setCity(cityName)
        updateSeoTitle(cityName, currentEventType, currentRadius, undefined, true)
      } else {
        // Sinon on fait un reverse geocode
        reverseGeocode(pos.latitude, pos.longitude).then(name => {
          setCity(name)
          updateSeoTitle(name, currentEventType, currentRadius, undefined, true)
        })
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
        },
        () => {
          position = testPositionFallback
          setLocationError('Position non disponible. Utilisation de la position de test.')
          handlePosition(position)
        },
        {
          enableHighAccuracy: true,
          timeout: GEOLOCATION.TIMEOUT,
          maximumAge: GEOLOCATION.MAX_AGE
        }
      )
    } else {
      position = testPositionFallback
      setLocationError('Géolocalisation non supportée. Utilisation de la position de test.')
      handlePosition(position)
    }
  }

  // Géolocalisation de l'utilisateur avec fallback sur position de test
  // MODIFIÉ : Ne se déclenche que si PAS de paramètres d'URL
  useEffect(() => {
    if (departmentCode || citySlug || regionSlug || departmentSlug) {
      setLocationLoading(false)
      return
    }

    // Si on est sur la home racine, on lance la géolocalisation
    loadUserPosition()
  }, [departmentCode, citySlug, regionSlug, departmentSlug])


  // Gérer les paramètres d'URL pour le SEO (Région, Département ou Ville)
  useEffect(() => {
    if (!geoData) return

    const handleUrlParams = async () => {
      let targetLat: number | null = null
      let targetLon: number | null = null
      let targetName = ''
      let targetRadius: number = EVENTS.DEFAULT_RADIUS
      let deptCodeStr = ''

      if (regionSlug) {
        const region = geoData.regions.find(r => r.slug === regionSlug)
        if (region) {
          targetLat = region.lat
          targetLon = region.lon
          targetName = region.name
          targetRadius = 100 // Rayon très large pour une région
          updateSeoTitle(targetName, currentEventType, targetRadius, undefined, false)

          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) metaDesc.setAttribute('content', `Découvrez tous les vide-greniers, brocantes et bourses aux collections en ${region.name}. Agenda complet et à jour pour toute la région.`)
        }
      } else if (departmentCode || departmentSlug) {
        let dept = null
        if (departmentCode) {
          dept = geoData.departments.find(d => d.code === departmentCode)
        } else if (departmentSlug) {
          dept = geoData.departments.find(d =>
            d.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === departmentSlug
          )
        }
        if (dept) {
          targetLat = dept.lat
          targetLon = dept.lon
          targetName = dept.name
          deptCodeStr = dept.code
          targetRadius = 50 // Rayon plus large pour un département
          updateSeoTitle(targetName, currentEventType, targetRadius, deptCodeStr, false)
          // Description meta dynamique (idéalement via Helmet, ici via DOM direct pour SPA simple)
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) metaDesc.setAttribute('content', `Trouvez tous les vide-greniers, brocantes et bourses aux collections dans le département ${dept.name} (${dept.code}). Agenda complet et à jour.`)
        }
      } else if (citySlug) {
        const cityData = geoData.cities.find(c => c.slug === citySlug)
        if (cityData) {
          targetLat = cityData.lat
          targetLon = cityData.lon
          targetName = cityData.name
          targetRadius = 30 // Rayon standard pour une ville
          updateSeoTitle(targetName, currentEventType, targetRadius, undefined, true)
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) metaDesc.setAttribute('content', `Les meilleurs vide-greniers et brocantes à ${cityData.name} et aux alentours. Dates, horaires et infos pratiques pour chiner malin.`)
        }
      }

      if (targetLat && targetLon) {
        setUserPosition({ latitude: targetLat, longitude: targetLon })
        setCity(targetName)
        setCurrentRadius(targetRadius)

        // Charger les événements pour cette position
        const today = new Date()
        const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
        setCurrentStartDate(start)
        setCurrentEndDate(end)
        setLoading(true)

        loadEvents(start, end, false, undefined, targetRadius, { latitude: targetLat, longitude: targetLon })
          .then((data: Event[]) => {
            setFilteredEvents(data)
            const grouped = groupEventsByDay(data)
            setGroupedEvents(grouped)
            setLoading(false)
            setHasMoreEvents(data.length > 0)
          })
          .catch(err => {
            setError(err.message)
            setLoading(false)
          })
      }
    }

    handleUrlParams()
  }, [departmentCode, citySlug, regionSlug, departmentSlug, geoData])

  // Fonction pour charger les événements avec une période donnée
  const loadEvents = async (
    startDate: Date,
    endDate: Date,
    append: boolean = false,
    eventType?: string,
    customRadius?: number,
    customPosition?: UserPosition
  ): Promise<Event[]> => {
    const position = customPosition || userPosition || testPositionFallback
    const radiusToUse = customRadius !== undefined ? customRadius : currentRadius
    const typeToUse = eventType === 'tous' ? undefined : eventType

    const data = await fetchEvents({
      lat: position.latitude,
      lon: position.longitude,
      radius: radiusToUse,
      startDate,
      endDate,
      eventType: typeToUse
    })

    if (append) {
      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const newEvents = data.filter(e => !existingIds.has(e.id))
        return [...prev, ...newEvents]
      })
    } else {
      setEvents(data)
    }

    return data
  }

  // Charger les événements initiaux (2 premiers mois) - UNIQUEMENT SI PAS DE PARAMS URL
  useEffect(() => {
    if (departmentCode || citySlug || regionSlug || departmentSlug) return // Laissé à l'effet handleUrlParams

    const today = new Date()
    const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)

    setCurrentStartDate(start)
    setCurrentEndDate(end)
    setLoading(true)
    setHasMoreEvents(true)

    loadEvents(start, end, false, currentEventType)
      .then((data: Event[]) => {
        setFilteredEvents(data)
        const grouped = groupEventsByDay(data)
        setGroupedEvents(grouped)
        setLoading(false)
        setHasMoreEvents(data.length > 0)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        setEvents([])
        setFilteredEvents([])
        setGroupedEvents([])
      })
  }, [departmentCode, citySlug, regionSlug, departmentSlug, userPosition, currentEventType, currentRadius]) // Dépendances ajoutées pour éviter double chargement

  // Mettre à jour les événements filtrés quand la liste change
  useEffect(() => {
    setFilteredEvents(events)
    const grouped = groupEventsByDay(events)
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
      const newEvents = await loadEvents(start, end, true, currentEventType)

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
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  // Réinitialiser à la géolocalisation
  const handleReset = () => {
    setCity('')
    setCurrentEventType('tous')
    setCurrentRadius(EVENTS.DEFAULT_RADIUS)
    loadUserPosition()

    // Recharger les événements par défaut
    const today = new Date()
    const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
    setCurrentStartDate(start)
    setCurrentEndDate(end)
    setLoading(true)

    // On attend que loadUserPosition mette à jour userPosition, mais comme c'est asynchrone,
    // on relance loadEvents dans le callback de geolocation ou via un useEffect.
    // Ici, loadUserPosition va déclencher un refresh via ses propres setters si besoin,
    // mais pour être sûr, on peut recharger avec "undefined" position qui forcera l'usage du state ou fallback
    loadEvents(start, end, false, 'tous', EVENTS.DEFAULT_RADIUS)
      .then((data) => {
        setFilteredEvents(data)
        setGroupedEvents(groupEventsByDay(data))
        setLoading(false)
      })
  }

  // Fonction de recherche et filtrage
  const handleSearch = (
    searchTerm: string,
    radius: number,
    eventType: string,
    coordinates?: { latitude: number; longitude: number; city: string }
  ) => {
    setCurrentRadius(radius)
    setCurrentEventType(eventType)

    // Si des coordonnées sont fournies (géocodage réussi), mettre à jour la position et la ville
    if (coordinates) {
      setUserPosition({ latitude: coordinates.latitude, longitude: coordinates.longitude })
      setCity(coordinates.city)
      updateSeoTitle(coordinates.city, eventType, radius, undefined, true)
    } else if (searchTerm === '' && !coordinates) {
      // Si recherche vide, on reset potentiellement si c'était l'intention
      // Mais ici on garde la position actuelle si on change juste le type ou le rayon
      // Si on veut reset la position quand on vide le champ, il faut utiliser handleReset via le prop onReset du SearchBar
      updateSeoTitle(city || 'autour de moi', eventType, radius)
    } else {
      updateSeoTitle(city || 'autour de moi', eventType, radius)
    }

    // Utiliser le rayon spécifié
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

    // Passer le type d'événement, le rayon personnalisé et la position à l'API
    loadEvents(start, end, false, eventType, searchRadius, positionToUse)
      .then((data: Event[]) => {
        let filtered = [...data]

        // Filtre par nom, ville ou code postal (côté client) si recherche textuelle
        // Note: si coordinates est présent, c'est qu'on a géocodé le terme, donc on ne filtre plus par texte
        // Si coordinates est absent mais qu'il y a un searchTerm, c'est une recherche textuelle pure
        if (searchTerm.trim() && !coordinates) {
          const searchLower = searchTerm.toLowerCase()
          filtered = filtered.filter(
            event =>
              event.name.toLowerCase().includes(searchLower) ||
              (event.city && event.city.toLowerCase().includes(searchLower)) ||
              (event.postalCode && event.postalCode.includes(searchTerm))
          )
        }

        setFilteredEvents(filtered)
        const grouped = groupEventsByDay(filtered)
        setGroupedEvents(grouped)
        setLoading(false)
        setHasMoreEvents(data.length > 0)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
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

  // Construction du fil d'ariane
  const breadcrumbsItems: { label: string; path?: string; onClick?: () => void }[] = [
    { label: 'Accueil', path: '/', onClick: handleReset }
  ]

  if (regionSlug && geoData) {
    const region = geoData.regions.find(r => r.slug === regionSlug)
    if (region) {
      breadcrumbsItems.push({ label: region.name, path: `/vide-grenier/region/${region.slug}` })
    }
  } else if (departmentCode && geoData) {
    const dept = geoData.departments.find(d => d.code === departmentCode)
    if (dept) {
      // Ajouter la région parente
      const region = geoData.regions.find(r => r.code === dept.region)
      if (region) {
        breadcrumbsItems.push({ label: region.name, path: `/vide-grenier/region/${region.slug}` })
      }
      breadcrumbsItems.push({ label: `${dept.code} - ${dept.name}`, path: `/vide-grenier/${dept.code}` })
    }
  } else if (citySlug && geoData) {
    const cityData = geoData.cities.find(c => c.slug === citySlug)
    if (cityData) {
      // Trouver le département de la ville
      const dept = geoData.departments.find(d => d.code === cityData.department)
      if (dept) {
        // Ajouter la région
        const region = geoData.regions.find(r => r.code === dept.region)
        if (region) {
          breadcrumbsItems.push({ label: region.name, path: `/vide-grenier/region/${region.slug}` })
        }
        // Ajouter le département
        breadcrumbsItems.push({ label: `${dept.code} - ${dept.name}`, path: `/vide-grenier/${dept.code}` })
      }
      // Ajouter la ville
      breadcrumbsItems.push({ label: cityData.name, path: `/brocantes/${cityData.slug}` })
    }
  } else if (city && !locationLoading) {
    // Si on est géolocalisé ou recherche manuelle sans URL
    breadcrumbsItems.push({ label: city })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SearchBar
        onSearch={handleSearch}
        onRadiusChange={setCurrentRadius}
        onReset={handleReset}
        geoData={geoData}
        events={events}
      />

      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbsItems} />

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
        {!locationLoading && (
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {seoTitle}
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
                      className={`px-8 py-3 rounded-lg font-semibold transition-colors ${loadingMore
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
