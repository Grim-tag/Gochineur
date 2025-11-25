import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API } from '../config/constants'

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

interface LocationPickerProps {
    latitude: number | null
    longitude: number | null
    onLocationChange: (lat: number, lon: number, address?: string, city?: string, postalCode?: string) => void
    address?: string
    city?: string
    postalCode?: string
}

// Composant pour gérer le marqueur draggable
function DraggableMarker({
    position,
    onDragEnd
}: {
    position: [number, number],
    onDragEnd: (lat: number, lon: number) => void
}) {
    const markerRef = useRef<L.Marker>(null)

    const eventHandlers = {
        dragend() {
            const marker = markerRef.current
            if (marker != null) {
                const pos = marker.getLatLng()
                onDragEnd(pos.lat, pos.lng)
            }
        },
    }

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    )
}

export default function LocationPicker({
    latitude,
    longitude,
    onLocationChange
}: LocationPickerProps) {
    const [isGeocoding, setIsGeocoding] = useState(false)
    const [geocodingError, setGeocodingError] = useState<string | null>(null)
    const [manuallyMoved, setManuallyMoved] = useState(false)
    const [localPosition, setLocalPosition] = useState<[number, number] | null>(null)

    // Position par défaut (centre de la France)
    const defaultCenter: [number, number] = [46.603354, 1.888334]

    // Utiliser la position locale si elle existe (après déplacement manuel), sinon les props
    const effectivePosition = localPosition || (latitude && longitude ? [latitude, longitude] : null)
    const center: [number, number] = effectivePosition as [number, number] || defaultCenter

    // Mettre à jour la position locale quand les props changent (seulement si pas de déplacement manuel récent)
    useEffect(() => {
        if (latitude && longitude && !manuallyMoved) {
            setLocalPosition([latitude, longitude])
        }
    }, [latitude, longitude, manuallyMoved])

    // Reverse geocoding : coordonnées → adresse
    const reverseGeocode = async (lat: number, lon: number) => {
        try {
            setIsGeocoding(true)
            setGeocodingError(null)

            const baseUrl = API.BASE_URL || ''
            const response = await fetch(
                `${baseUrl}/api/geo/reverse?lat=${lat}&lon=${lon}`
            )

            if (response.ok) {
                const data = await response.json()
                if (data.address) {
                    const addr = data.address
                    const newAddress = addr.road || addr.pedestrian || addr.hamlet || addr.suburb || ''
                    const newCity = addr.city || addr.town || addr.village || addr.municipality || ''
                    const newPostalCode = addr.postcode || ''

                    // Mettre à jour les champs
                    onLocationChange(lat, lon, newAddress, newCity, newPostalCode)
                }
            } else {
                setGeocodingError('Impossible de récupérer l\'adresse pour cette position')
            }
        } catch (error) {
            console.error('Erreur reverse geocoding:', error)
            setGeocodingError('Erreur lors de la récupération de l\'adresse')
        } finally {
            setIsGeocoding(false)
        }
    }

    const handleMarkerDragEnd = (lat: number, lon: number) => {
        setManuallyMoved(true)
        setLocalPosition([lat, lon])
        reverseGeocode(lat, lon)

        // Réinitialiser le flag après 5 secondes pour permettre de futures mises à jour automatiques
        setTimeout(() => {
            setManuallyMoved(false)
        }, 5000)
    }

    const handleResetToAddress = () => {
        setManuallyMoved(false)
        setLocalPosition(null)
        if (latitude && longitude) {
            setLocalPosition([latitude, longitude])
        }
    }

    const hasValidPosition = effectivePosition !== null && effectivePosition[0] !== 0 && effectivePosition[1] !== 0

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-text-secondary">
                    📍 Emplacement sur la carte
                </label>
                {isGeocoding && (
                    <span className="text-xs text-primary animate-pulse">
                        Récupération de l'adresse...
                    </span>
                )}
            </div>

            {geocodingError && (
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-2">
                    <p className="text-yellow-400 text-xs">{geocodingError}</p>
                </div>
            )}

            <div className="bg-background-paper rounded-lg border border-gray-600 overflow-hidden">
                {hasValidPosition ? (
                    <div className="relative">
                        <MapContainer
                            center={center}
                            zoom={15}
                            style={{ height: '350px', width: '100%' }}
                            className="z-0"
                            key={`${center[0]}-${center[1]}`}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <DraggableMarker
                                position={center}
                                onDragEnd={handleMarkerDragEnd}
                            />
                        </MapContainer>

                        {/* Instructions overlay */}
                        <div className="absolute top-3 left-3 right-3 bg-background-paper/95 backdrop-blur-sm border border-gray-600 rounded-lg p-3 shadow-lg z-10">
                            <p className="text-xs text-text-secondary">
                                <span className="font-semibold text-primary">💡 Astuce :</span> Déplacez le marqueur 📍 pour corriger l'emplacement exact. Les champs d'adresse se mettront à jour automatiquement.
                            </p>
                        </div>

                        {/* Reset button */}
                        {manuallyMoved && (
                            <div className="absolute top-20 left-3 z-10">
                                <button
                                    onClick={handleResetToAddress}
                                    className="bg-background-paper/95 backdrop-blur-sm border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors shadow-lg"
                                >
                                    🔄 Revenir à l'adresse saisie
                                </button>
                            </div>
                        )}

                        {/* Coordinates display */}
                        <div className="absolute bottom-3 right-3 bg-background-paper/95 backdrop-blur-sm border border-gray-600 rounded px-3 py-1.5 shadow-lg z-10">
                            <p className="text-xs text-text-muted font-mono">
                                {center[0].toFixed(5)}, {center[1].toFixed(5)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-[350px] flex items-center justify-center bg-background">
                        <div className="text-center p-6">
                            <span className="text-5xl mb-3 block">📍</span>
                            <p className="text-text-muted text-sm">
                                Remplissez l'adresse, la ville et le code postal
                                <br />
                                pour voir l'emplacement sur la carte
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {hasValidPosition && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                    <p className="text-blue-400 text-xs flex items-center gap-2">
                        <span>✅ Position confirmée :</span>
                        <span className="font-mono">{center[0].toFixed(5)}, {center[1].toFixed(5)}</span>
                        {manuallyMoved && (
                            <span className="text-yellow-400 ml-2">⚠️ Position ajustée manuellement</span>
                        )}
                    </p>
                </div>
            )}
        </div>
    )
}
