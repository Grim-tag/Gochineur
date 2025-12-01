import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
import type { Event } from '../types'
import { fetchMyEvents, cancelEvent, deleteAccount } from '../services/api'
import { fetchEvents } from '../services/api'
import {
    calculateDistance,
    generateEventNavigationUrl,
    cleanExpiredEventsFromCircuit
} from '../utils/appUtils'
import { checkAuth, logout, type User } from '../utils/authUtils'
import Breadcrumbs from '../components/Breadcrumbs'
import toast from 'react-hot-toast'

// Fix pour les icônes par défaut de Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface UserPosition {
    latitude: number
    longitude: number
}

export default function MyAccountPage() {
    const navigate = useNavigate()
    const [user, setUser] = useState<User | null>(null)
    const [loadingAuth, setLoadingAuth] = useState(true)

    // États pour "Mes Événements"
    const [myEvents, setMyEvents] = useState<Event[]>([])
    const [loadingMyEvents, setLoadingMyEvents] = useState(false)
    const [totalMyEvents, setTotalMyEvents] = useState(0)
    const [hasMoreMyEvents, setHasMoreMyEvents] = useState(false)
    const [loadingMoreMyEvents, setLoadingMoreMyEvents] = useState(false)

    // États pour "Mon Circuit"
    const [circuitEvents, setCircuitEvents] = useState<Event[]>([])
    const [loadingCircuit, setLoadingCircuit] = useState(true)
    const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null)

    const testPosition: UserPosition = {
        latitude: 43.5716,
        longitude: -1.2780
    }

    // 1. Vérifier l'authentification et charger les événements initiaux
    useEffect(() => {
        checkAuth().then(({ authenticated, user }) => {
            if (!authenticated || !user) {
                navigate('/')
                return
            }
            setUser(user)
            setLoadingAuth(false)

            // Charger les événements créés par l'utilisateur (3 premiers)
            setLoadingMyEvents(true)
            fetchMyEvents(1, 3)
                .then(data => {
                    if (Array.isArray(data)) {
                        setMyEvents(data)
                        setTotalMyEvents(data.length)
                        setHasMoreMyEvents(false)
                    } else {
                        setMyEvents(data.events)
                        setTotalMyEvents(data.totalCount)
                        setHasMoreMyEvents(data.events.length < data.totalCount)
                    }
                })
                .catch(err => console.error('Erreur chargement mes événements:', err))
                .finally(() => setLoadingMyEvents(false))
        })
    }, [navigate])

    // Fonction pour charger plus d'événements
    const handleLoadMoreMyEvents = () => {
        if (loadingMoreMyEvents) return

        setLoadingMoreMyEvents(true)

        // On recharge tout avec une limite augmentée
        fetchMyEvents(1, myEvents.length + 12)
            .then(data => {
                if (!Array.isArray(data)) {
                    setMyEvents(data.events)
                    setTotalMyEvents(data.totalCount)
                    setHasMoreMyEvents(data.events.length < data.totalCount)
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingMoreMyEvents(false))
    }

    // 2. Géolocalisation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserPosition({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    })
                },
                () => {
                    setUserPosition(testPosition)
                }
            )
        } else {
            setUserPosition(testPosition)
        }
    }, [])

    // 3. Charger le circuit
    useEffect(() => {
        const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
        setCircuitIds(circuit)

        if (circuit.length === 0) {
            setLoadingCircuit(false)
            return
        }

        const position = userPosition || testPosition

        fetchEvents({
            lat: position.latitude,
            lon: position.longitude,
            radius: 2000,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        })
            .then((allEvents: Event[]) => {
                // 🧹 Nettoyer les événements expirés (après 22h le jour même)
                const cleanedCircuit = cleanExpiredEventsFromCircuit(circuit, allEvents)

                // Mettre à jour les IDs si le nettoyage a retiré des événements
                if (cleanedCircuit.length !== circuit.length) {
                    setCircuitIds(cleanedCircuit)
                }

                let eventsInCircuit = allEvents.filter(event => cleanedCircuit.includes(event.id))

                eventsInCircuit = eventsInCircuit.map(event => {
                    const distance = calculateDistance(
                        position.latitude,
                        position.longitude,
                        event.latitude,
                        event.longitude
                    )
                    return { ...event, distance: Math.round(distance * 10) / 10 }
                })

                eventsInCircuit.sort((a, b) => {
                    const dateA = new Date(a.date_debut || a.date).getTime()
                    const dateB = new Date(b.date_debut || b.date).getTime()
                    if (dateA !== dateB) return dateA - dateB
                    return (a.distance || 0) - (b.distance || 0)
                })

                setCircuitEvents(eventsInCircuit)
                setLoadingCircuit(false)
            })
            .catch(err => {
                console.error('Erreur circuit:', err)
                setLoadingCircuit(false)
            })
    }, [userPosition])

    // Actions du compte
    const handleLogout = () => {
        logout()
        navigate('/')
    }

    const handleDeleteAccount = async () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible. Vos événements publiés resteront visibles.')) {
            try {
                await deleteAccount()
                logout()
                toast.success('Votre compte a été supprimé.')
                navigate('/')
            } catch (error) {
                console.error('Erreur suppression compte:', error)
                toast.error('Une erreur est survenue lors de la suppression du compte.')
            }
        }
    }

    const handleCancelEvent = async (eventId: string | number) => {
        if (confirm('Êtes-vous sûr de vouloir annuler cet événement ? Il sera marqué comme annulé mais restera visible.')) {
            try {
                await cancelEvent(eventId.toString())
                // Rafraîchir la liste en gardant le nombre actuel
                fetchMyEvents(1, myEvents.length).then(data => {
                    if (!Array.isArray(data)) {
                        setMyEvents(data.events)
                        setTotalMyEvents(data.totalCount)
                    }
                })
            } catch (error) {
                console.error('Erreur annulation événement:', error)
                toast.error('Erreur lors de l\'annulation de l\'événement')
            }
        }
    }

    // Actions du circuit
    const handleRemoveFromCircuit = (eventId: string | number) => {
        const newCircuit = circuitIds.filter(id => id !== eventId)
        localStorage.setItem('gochineur-circuit', JSON.stringify(newCircuit))
        setCircuitIds(newCircuit)
        setCircuitEvents(circuitEvents.filter(event => event.id !== eventId))
    }

    const handleClearCircuit = () => {
        if (confirm('Vider votre circuit ?')) {
            localStorage.removeItem('gochineur-circuit')
            setCircuitIds([])
            setCircuitEvents([])
        }
    }


    const navigateToEvent = (event: Event) => {
        if (!userPosition) return
        const url = generateEventNavigationUrl(userPosition, event)
        if (url) window.open(url, '_blank')
    }

    if (loadingAuth) {
        return <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    }

    const mapCenter: [number, number] = userPosition ? [userPosition.latitude, userPosition.longitude] : [testPosition.latitude, testPosition.longitude];

    return (
        <div className="min-h-screen bg-background pb-12">
            <Header />

            {/* Header Compte */}
            <div className="bg-background-paper shadow-lg border-b border-gray-700">
                <div className="container mx-auto px-4 py-6">
                    <Breadcrumbs items={[
                        { label: 'Accueil', path: '/' },
                        { label: 'Mon Compte' }
                    ]} />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">Mon Compte</h1>
                            <div className="mt-2 text-text-secondary">
                                <p><span className="font-semibold">Pseudo:</span> {user?.displayName}</p>
                                <p><span className="font-semibold">Email:</span> {user?.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 border border-gray-600 rounded-lg text-text-primary hover:bg-background-lighter transition-colors"
                            >
                                Me déconnecter
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-800 rounded-lg hover:bg-red-900/50 transition-colors"
                            >
                                Supprimer mon compte
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 space-y-8 mt-8">

                {/* Section Mon Circuit */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                            🗺️ Mon Circuit
                        </h2>
                        {circuitEvents.length > 0 && (
                            <button
                                onClick={handleClearCircuit}
                                className="text-red-400 hover:text-red-300 text-sm font-semibold"
                            >
                                Vider le circuit
                            </button>
                        )}
                    </div>

                    {!loadingCircuit && circuitEvents.length === 0 ? (
                        <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-8 text-center">
                            <p className="text-text-muted mb-4">Votre circuit est vide.</p>
                            <Link
                                to="/"
                                className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/20"
                            >
                                Rechercher des événements
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Carte */}
                            <div className="lg:w-2/3 h-[500px] bg-background-paper rounded-lg shadow-lg border border-gray-700 overflow-hidden">
                                <MapContainer
                                    center={mapCenter}
                                    zoom={9}
                                    style={{ height: '100%', width: '100%' }}
                                    className="leaflet-container"
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    {userPosition && (
                                        <Marker position={[userPosition.latitude, userPosition.longitude]}>
                                            <Popup>Votre position</Popup>
                                        </Marker>
                                    )}
                                    {circuitEvents.map(event => (
                                        <Marker
                                            key={event.id}
                                            position={[event.latitude, event.longitude]}
                                        >
                                            <Popup>
                                                <div className="p-2">
                                                    <h3 className="font-bold">{event.name}</h3>
                                                    <p className="text-sm">{event.city}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                    {circuitEvents.length > 0 && (
                                        <Polyline
                                            positions={
                                                (userPosition
                                                    ? [[userPosition.latitude, userPosition.longitude], ...circuitEvents.map(e => [e.latitude, e.longitude])]
                                                    : circuitEvents.map(e => [e.latitude, e.longitude])) as [number, number][]
                                            }
                                            color="#e65100"
                                        />
                                    )}
                                </MapContainer>
                            </div>

                            {/* Liste des étapes */}
                            <div className="lg:w-1/3 space-y-4">
                                <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-4">
                                    <h3 className="font-bold text-lg mb-4 text-primary">Étapes du circuit</h3>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                        {circuitEvents.map((event, index) => (
                                            <div key={event.id} className="flex items-start gap-3 p-3 bg-background rounded border border-gray-700">
                                                <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-text-primary truncate">{event.name}</h4>
                                                    <p className="text-sm text-text-secondary">{event.city} ({event.postalCode})</p>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-xs text-text-muted">
                                                            {event.distance ? `${event.distance} km` : ''}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => navigateToEvent(event)}
                                                                className="text-xs text-primary hover:underline"
                                                            >
                                                                Y aller
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveFromCircuit(event.id)}
                                                                className="text-xs text-red-400 hover:underline"
                                                            >
                                                                Retirer
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Section Mes Événements */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                            📅 Mes Événements <span className="text-sm font-normal text-text-muted">({totalMyEvents})</span>
                        </h2>
                        <Link
                            to="/soumettre"
                            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/20 text-sm font-semibold"
                        >
                            + Ajouter un événement
                        </Link>
                    </div>

                    {loadingMyEvents ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : myEvents.length === 0 ? (
                        <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-8 text-center">
                            <p className="text-text-muted mb-4">Vous n'avez pas encore soumis d'événements.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {myEvents.map(event => (
                                    <div key={event.id} className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-4 hover:border-primary transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-text-primary truncate pr-2">{event.name}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${event.cancelled ? 'bg-red-900/30 text-red-400 border border-red-800' :
                                                    ['published', 'validé', 'publie', 'Published', 'Validé'].includes(event.statut_validation || '') ? 'bg-green-900/30 text-green-400 border border-green-800' :
                                                        event.statut_validation === 'rejected' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                                                            'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                                                }`}>
                                                {event.cancelled ? 'Annulé' :
                                                    ['published', 'validé', 'publie', 'Published', 'Validé'].includes(event.statut_validation || '') ? 'Validé' :
                                                        event.statut_validation === 'rejected' ? 'Refusé' : 'En attente'}
                                            </span>
                                        </div>

                                        <div className="space-y-1 text-sm text-text-secondary mb-4">
                                            <p>📍 {event.city} ({event.postalCode})</p>
                                            <p>📅 {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                                            <Link
                                                to={`/event/${event.id}`}
                                                className="text-sm text-primary hover:text-primary-hover"
                                            >
                                                Voir
                                            </Link>
                                            {!event.cancelled && (
                                                <button
                                                    onClick={() => handleCancelEvent(event.id)}
                                                    className="text-sm text-red-400 hover:text-red-300"
                                                >
                                                    Annuler
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {hasMoreMyEvents && (
                                <div className="flex justify-center mt-6">
                                    <button
                                        onClick={handleLoadMoreMyEvents}
                                        disabled={loadingMoreMyEvents}
                                        className="px-6 py-2 bg-background-paper border border-gray-600 rounded-lg text-text-primary hover:bg-background-lighter transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loadingMoreMyEvents ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                Chargement...
                                            </>
                                        ) : (
                                            'Charger plus d\'événements'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>

            </div>
            <Footer />
        </div>
    )
}
