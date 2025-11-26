import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import EventCard from '../components/EventCard'
import Breadcrumbs from '../components/Breadcrumbs'
import Header from '../components/Header'
import type { Event } from '../types'
import { groupEventsByDay, type GroupedEvents } from '../utils/appUtils'
import { calculatePeriodDates } from '../utils/dateUtils'
import { fetchEvents } from '../services/api'
import { EVENTS, GEOLOCATION } from '../config/constants'

interface UserPosition {
    latitude: number
    longitude: number
}

export default function BrocantePage() {
    const [events, setEvents] = useState<Event[]>([])
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
    const [groupedEvents, setGroupedEvents] = useState<GroupedEvents[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null)

    const [currentRadius, setCurrentRadius] = useState<number>(EVENTS.DEFAULT_RADIUS)
    const [currentEndDate, setCurrentEndDate] = useState<Date | null>(null)
    const [hasMoreEvents, setHasMoreEvents] = useState(true)
    const lastRequestId = useRef<number>(0)

    const testPositionFallback: UserPosition = {
        latitude: GEOLOCATION.DEFAULT_LAT,
        longitude: GEOLOCATION.DEFAULT_LON
    }

    useEffect(() => {
        document.title = 'Brocantes et Antiquités autour de moi - GoChineur'
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Découvrez toutes les brocantes et foires aux antiquités près de chez vous. Agenda complet des brocantes en France pour les passionnés de chine.')
        }
    }, [])

    useEffect(() => {
        const loadCircuit = () => {
            const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
            setCircuitIds(circuit)
        }
        loadCircuit()
        window.addEventListener('storage', loadCircuit)
        return () => window.removeEventListener('storage', loadCircuit)
    }, [])

    const loadEvents = async (
        startDate: Date,
        endDate: Date,
        append: boolean = false,
        customRadius?: number,
        customPosition?: UserPosition
    ): Promise<Event[]> => {
        if (!append) {
            lastRequestId.current = Date.now()
        }
        const currentRequestId = lastRequestId.current

        const position = customPosition || userPosition || testPositionFallback
        const radiusToUse = customRadius !== undefined ? customRadius : currentRadius

        const data = await fetchEvents({
            lat: position.latitude,
            lon: position.longitude,
            radius: radiusToUse,
            startDate,
            endDate,
            eventType: 'Brocante'
        })

        if (lastRequestId.current !== currentRequestId) {
            return []
        }

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

    useEffect(() => {
        const today = new Date()
        const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
        setCurrentEndDate(end)
        setLoading(true)

        loadEvents(start, end, false, currentRadius, testPositionFallback)
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
    }, [])

    useEffect(() => {
        setFilteredEvents(events)
        const grouped = groupEventsByDay(events)
        setGroupedEvents(grouped)
    }, [events])

    const handleLoadMore = async () => {
        if (!currentEndDate || loadingMore) return

        setLoadingMore(true)
        const nextStartDate = new Date(currentEndDate)
        nextStartDate.setDate(nextStartDate.getDate() + 1)
        nextStartDate.setHours(0, 0, 0, 0)

        const { start, end } = calculatePeriodDates(nextStartDate)

        try {
            const newEvents = await loadEvents(start, end, true)
            setCurrentEndDate(end)
            setHasMoreEvents(newEvents.length > 0)

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

    const handleSearch = (
        searchTerm: string,
        radius: number,
        _eventType: string,
        coordinates?: { latitude: number; longitude: number; city: string }
    ) => {
        setCurrentRadius(radius)

        if (coordinates) {
            setUserPosition({ latitude: coordinates.latitude, longitude: coordinates.longitude })
            
        }

        const today = new Date()
        const { start, end } = calculatePeriodDates(today, EVENTS.PERIOD_MONTHS)
        setCurrentEndDate(end)
        setLoading(true)

        const positionToUse = coordinates
            ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
            : (userPosition || testPositionFallback)

        loadEvents(start, end, false, radius, positionToUse)
            .then((data: Event[]) => {
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

    const handleAddToCircuit = (eventId: string | number) => {
        const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
        if (!circuit.includes(eventId)) {
            const newCircuit = [...circuit, eventId]
            localStorage.setItem('gochineur-circuit', JSON.stringify(newCircuit))
            setCircuitIds(newCircuit)
        }
    }

    const breadcrumbsItems = [
        { label: 'Accueil', path: '/' },
        { label: 'Brocantes' }
    ]

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <SearchBar
                onSearch={handleSearch}
                onRadiusChange={setCurrentRadius}
                onReset={() => {}}
                geoData={null}
                events={events}
                currentRadius={currentRadius}
            />

            <div className="container mx-auto px-4 py-6">
                <Breadcrumbs items={breadcrumbsItems} />

                <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
                    Brocantes et Antiquités : Où chiner autour de moi ?
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
                                {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} trouvé{filteredEvents.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        {filteredEvents.length > 0 && groupedEvents.length > 0 ? (
                            <>
                                <div className="space-y-8">
                                    {groupedEvents.map((group) => {
                                        const isToday = group.label === 'Aujourd\'hui'
                                        const h2Label = isToday ? 'Brocantes aujourd\'hui' : group.label

                                        return (
                                            <div key={group.date}>
                                                <h2 className="text-xl font-bold text-text-primary mb-4 pb-2 border-b border-gray-700 flex items-center gap-2">
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
                                    Essayez de modifier vos critères de recherche ou d'augmenter le rayon de recherche.
                                </p>
                            </div>
                        )}
                    </>
                )}

                <section className="mt-16 mb-8 px-4 py-8 bg-background-lighter rounded-lg border border-gray-800">
                    <div className="max-w-4xl mx-auto">
                        <p className="text-text-secondary leading-relaxed text-sm md:text-base">
                            Pour les collectionneurs et les passionnés de belles pièces, GoChineur est le guide indispensable des brocantes et salons d'antiquaires. Contrairement au vide-grenier de quartier, la brocante est l'endroit idéal pour dénicher du mobilier ancien et des objets de valeur. Notre agenda vous permet de localiser les événements de qualité autour de moi et dans les grandes villes. Utilisez nos filtres pour trouver le prochain marché professionnel où vous ferez des trouvailles d'exception. Vous cherchez une vente plus décontractée ? Consultez notre <Link to="/vide-grenier/" className="text-primary hover:text-primary-hover underline">agenda vide-greniers</Link>.
                        </p>
                    </div>
                </section>

                <section className="mt-8 mb-12">
                    <h2 className="text-xl font-bold text-text-primary mb-4 text-center">
                        Découvrez nos autres agendas
                    </h2>
                    <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                        <Link to="/vide-grenier/" className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group">
                            <span className="text-primary group-hover:text-primary-hover font-semibold">📦</span>
                            <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Vide-Greniers</span>
                        </Link>
                        <Link to="/puces/" className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group">
                            <span className="text-primary group-hover:text-primary-hover font-semibold">🛍️</span>
                            <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Marchés aux Puces</span>
                        </Link>
                        <Link to="/bourse/" className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group">
                            <span className="text-primary group-hover:text-primary-hover font-semibold">🎯</span>
                            <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Bourses aux Objets</span>
                        </Link>
                        <Link to="/vide-maison/" className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group">
                            <span className="text-primary group-hover:text-primary-hover font-semibold">🏠</span>
                            <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Vide-Maisons</span>
                        </Link>
                        <Link to="/troc/" className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group">
                            <span className="text-primary group-hover:text-primary-hover font-semibold">🔄</span>
                            <span className="ml-2 text-text-primary group-hover:text-primary">Événements Troc et Échange</span>
                        </Link>
                    </nav>
                </section>
            </div>
        </div>
    )
}
