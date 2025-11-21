import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Event } from '../types'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateDistance, generateChronologicalCircuitUrl, generateEventNavigationUrl } from '../utils/appUtils'
import { fetchEvents, fetchMyEvents, deleteAccount } from '../services/api'
import { checkAuth, logout, type User } from '../utils/authUtils'

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
        return <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    }

    const mapCenter: [number, number] = userPosition ? [userPosition.latitude, userPosition.longitude] : [testPosition.latitude, testPosition.longitude];
    const polylinePositions = userPosition ? [[userPosition.latitude, userPosition.longitude], ...circuitEvents.map(event => [event.latitude, event.longitude])] : circuitEvents.map(event => [event.latitude, event.longitude]);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header Compte */}
            <div className="bg-white shadow mb-6">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Mon Compte</h1>
                            <div className="mt-2 text-gray-600">
                                <p><span className="font-semibold">Pseudo:</span> {user?.displayName}</p>
                                <p><span className="font-semibold">Email:</span> {user?.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Me déconnecter
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Supprimer mon compte
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 space-y-8">

                {/* Section Mon Circuit */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            🗺️ Mon Circuit
                        </h2>
                        {circuitEvents.length > 0 && (
                            <button
                                onClick={handleClearCircuit}
                                className="text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                                Vider le circuit
                            </button>
                        )}
                    </div>

                    {!loadingCircuit && circuitEvents.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500 mb-4">Votre circuit est vide.</p>
                            <Link
                                to="/"
                                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Rechercher des événements
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Carte */}
                            <div className="lg:w-2/3 h-[500px] bg-white rounded-lg shadow overflow-hidden">
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
                                                    <h3 className="font-bold text-lg text-blue-600">{event.name}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{event.city}</p>
                                                    <p className="text-sm mt-1">{new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                    {polylinePositions.length > 1 && (
                                        <Polyline positions={polylinePositions as L.LatLngExpression[]} color="blue" weight={3} />
                                    )}
                                </MapContainer>
                            </div>

                            {/* Liste Circuit */}
                            <div className="lg:w-1/3 flex flex-col gap-4 h-[500px] overflow-y-auto pr-2">
                                {userPosition && (
                                    <button
                                        onClick={launchChronologicalCircuit}
                                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm sticky top-0 z-10"
                                    >
                                        <span>▶️ Lancer le Circuit (GPS)</span>
                                    </button>
                                )}

                                {circuitEvents.map((event) => (
                                    <div key={event.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                                        <h3 className="font-bold text-gray-800">{event.name}</h3>
                                        <p className="text-sm text-gray-600">{event.city} ({event.postalCode})</p>
                                        <p className="text-sm text-gray-500 mb-3">
                                            {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}
                                            {event.distance !== undefined && ` • ${event.distance} km`}
                                        </p>

                                        <div className="flex gap-2">
                                            {userPosition && (
                                                <button
                                                    onClick={() => navigateToEvent(event)}
                                                    className="flex-1 py-1.5 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-1"
                                                >
                                                    <span>📍 Y aller</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveFromCircuit(event.id)}
                                                className="py-1.5 px-3 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-medium"
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

                <hr className="border-gray-200" />

                {/* Section Mes Événements */}
                <section>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📅 Mes Événements Ajoutés
                    </h2>
                    {loadingMyEvents ? (
                        <p className="text-gray-500">Chargement de vos événements...</p>
                    ) : myEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myEvents.map(event => (
                                <div key={event.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-gray-800">{event.name}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${event.statut_validation === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {event.statut_validation === 'published' ? 'Publié' : 'En attente'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{event.city} ({event.postalCode})</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-6 text-center">
                            <p className="text-gray-500">Vous n'avez pas encore ajouté d'événements.</p>
                            <Link to="/soumettre" className="text-blue-600 hover:underline mt-2 inline-block">
                                Ajouter un événement
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
