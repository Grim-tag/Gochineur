import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Event } from '../types'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateDistance, generateChronologicalCircuitUrl, generateEventNavigationUrl } from '../utils/appUtils'
import { fetchEvents, fetchMyEvents, deleteAccount, cancelEvent } from '../services/api'
import { checkAuth, logout, type User } from '../utils/authUtils'
import Breadcrumbs from '../components/Breadcrumbs'
import Header from '../components/Header'

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

    // États pour "Mon Circuit"
    const [circuitEvents, setCircuitEvents] = useState<Event[]>([])
    const [loadingCircuit, setLoadingCircuit] = useState(true)
    const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null)

    const testPosition: UserPosition = {
        latitude: 43.5716,
        longitude: -1.2780
    }

    // 1. Vérifier l'authentification
    useEffect(() => {
        checkAuth().then(({ authenticated, user }) => {
            if (!authenticated || !user) {
                navigate('/')
                return
            }
            setUser(user)
            setLoadingAuth(false)

            // Charger les événements créés par l'utilisateur
            setLoadingMyEvents(true)
            fetchMyEvents()
                .then(setMyEvents)
                .catch(err => console.error('Erreur chargement mes événements:', err))
                .finally(() => setLoadingMyEvents(false))
        })
    }, [navigate])

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
                let eventsInCircuit = allEvents.filter(event => circuit.includes(event.id))

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
                alert('Votre compte a été supprimé.')
                navigate('/')
            } catch (error) {
                console.error('Erreur suppression compte:', error)
                alert('Une erreur est survenue lors de la suppression du compte.')
            }
        }
    }

    const handleCancelEvent = async (eventId: string) => {
        if (confirm('Êtes-vous sûr de vouloir annuler cet événement ? Il sera marqué comme annulé mais restera visible.')) {
            try {
                await cancelEvent(eventId)
                // Rafraîchir la liste
                fetchMyEvents().then(setMyEvents)
            } catch (error) {
                console.error('Erreur annulation événement:', error)
                alert('Erreur lors de l\'annulation de l\'événement')
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

    const launchChronologicalCircuit = () => {
        if (!userPosition) return
        const url = generateChronologicalCircuitUrl(userPosition, circuitEvents)
        if (url) window.open(url, '_blank')
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
    const polylinePositions = userPosition ? [[userPosition.latitude, userPosition.longitude], ...circuitEvents.map(event => [event.latitude, event.longitude])] : circuitEvents.map(event => [event.latitude, event.longitude]);

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
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {userPosition && (
                                        <Marker position={[userPosition.latitude, userPosition.longitude]} icon={L.icon({
                                            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                                            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                                            iconSize: [25, 41],
                                            iconAnchor: [12, 41],
                                            popupAnchor: [1, -34],
                                            shadowSize: [41, 41]
                                        })}>
                                            <Popup>Votre position</Popup>
                                        </Marker>
                                    )}
                                    {circuitEvents.map((event) => (
                                        <Marker
                                            key={event.id}
                                            position={[event.latitude, event.longitude]}
                                        >
                                            <Popup>
                                                <div className="p-2">
                                                    <h3 className="font-bold text-lg text-primary">{event.name}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{event.city}</p>
                                                    <p className="text-sm mt-1">{new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                    {polylinePositions.length > 1 && (
                                        <Polyline positions={polylinePositions as L.LatLngExpression[]} color="#ff6b35" weight={3} />
                                    )}
                                </MapContainer>
                            </div>

                            {/* Liste Circuit */}
                            <div className="lg:w-1/3 flex flex-col gap-4 h-[500px] overflow-y-auto pr-2">
                                {userPosition && (
                                    <button
                                        onClick={launchChronologicalCircuit}
                                        className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 font-semibold shadow-lg shadow-orange-900/20 sticky top-0 z-10"
                                    >
                                        <span>▶️ Lancer le Circuit (GPS)</span>
                                    </button>
                                )}

                                {circuitEvents.map((event) => (
                                    <div key={event.id} className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-4">
                                        <h3 className="font-bold text-text-primary">{event.name}</h3>
                                        <p className="text-sm text-text-secondary">{event.city} ({event.postalCode})</p>
                                        <p className="text-sm text-text-muted mb-3">
                                            {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}
                                            {event.distance !== undefined && ` • ${event.distance} km`}
                                        </p>

                                        <div className="flex gap-2">
                                            {userPosition && (
                                                <button
                                                    onClick={() => navigateToEvent(event)}
                                                    className="flex-1 py-1.5 px-2 bg-primary/20 text-primary rounded hover:bg-primary/30 text-sm font-medium flex items-center justify-center gap-1"
                                                >
                                                    <span>📍 Y aller</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveFromCircuit(event.id)}
                                                className="py-1.5 px-3 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 text-sm font-medium"
                                            >
                                                Retirer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <hr className="border-gray-700" />

                {/* Section Mes Événements */}
                <section>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                        📅 Mes Événements Ajoutés
                    </h2>
                    {loadingMyEvents ? (
                        <p className="text-text-muted">Chargement de vos événements...</p>
                    ) : myEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myEvents.map(event => (
                                <div key={event.id} className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-4 flex flex-col h-full">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-text-primary">{event.name}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${event.cancelled ? 'bg-red-900/30 text-red-400' :
                                            event.statut_validation === 'published' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                                            }`}>
                                            {event.cancelled ? 'Annulé' : (event.statut_validation === 'published' ? 'Publié' : 'En attente')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-secondary mt-1">{event.city} ({event.postalCode})</p>
                                    <p className="text-sm text-text-muted mt-2 mb-4">
                                        {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-gray-700 flex gap-2">
                                        {!event.cancelled && (
                                            <>
                                                <Link
                                                    to={`/edit-event/${event.id}`}
                                                    className="flex-1 py-2 px-3 bg-blue-600/20 text-blue-400 border border-blue-800/50 rounded-lg hover:bg-blue-600/30 text-sm font-medium text-center transition-colors"
                                                >
                                                    Modifier
                                                </Link>
                                                <button
                                                    onClick={() => handleCancelEvent(event.id.toString())}
                                                    className="flex-1 py-2 px-3 bg-red-600/20 text-red-400 border border-red-800/50 rounded-lg hover:bg-red-600/30 text-sm font-medium transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                            </>
                                        )}
                                        {event.cancelled && (
                                            <span className="w-full text-center text-sm text-red-400 italic py-2">
                                                Cet événement est annulé
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-6 text-center">
                            <p className="text-text-muted">Vous n'avez pas encore ajouté d'événements.</p>
                            <Link to="/soumettre" className="text-primary hover:text-primary-hover mt-2 inline-block">
                                Ajouter un événement
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
