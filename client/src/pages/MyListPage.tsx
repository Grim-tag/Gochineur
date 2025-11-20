import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Event } from '../types'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateDistance, generateChronologicalCircuitUrl, generateEventNavigationUrl } from '../utils/appUtils'
import { fetchEvents } from '../services/api'

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

export default function MyListPage() {
  const [circuitEvents, setCircuitEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [circuitIds, setCircuitIds] = useState<(string | number)[]>([])
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)

  const testPosition: UserPosition = {
    latitude: 43.5716,
    longitude: -1.2780
  }

  // Définir la position utilisateur (test par défaut)
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

  // Charger les événements du circuit
  useEffect(() => {
    // Charger les IDs du circuit depuis localStorage
    const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
    setCircuitIds(circuit)

    if (circuit.length === 0) {
      setLoading(false)
      return
    }

    // Attendre que la position soit définie
    const position = userPosition || testPosition

        // Charger les détails des événements
        fetchEvents({
          lat: position.latitude,
          lon: position.longitude,
          radius: 2000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        })
          .then((allEvents: Event[]) => {
            // Filtrer uniquement les événements du circuit utilisateur
            let eventsInCircuit = allEvents.filter(event => circuit.includes(event.id))
            
            // Calculer les distances
            eventsInCircuit = eventsInCircuit.map(event => {
              const distance = calculateDistance(
                position.latitude,
                position.longitude,
                event.latitude,
                event.longitude
              )
              return { ...event, distance: Math.round(distance * 10) / 10 }
            })
            
            // Double tri : 1. date_debut (chronologique), 2. Distance (du plus proche au plus loin)
            eventsInCircuit.sort((a, b) => {
              const dateA = new Date(a.date_debut || a.date).getTime()
              const dateB = new Date(b.date_debut || b.date).getTime()
              if (dateA !== dateB) {
                return dateA - dateB
              }
              return (a.distance || 0) - (b.distance || 0)
            })
            
            setCircuitEvents(eventsInCircuit)
            setLoading(false)
          })
          .catch(err => {
            console.error('Erreur lors du chargement des événements:', err)
            setLoading(false)
          })
  }, [userPosition])

  const handleRemoveFromCircuit = (eventId: string | number) => {
    const newCircuit = circuitIds.filter(id => id !== eventId)
    localStorage.setItem('gochineur-circuit', JSON.stringify(newCircuit))
    setCircuitIds(newCircuit)
    setCircuitEvents(circuitEvents.filter(event => event.id !== eventId))
  }

  const handleClearCircuit = () => {
    if (confirm('Êtes-vous sûr de vouloir vider votre circuit ?')) {
      localStorage.removeItem('gochineur-circuit')
      setCircuitIds([])
      setCircuitEvents([])
    }
  }

  const launchChronologicalCircuit = () => {
    if (!userPosition) return
    const url = generateChronologicalCircuitUrl(userPosition, circuitEvents)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const navigateToEvent = (event: Event) => {
    if (!userPosition) return
    const url = generateEventNavigationUrl(userPosition, event)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const mapCenter: [number, number] = userPosition ? [userPosition.latitude, userPosition.longitude] : [testPosition.latitude, testPosition.longitude];
  const polylinePositions = userPosition ? [[userPosition.latitude, userPosition.longitude], ...circuitEvents.map(event => [event.latitude, event.longitude])] : circuitEvents.map(event => [event.latitude, event.longitude]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">📋 Mon Circuit</h1>
              <p className="text-sm text-gray-500">Planifiez votre parcours de chine</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Retour à la recherche
              </Link>
              {circuitEvents.length > 0 && (
                <button
                  onClick={handleClearCircuit}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Vider le circuit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {loading && (
          <div className="flex items-center justify-center py-12 lg:w-1/2">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement de votre circuit...</p>
            </div>
          </div>
        )}

        {!loading && circuitEvents.length === 0 && (
          <div className="text-center py-12 lg:w-full">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Votre circuit est vide</h2>
            <p className="text-gray-500 mb-6">
              Commencez par ajouter des événements depuis la page de recherche
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Rechercher des événements
            </Link>
          </div>
        )}

        {!loading && circuitEvents.length > 0 && (
          <>
            {/* Colonne de gauche: Carte Leaflet */}
            <div className="lg:w-2/3 h-[50vh] lg:h-auto bg-white rounded-lg shadow-md overflow-hidden">
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
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                            {event.type}
                          </span>
                        </p>
                        <p className="text-sm mt-2">
                          <strong>Date:</strong> {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-sm mt-1">
                          <strong>Adresse:</strong> {event.address}
                        </p>
                        {event.distance !== undefined && (
                          <p className="text-sm mt-1">
                            <strong>Distance:</strong> {event.distance} km
                          </p>
                        )}
                        <p className="text-sm mt-2 text-gray-700">{event.description}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {polylinePositions.length > 1 && (
                  <Polyline positions={polylinePositions as L.LatLngExpression[]} color="blue" weight={3} />
                )}
              </MapContainer>
            </div>

            {/* Colonne de droite: Liste des événements du circuit */}
            <div className="lg:w-1/3 flex flex-col">
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-semibold">
                  🗺️ Votre circuit contient {circuitEvents.length} événement{circuitEvents.length > 1 ? 's' : ''}
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  Trié par date puis par distance pour optimiser votre parcours
                </p>
                {userPosition && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={launchChronologicalCircuit}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 2.25L13.5 7.5h-1.5m-6.062 4.724l-1.48 4.437A4.5 4.5 0 005.08 19.5H18.75a2.25 2.25 0 002.25-2.25v-9.375m-18.75 0v-1.5m18.75 1.5v1.5m-12 12l-1.5 4.5m5.25-16.5h9.375m-9.375 0a1.5 1.5 0 00-1.406 1.033L9.75 7.5m0 0l-1.5 4.5m0 0a1.5 1.5 0 00-1.406 1.033L6 15.75m4.875-9.75h7.5m-7.5 0a1.5 1.5 0 01-1.406 1.033L10.5 7.5m-8.625 4.724A4.5 4.5 0 011.5 15.75v-1.5m18.75 0a4.5 4.5 0 00-1.406-3.346L13.5 7.5" />
                      </svg>
                      Lancer le Circuit Chronologique (Trié par Date) ▶️
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {circuitEvents.map((event) => (
                  <div key={event.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{event.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            event.type.toLowerCase().includes('vide grenier') || event.type.toLowerCase().includes('vide-grenier') ? 'bg-green-100 text-green-800' :
                            event.type.toLowerCase().includes('brocante') || event.type.toLowerCase().includes('puces') ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {event.type}
                          </span>
                          <span>📍 {event.city} ({event.postalCode})</span>
                          {event.distance !== undefined && (
                            <span>📏 {event.distance} km</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      📅 {new Date(event.date_debut || event.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                    <div className="space-y-2">
                      {userPosition && (
                        <button
                          onClick={() => navigateToEvent(event)}
                          className="w-full py-2 px-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          Naviguer vers ce lieu 📍
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFromCircuit(event.id)}
                        className="w-full py-1.5 px-3 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

