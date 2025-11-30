import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import EventCard from '../components/EventCard'
import Breadcrumbs from '../components/Breadcrumbs'
import Header from '../components/Header'
import toast from 'react-hot-toast'
import { groupEventsByDay } from '../utils/appUtils'
import { calculatePeriodDates } from '../utils/dateUtils'
import { EVENTS } from '../config/constants'
import { CATEGORY_CONFIG } from '../config/seoConfig'
import { useGeoData } from '../hooks/useGeoData'
import { useSEO } from '../hooks/useSEO'
import { useEventSearch } from '../hooks/useEventSearch'
import type { Event as AppEvent } from '../types'
import { UserPosition } from '../types'
import { getUserLocation } from '../utils/locationStorage'
import { checkAuth } from '../utils/authUtils'

interface HomePageProps {
  regionSlugOverride?: string
}

export default function HomePage({ regionSlugOverride }: HomePageProps) {
  const location = useLocation()
  const params = useParams<{
    category?: string;
    regionSlug?: string;
    departmentSlug?: string;
    param?: string;
  }>()

  const { category, departmentSlug, param } = params
  const regionSlug = regionSlugOverride || params.regionSlug

  // Hooks
  const { geoData } = useGeoData()
  const { seoTitle, setSeoTitle, updateSeoTitle } = useSEO(category)

  // Déterminer le type d'événement depuis la catégorie URL
  const categoryConfig = category ? CATEGORY_CONFIG[category] : null
  const initialEventType = categoryConfig ? categoryConfig.eventType : 'tous'

  const [currentEventType, setCurrentEventType] = useState<string>(initialEventType)
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [city, setCity] = useState<string>('')
  const [currentRadius, setCurrentRadius] = useState<number>(100)
  const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])

  const prevRadius = useRef<number>(100)

  const {
    events,
    filteredEvents,
    groupedEvents,
    loading,
    loadingMore,
    error,
    hasMoreEvents,
    currentEndDate,
    setCurrentStartDate,
    setCurrentEndDate,
    loadEvents,
    handleLoadMore: loadMoreEvents,
    setFilteredEvents,
    setGroupedEvents,
    setLoading,
    setError,
    setHasMoreEvents
  } = useEventSearch(initialEventType)

  // Appliquer le SEO thématique au chargement de la page
  useEffect(() => {
    if (category && CATEGORY_CONFIG[category]) {
      const config = CATEGORY_CONFIG[category]
      setCurrentEventType(config.eventType)
    } else if (!category && !regionSlug && !departmentSlug && !param) {
      // Page d'accueil par défaut
      setCurrentEventType('tous')
    }
  }, [category, regionSlug, departmentSlug, param])

  // Gérer les paramètres d'URL pour le SEO (Région, Département ou Ville)
  useEffect(() => {
    if (!geoData) return

    const handleUrlParams = async () => {
      let targetLat: number | null = null
      let targetLon: number | null = null
      let targetName = ''
      let targetRadius: number = EVENTS.DEFAULT_RADIUS
      let deptCodeStr = ''

      if (param && departmentSlug) {
        // Vérifier d'abord si les données de la ville sont passées via navigate state
        let cityData = (location.state as any)?.cityData

        if (!cityData) {
          cityData = geoData.cities.find(c => c.slug === param)
        }

        if (cityData) {
          targetLat = cityData.lat
          targetLon = cityData.lon
          targetName = cityData.name
          targetRadius = 30
          updateSeoTitle(targetName, currentEventType, targetRadius, undefined, true)
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) metaDesc.setAttribute('content', `Les meilleurs vide-greniers et brocantes à ${cityData.name} et aux alentours. Dates, horaires et infos pratiques pour chiner malin.`)
        }
      } else if (departmentSlug && !param) {
        const dept = geoData.departments.find(d => d.slug === departmentSlug)
        if (dept) {
          targetLat = dept.lat
          targetLon = dept.lon
          targetName = dept.name
          deptCodeStr = dept.code
          targetRadius = 50
          updateSeoTitle(targetName, currentEventType, targetRadius, deptCodeStr, false)
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) metaDesc.setAttribute('content', `Trouvez tous les vide-greniers, brocantes et bourses aux collections dans le département ${dept.name} (${dept.code}). Agenda complet et à jour.`)
        }
      } else if (regionSlug) {
        const region = geoData.regions.find(r => r.slug === regionSlug)
        if (region) {
          targetLat = region.lat
          targetLon = region.lon
          targetName = region.name
          targetRadius = 100
          updateSeoTitle(targetName, currentEventType, targetRadius, undefined, false)
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) metaDesc.setAttribute('content', `Découvrez tous les vide-greniers, brocantes et bourses aux collections en ${region.name}. Agenda complet et à jour pour toute la région.`)
        }
      } else {
        setSeoTitle('Vide-greniers et brocantes l\'agenda des chineurs')
        document.title = 'Vide-greniers et brocantes l\'agenda des chineurs - GoChineur'
        setCity('')
      }

      if (targetLat && targetLon) {
        setUserPosition({ latitude: targetLat, longitude: targetLon })
        setCity(targetName)
        setCurrentRadius(targetRadius)

        const today = new Date()
        const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
        setCurrentStartDate(start)
        setCurrentEndDate(end)
        setLoading(true)

        loadEvents(start, end, false, undefined, targetRadius, { latitude: targetLat, longitude: targetLon })
          .then((data: AppEvent[]) => {
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
  }, [category, regionSlug, departmentSlug, param, geoData, location.pathname, currentEventType])

  // Charger les événements initiaux (2 premiers mois) - UNIQUEMENT SI PAS DE PARAMS URL
  useEffect(() => {
    if (regionSlug || departmentSlug || param) return

    const today = new Date()
    const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
    setCurrentStartDate(start)
    setCurrentEndDate(end)
    setLoading(true)

    // Check for saved location in localStorage
    const savedLocation = getUserLocation()

    if (savedLocation && savedLocation.type === 'gps') {
      // Restore saved GPS position
      console.log('📍 Restoring saved GPS position:', savedLocation.city)
      setUserPosition({
        latitude: savedLocation.latitude!,
        longitude: savedLocation.longitude!
      })
      setCurrentRadius(savedLocation.radius)
      prevRadius.current = savedLocation.radius
      setCity(savedLocation.city || '')

      // Load events with saved position
      loadEvents(start, end, false, initialEventType, savedLocation.radius, undefined, {
        latitude: savedLocation.latitude!,
        longitude: savedLocation.longitude!
      })
        .then((data: AppEvent[]) => {
          setFilteredEvents(data)
          const grouped = groupEventsByDay(data)
          setGroupedEvents(grouped)
          setLoading(false)
          setHasMoreEvents(data.length > 0)
        })
        .catch(err => {
          setError(err.message)
          setLoading(false)
          setFilteredEvents([])
          setGroupedEvents([])
        })
    } else {
      // No saved location - use default (Centre de la France)
      loadEvents(start, end, false, initialEventType, 100, undefined, null)
        .then((data: AppEvent[]) => {
          setFilteredEvents(data)
          const grouped = groupEventsByDay(data)
          setGroupedEvents(grouped)
          setLoading(false)
          setHasMoreEvents(data.length > 0)
        })
        .catch(err => {
          setError(err.message)
          setLoading(false)
          setFilteredEvents([])
          setGroupedEvents([])
        })
    }
  }, [regionSlug, departmentSlug, param])

  // Mettre à jour les événements filtrés quand la liste change
  useEffect(() => {
    setFilteredEvents(events)
    const grouped = groupEventsByDay(events)
    setGroupedEvents(grouped)
  }, [events])

  // Mettre à jour le H1 quand le rayon change
  useEffect(() => {
    if (city && currentRadius) {
      const isCity = geoData?.cities?.some(c => c.name === city)
      const dept = geoData?.departments?.find(d => d.name === city)

      if (isCity) {
        updateSeoTitle(city, currentEventType, currentRadius, undefined, true)
      } else if (dept) {
        updateSeoTitle(city, currentEventType, currentRadius, dept.code, false)
      }
    }
  }, [currentRadius, city, currentEventType, geoData])

  // Recharger les événements quand le rayon change
  useEffect(() => {
    if (currentRadius === prevRadius.current) return
    prevRadius.current = currentRadius

    if (currentRadius && currentEndDate) {
      const timeoutId = setTimeout(() => {
        setLoading(true)
        const today = new Date()
        const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)

        loadEvents(start, end, false, currentEventType, currentRadius, userPosition || undefined, userPosition)
          .then((data: AppEvent[]) => {
            if (data.length > 0 || filteredEvents.length === 0) {
              setFilteredEvents(data)
              const grouped = groupEventsByDay(data)
              setGroupedEvents(grouped)
              setHasMoreEvents(data.length > 0)
            }
            setLoading(false)
          })
          .catch(err => {
            setError(err.message)
            setLoading(false)
          })
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [currentRadius, param, departmentSlug, userPosition, currentEndDate, currentEventType])

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

  const handleLoadMore = () => {
    loadMoreEvents(currentEventType, currentRadius, userPosition)
  }

  const handleSearch = (
    searchTerm: string,
    radius: number,
    eventType: string,
    coordinates?: { latitude: number; longitude: number; city: string }
  ) => {
    setCurrentRadius(radius)
    // Prevent useEffect from triggering a redundant load
    prevRadius.current = radius
    setCurrentEventType(eventType)

    if (coordinates) {
      setUserPosition({ latitude: coordinates.latitude, longitude: coordinates.longitude })
      setCity(coordinates.city)
      updateSeoTitle(coordinates.city, eventType, radius, undefined, true)
    } else if (searchTerm === '' && !coordinates) {
      updateSeoTitle(city || 'autour de moi', eventType, radius)
    } else {
      updateSeoTitle(city || 'autour de moi', eventType, radius)
    }

    const today = new Date()
    const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
    setCurrentStartDate(start)
    setCurrentEndDate(end)
    setLoading(true)

    const positionToUse = coordinates
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
      : undefined

    console.log('🔍 handleSearch calling loadEvents', {
      searchTerm,
      radius,
      eventType,
      coordinates,
      positionToUse,
      userPosition
    })

    loadEvents(start, end, false, eventType, radius, positionToUse, userPosition)
      .then((data: AppEvent[]) => {
        let filtered = [...data]
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

  const handleAddToCircuit = async (eventId: string | number) => {
    const { authenticated } = await checkAuth()
    if (!authenticated) {
      toast.error("Connectez-vous pour ajouter des événements à votre liste")
      return
    }

    const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
    if (!circuit.includes(eventId)) {
      const newCircuit = [...circuit, eventId]
      localStorage.setItem('gochineur-circuit', JSON.stringify(newCircuit))
      setCircuitIds(newCircuit)
      toast.success("Événement ajouté à votre liste")
    }
  }

  const breadcrumbsItems: { label: string; path?: string; onClick?: () => void }[] = [
    { label: 'Accueil', path: '/' }
  ]

  const currentCategory = category || 'vide-grenier'

  if (regionSlug && geoData) {
    const region = geoData.regions.find(r => r.slug === regionSlug)
    if (region) {
      breadcrumbsItems.push({
        label: region.name,
        path: `/${currentCategory}/${region.slug}`
      })
      if (departmentSlug) {
        const dept = geoData.departments.find(d => d.slug === departmentSlug)
        if (dept) {
          breadcrumbsItems.push({
            label: `${dept.code} - ${dept.name}`,
            path: `/${currentCategory}/${region.slug}/${dept.slug}`
          })
          if (param) {
            const cityData = geoData.cities.find(c => c.slug === param)
            if (cityData) {
              breadcrumbsItems.push({
                label: cityData.name,
                path: `/${currentCategory}/${region.slug}/${dept.slug}/${cityData.slug}`
              })
            }
          }
        }
      }
    }
  } else if (city) {
    breadcrumbsItems.push({ label: city })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SearchBar
        onSearch={handleSearch}
        onRadiusChange={setCurrentRadius}
        onReset={() => {
          setCity('')
          setSeoTitle('Vide-greniers et brocantes l\'agenda des chineurs')
          document.title = 'Vide-greniers et brocantes l\'agenda des chineurs - GoChineur'
        }}
        geoData={geoData}
        events={events}
        currentRadius={currentRadius}
      />

      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbsItems} />

        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
          {seoTitle}
        </h1>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-text-secondary">Chargement des événements...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-400 font-semibold">Erreur</p>
            <p className="text-red-300 mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-text-secondary">
                {filteredEvents.length > 0 ? `${filteredEvents.length} événement${filteredEvents.length > 1 ? 's' : ''} trouvé${filteredEvents.length > 1 ? 's' : ''}` : ''}
              </p>
              {userPosition && (
                <p className="text-sm text-text-muted">
                  Filtrage par distance activé
                </p>
              )}
            </div>

            {import.meta.env.DEV && filteredEvents.length > 0 && (
              <div className="mb-4 p-2 bg-blue-900/20 border border-blue-800 rounded text-xs text-blue-400">
                <p>ℹ️ {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} affiché{filteredEvents.length > 1 ? 's' : ''} dans {groupedEvents.length} groupe{groupedEvents.length > 1 ? 's' : ''}</p>
              </div>
            )}

            {filteredEvents.length > 0 && groupedEvents.length > 0 ? (
              <>
                <div className="space-y-8">
                  {groupedEvents.map((group) => {
                    const isToday = group.label === 'Aujourd\'hui'
                    const h2Label = isToday ? 'Vide-greniers aujourd\'hui' : group.label

                    return (
                      <div key={group.date}>
                        <h2 className="text-xl font-bold text-text-primary mb-4 pb-2 border-b border-gray-700">
                          <span className="text-primary">📅</span> {h2Label}
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

                {hasMoreEvents && !loading && (
                  <div className="flex justify-center mt-8 mb-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className={`px-8 py-3 rounded-lg font-semibold transition-colors ${loadingMore
                        ? 'bg-background-lighter text-text-muted cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-orange-900/20'
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
                <p className="text-text-secondary text-lg font-semibold">Aucun événement trouvé</p>
                <p className="text-text-muted text-sm mt-2">
                  {filteredEvents.length === 0
                    ? 'Aucun événement ne correspond à vos critères de recherche.'
                    : 'Les événements trouvés ne peuvent pas être groupés par date.'}
                </p>
                <p className="text-text-muted text-sm mt-1">
                  Essayez de modifier vos critères de recherche ou d'augmenter le rayon de recherche.
                </p>
                {filteredEvents.length === 0 && !loading && import.meta.env.DEV && (
                  <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                    <p className="text-blue-400 text-sm font-semibold">💡 Information (Visible uniquement en DEV)</p>
                    <p className="text-blue-300 text-sm mt-1">
                      Si vous êtes administrateur, vérifiez que la base de données contient des événements.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <section className="mt-16 mb-8 px-4 py-8 bg-background-lighter rounded-lg border border-gray-800">
          <div className="max-w-4xl mx-auto">
            <p className="text-text-secondary leading-relaxed text-sm md:text-base">
              {category && CATEGORY_CONFIG[category]
                ? CATEGORY_CONFIG[category].seoText
                : "GoChineur est l'agenda complet et indispensable pour tous les passionnés de vide grenier et de brocante en France. Fini les recherches fastidieuses ! Notre plateforme vous permet de localiser instantanément les marchés aux puces et les bourses aux jouets ou vide maison les plus proches de vous, que vous cherchiez un événement aujourd'hui ou ce week-end. Grâce à notre outil de géolocalisation unique, trouvez rapidement les meilleures trouvailles autour de moi et planifiez votre circuit optimisé. Que vous soyez un chineur occasionnel à Paris, en Île-de-France ou dans les départements côtiers, GoChineur centralise toutes les informations de troc et de vente d'occasion pour vous faire gagner du temps. Votre chasse au trésor commence ici."
              }
            </p>
          </div>
        </section>

        <section className="mt-8 mb-12">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center">
            Découvrez nos agendas par type d'événement
          </h2>
          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <a
              href="/vide-grenier/"
              className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group"
              title="Agenda complet des vide-greniers en France"
            >
              <span className="text-primary group-hover:text-primary-hover font-semibold">📦</span>
              <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Vide-Greniers</span>
            </a>
            <a
              href="/brocante/"
              className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group"
              title="Agenda des brocantes et antiquités"
            >
              <span className="text-primary group-hover:text-primary-hover font-semibold">🏺</span>
              <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Brocantes</span>
            </a>
            <a
              href="/puces/"
              className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group"
              title="Marchés aux puces et braderies"
            >
              <span className="text-primary group-hover:text-primary-hover font-semibold">🏷️</span>
              <span className="ml-2 text-text-primary group-hover:text-primary">Marchés aux Puces</span>
            </a>
            <a
              href="/vide-maison/"
              className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group"
              title="Vide-maisons et ventes de succession"
            >
              <span className="text-primary group-hover:text-primary-hover font-semibold">🏠</span>
              <span className="ml-2 text-text-primary group-hover:text-primary">Vide-Maisons</span>
            </a>
            <a
              href="/bourse/"
              className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group"
              title="Bourses aux collections et jouets"
            >
              <span className="text-primary group-hover:text-primary-hover font-semibold">🧸</span>
              <span className="ml-2 text-text-primary group-hover:text-primary">Bourses aux Collections</span>
            </a>
            <a
              href="/troc/"
              className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group"
              title="Événements de troc et échange"
            >
              <span className="text-primary group-hover:text-primary-hover font-semibold">🔄</span>
              <span className="ml-2 text-text-primary group-hover:text-primary">Troc et Échange</span>
            </a>
          </nav>
        </section>
      </div>
    </div>
  )
}
