import { useState, useRef } from 'react'
import { Event, UserPosition } from '../types'
import { groupEventsByDay, GroupedEvents } from '../utils/appUtils'
import { calculatePeriodDates } from '../utils/dateUtils'
import { fetchEvents } from '../services/api'
import { EVENTS, GEOLOCATION } from '../config/constants'

export const useEventSearch = (initialEventType: string = 'tous') => {
    const [events, setEvents] = useState<Event[]>([])
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
    const [groupedEvents, setGroupedEvents] = useState<GroupedEvents[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasMoreEvents, setHasMoreEvents] = useState(true)
    const [currentStartDate, setCurrentStartDate] = useState<Date | null>(null)
    const [currentEndDate, setCurrentEndDate] = useState<Date | null>(null)

    const lastRequestId = useRef<number>(0)

    // Coordonnées de test (Landes/Pays Basque Sud)
    const testPositionFallback: UserPosition = {
        latitude: GEOLOCATION.DEFAULT_LAT,
        longitude: GEOLOCATION.DEFAULT_LON
    }

    // Fonction pour charger les événements avec une période donnée
    const loadEvents = async (
        startDate: Date,
        endDate: Date,
        append: boolean = false,
        eventType?: string,
        customRadius?: number,
        customPosition?: UserPosition,
        userPosition?: UserPosition | null,
        currentRadius?: number
    ): Promise<Event[]> => {
        // Gestion des race conditions : si c'est une nouvelle recherche (!append), on incrémente l'ID
        if (!append) {
            lastRequestId.current = Date.now()
        }
        const currentRequestId = lastRequestId.current

        // Déterminer la position à utiliser
        // Priorité : customPosition > userPosition > testPositionFallback
        const position = customPosition || userPosition || testPositionFallback

        // Déterminer le rayon à utiliser
        const radiusToUse = customRadius !== undefined ? customRadius : (currentRadius || EVENTS.DEFAULT_RADIUS)

        // Déterminer le type à utiliser
        const typeToUse = eventType === 'tous' ? undefined : eventType

        try {
            const data = await fetchEvents({
                lat: position.latitude,
                lon: position.longitude,
                radius: radiusToUse,
                startDate,
                endDate,
                eventType: typeToUse
            })

            // Si une nouvelle recherche a été lancée entre temps, on ignore ce résultat
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
        } catch (err: any) {
            // Si c'est une erreur de requête annulée ou autre, on la propage ou on la gère
            throw err
        }
    }

    // Fonction pour charger plus d'événements (2 mois suivants)
    const handleLoadMore = async (currentEventType: string, currentRadius: number, userPosition: UserPosition | null) => {
        if (!currentEndDate || loadingMore) return

        setLoadingMore(true)

        // Calculer la nouvelle période (2 mois à partir de la fin actuelle)
        const nextStartDate = new Date(currentEndDate)
        nextStartDate.setDate(nextStartDate.getDate() + 1) // Jour suivant
        nextStartDate.setHours(0, 0, 0, 0)

        const { start, end } = calculatePeriodDates(nextStartDate)

        try {
            const newEvents = await loadEvents(
                start,
                end,
                true,
                currentEventType,
                currentRadius,
                undefined,
                userPosition,
                currentRadius
            )

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

    return {
        events,
        filteredEvents,
        groupedEvents,
        loading,
        loadingMore,
        error,
        hasMoreEvents,
        currentStartDate,
        currentEndDate,
        setCurrentStartDate,
        setCurrentEndDate,
        loadEvents,
        handleLoadMore,
        setEvents,
        setFilteredEvents,
        setGroupedEvents,
        setLoading,
        setError,
        setHasMoreEvents
    }
}
