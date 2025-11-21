import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Event } from '../types'
import { checkAuth, redirectToGoogleAuth, type User } from '../utils/authUtils'
import { forwardGeocode } from '../utils/appUtils'

interface SearchBarProps {
  onSearch: (searchTerm: string, radius: number, eventType: string, coordinates?: { latitude: number; longitude: number; city: string }) => void
  onRadiusChange?: (radius: number) => void
  onReset?: () => void
  events: Event[]
  geoData?: any
}

export default function SearchBar({ onSearch, onRadiusChange, onReset, geoData }: SearchBarProps) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [radius, setRadius] = useState(25)
  const [eventType, setEventType] = useState('tous')
  const [circuitCount, setCircuitCount] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const updateCircuitCount = () => {
      const circuit = JSON.parse(localStorage.getItem('gochineur-circuit') || '[]')
      setCircuitCount(circuit.length)
    }
    updateCircuitCount()
    window.addEventListener('storage', updateCircuitCount)
    return () => window.removeEventListener('storage', updateCircuitCount)
  }, [])

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth().then(({ authenticated, user }) => {
      if (authenticated && user) {
        setUser(user)
      }
      setAuthLoading(false)
    })
  }, [])

  const [geocoding, setGeocoding] = useState(false)
  const [geolocating, setGeolocating] = useState(false)

  const handleSearch = async () => {
    // Si le champ est vide, on propose de réinitialiser (retour géolocalisation)
    if (!searchTerm.trim()) {
      if (onReset) {
        onReset()
        navigate('/')
      } else {
        onSearch(searchTerm, radius, eventType)
      }
      return
    }

    // Si une recherche textuelle est effectuée, faire un géocodage direct
    setGeocoding(true)
    try {
      const geocodeResult = await forwardGeocode(searchTerm.trim())
      if (geocodeResult && geoData) {
        // Trouver la ville dans geo-data pour obtenir le slug
        const citySlug = searchTerm.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const cityData = geoData.cities?.find((c: any) =>
          c.name.toLowerCase() === searchTerm.trim().toLowerCase() ||
          c.slug === citySlug
        )

        if (cityData) {
          // Trouver le département
          const dept = geoData.departments?.find((d: any) => d.code === cityData.department)
          if (dept) {
            // Créer le slug du département (ex: "landes" pour "40")
            const deptSlug = dept.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            const targetUrl = `/brocantes/${deptSlug}/${cityData.slug}`
            console.log('Navigating to:', targetUrl)
            // Naviguer vers /brocantes/landes/saint-martin-de-hinx
            navigate(targetUrl)
            return
          }
        } else {
          // Ville non trouvée dans geo-data - l'ajouter dynamiquement
          console.log('City not found in geo-data:', searchTerm, 'adding to database...')

          try {
            const addCityRes = await fetch(`${import.meta.env.VITE_API_URL || window.location.origin}/api/geo/add-city`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: geocodeResult.city,
                lat: geocodeResult.latitude,
                lon: geocodeResult.longitude
              })
            })

            const addCityData = await addCityRes.json()

            if (addCityData.success && addCityData.city) {
              const city = addCityData.city
              const dept = geoData.departments?.find((d: any) => d.code === city.department)

              if (dept) {
                const deptSlug = dept.name.toLowerCase()
                  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')

                console.log('City added successfully, navigating to:', `/brocantes/${deptSlug}/${city.slug}`)
                navigate(`/brocantes/${deptSlug}/${city.slug}`)
                return
              }
            }
          } catch (error) {
            console.error('Error adding city:', error)
          }
        }

        // Appeler onSearch avec les coordonnées géocodées
        onSearch(searchTerm, radius, eventType, geocodeResult)
      } else {
        // Si le géocodage échoue, faire quand même la recherche avec le terme textuel
        onSearch(searchTerm, radius, eventType)
      }
    } catch (error) {
      console.error('Erreur lors du géocodage:', error)
      // En cas d'erreur, faire quand même la recherche avec le terme textuel
      onSearch(searchTerm, radius, eventType)
    } finally {
      setGeocoding(false)
    }
  }

  const handleGeolocate = async () => {
    setGeolocating(true)

    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur')
      setGeolocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords

          // Reverse geocode pour trouver la ville
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'User-Agent': 'GoChineur/1.0' } }
          )
          const data = await response.json()

          const cityName = data.address?.city || data.address?.town || data.address?.village || 'Votre position'

          // Essayer de trouver la ville dans geoData
          if (geoData) {
            const citySlug = cityName.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')

            let cityData = geoData.cities?.find((c: any) =>
              c.name.toLowerCase() === cityName.toLowerCase() || c.slug === citySlug
            )

            // Si pas trouvée, l'ajouter via l'API
            if (!cityData) {
              const addCityRes = await fetch(`${window.location.origin}/api/geo/add-city`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: cityName, lat: latitude, lon: longitude })
              })
              const addCityData = await addCityRes.json()
              if (addCityData.success) {
                cityData = addCityData.city
              }
            }

            if (cityData) {
              const dept = geoData.departments?.find((d: any) => d.code === cityData.department)
              if (dept) {
                const deptSlug = dept.name.toLowerCase()
                  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                navigate(`/brocantes/${deptSlug}/${cityData.slug}`)
                setGeolocating(false)
                return
              }
            }
          }

          // Fallback: appeler onSearch avec les coordonnées
          onSearch('', radius, eventType, { latitude, longitude, city: cityName })
          setGeolocating(false)
        } catch (error) {
          console.error('Erreur reverse geocoding:', error)
          setGeolocating(false)
        }
      },
      (error) => {
        console.error('Erreur géolocalisation:', error)
        alert('Impossible d\'obtenir votre position')
        setGeolocating(false)
      }
    )
  }

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setSearchTerm('')
    if (onReset) {
      onReset()
    }
    navigate('/')
  }

  // Appeler la recherche automatiquement quand le type change
  const handleTypeChange = (newType: string) => {
    setEventType(newType)
    onSearch(searchTerm, radius, newType)
  }

  // Gestion du clic sur le bouton "Ajouter un événement"
  const handleAddEventClick = (e: React.MouseEvent) => {
    e.preventDefault()

    if (!user) {
      // Utilisateur non connecté : rediriger vers la connexion Google
      redirectToGoogleAuth()
      return
    }

    if (!user.displayName) {
      // Utilisateur connecté mais sans pseudo : rediriger vers la page de pseudo
      navigate('/set-pseudo?returnTo=/soumettre')
      return
    }

    // Utilisateur connecté avec pseudo : rediriger vers le formulaire
    navigate('/soumettre')
  }

  return (
    <div className="bg-background-paper shadow-md sticky top-0 z-50 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        {/* Header avec logo et liens */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="w-full md:w-1/3 flex justify-center md:justify-start">
            <a href="/" onClick={handleLogoClick} className="text-2xl font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer flex items-center gap-2">
              <span className="text-3xl">🛍️</span> GoChineur
            </a>
          </div>

          <div className="w-full md:w-1/3 flex justify-center">
            <button
              onClick={handleAddEventClick}
              disabled={authLoading}
              className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/20 transform hover:scale-105 duration-200 font-semibold"
            >
              <span>➕ Ajouter un événement</span>
            </button>
          </div>

          <div className="w-full md:w-1/3 flex justify-center md:justify-end gap-2">
            {!user ? (
              <button
                onClick={redirectToGoogleAuth}
                className="bg-background-lighter text-text-primary border border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <span>Se connecter</span>
              </button>
            ) : (
              <Link
                to="/mon-compte"
                className="bg-background-lighter text-text-primary border border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <span>👤 Mon compte</span>
                {circuitCount > 0 && (
                  <span className="bg-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                    {circuitCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <button
            onClick={handleGeolocate}
            disabled={geolocating}
            className="w-full md:w-auto px-4 py-3 md:py-2 bg-background-lighter text-text-primary border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title="Me géolocaliser"
          >
            {geolocating ? '📍...' : '📍 Autour de moi'}
          </button>
          <input
            type="text"
            placeholder="Rechercher une ville, code postal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-3 md:py-2 bg-background text-text-primary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-500"
            disabled={geocoding}
          />
          <button
            onClick={handleSearch}
            disabled={geocoding}
            className="w-full md:w-auto px-6 py-3 md:py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed font-semibold"
          >
            {geocoding ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-1/2">
            <label htmlFor="radius" className="block text-sm font-medium text-text-secondary mb-1">
              Rayon de recherche: <span className="text-primary font-bold">{radius} km</span>
            </label>
            <input
              type="range"
              id="radius"
              min="5"
              max="100"
              step="5"
              value={radius}
              onChange={(e) => {
                const newRadius = Number(e.target.value)
                setRadius(newRadius)
                onRadiusChange?.(newRadius)
              }}
              onMouseUp={handleSearch}
              onTouchEnd={handleSearch}
              className="w-full h-2 bg-background-lighter rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="w-full md:w-1/2">
            <label htmlFor="eventType" className="block text-sm font-medium text-text-secondary mb-1">
              Type d'événement:
            </label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-text-primary"
            >
              <option value="tous">Tous les types</option>
              <option value="Vide-Grenier">Vide-Grenier</option>
              <option value="Brocante">Brocante</option>
              <option value="Puces et Antiquités">Puces et Antiquités</option>
              <option value="Bourse">Bourse</option>
              <option value="Vide Maison">Vide Maison</option>
              <option value="Troc">Troc</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}


