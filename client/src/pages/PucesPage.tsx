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

export default function PucesPage() {
    const [events, setEvents] = useState<Event[]>([])
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
    const [groupedEvents, setGroupedEvents] = useState<GroupedEvents[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
    const [city, setCity] = useState<string>('')
    const [currentRadius, setCurrentRadius] = useState<number>(EVENTS.DEFAULT_RADIUS)
    const [currentEndDate, setCurrentEndDate] = useState<Date | null>(null)
    const [hasMoreEvents, setHasMoreEvents] = useState(true)
    const lastRequestId = useRef<number>(0)

    const testPositionFallback: UserPosition = {
        latitude: GEOLOCATION.DEFAULT_LAT,
        longitude: GEOLOCATION.DEFAULT_LON
    }

    useEffect(() => {
        document.title = 'Marchés aux Puces autour de moi - Trouvailles - GoChineur'
        const metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Agenda complet des marchés aux puces en France. Trouvez les meilleurs marchés aux puces et ventes d\'antiquités près de chez vous.')
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
            eventType: 'Puces et Antiquités'
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
        eventType: string,
        coordinates?: { latitude: number; longitude: number; city: string }
    ) => {
        setCurrentRadius(radius)

        if (coordinates) {
            setUserPosition({ latitude: coordinates.latitude, longitude: coordinates.longitude })
            setCity(coordinates.city)
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
        { label: 'Marchés aux Puces' }
    ]

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <SearchBar
                onSearch={handleSearch}
                onRadiusChange={setCurrentRadius}
                onReset={() => setCity('')}
                geoData={null}
                events={events}
                currentRadius={currentRadius}
            />

            <div className="container mx-auto px-4 py-6">
                <Breadcrumbs items={breadcrumbsItems} />

                <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
                    Marchés aux Puces : Trouvailles et Antiquités autour de moi
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
                                        const h2Label = isToday ? 'Marchés aux puces aujourd\'hui' : group.label

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
                            Le marché aux puces est l'incontournable de la chine urbaine. GoChineur référence les grandes braderies et les marchés aux puces qui mélangent souvent professionnels et particuliers. Parfait pour une chine intensive et décontractée ! Notre agenda vous affiche tous les événements ouverts ce week-end. Trouvez facilement les puces près de chez vous pour dénicher des antiquités et des objets vintage. Notre outil de carte vous guide directement vers les meilleurs spots. Découvrez aussi nos <Link to="/bourse/" className="text-primary hover:text-primary-hover underline">bourses thématiques</Link> pour des recherches spécifiques.
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
                        <Link to="/brocante/" className="block p-4 bg-background-lighter hover:bg-background-hover border border-gray-800 hover:border-primary rounded-lg transition-all group">
                            <span className="text-primary group-hover:text-primary-hover font-semibold">🏺</span>
                            <span className="ml-2 text-text-primary group-hover:text-primary">Agenda Brocantes</span>
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
