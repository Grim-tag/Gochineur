import { useState, useEffect } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Event, GeoData } from '../types'
import { forwardGeocode } from '../utils/appUtils'
import { saveUserLocation } from '../utils/locationStorage'
}

export default function SearchBar({ onSearch, onRadiusChange, onReset, geoData, currentRadius }: SearchBarProps) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [radius, setRadius] = useState(currentRadius || 25)
  const [eventType, setEventType] = useState('tous')
  const [geocoding, setGeocoding] = useState(false)
  const [geolocating, setGeolocating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Helper function to build hierarchical SEO URLs
  const buildHierarchicalUrl = (citySlug: string, deptCode: string, category: string = 'vide-greniers-brocantes') => {
    const dept = geoData?.departments?.find((d: any) => d.code === deptCode)
    if (!dept) return null

    const region = geoData?.regions?.find((r: any) => r.code === dept.region)
    if (!region) return null

    // Build hierarchical URL: /{category}/{region}/{department}/{city}
    return `/${category}/${region.slug}/${dept.slug}/${citySlug}`
  }

  // Synchroniser le slider avec currentRadius de HomePage
  useEffect(() => {
    if (currentRadius !== undefined && currentRadius !== radius) {
      setRadius(currentRadius)
    }
  }, [currentRadius])


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
        // D'abord, vérifier si c'est un département
        const searchNormalized = searchTerm.trim().toLowerCase()
        const department = geoData.departments?.find((d: any) =>
          d.name.toLowerCase() === searchNormalized ||
          d.slug === searchNormalized ||
          d.code === searchTerm.trim()
        )

        if (department) {
          // C'est un département - naviguer vers l'URL de département
          const region = geoData.regions?.find((r: any) => r.code === department.region)
          if (region) {
            const currentCategory = eventType === 'tous' ? 'vide-grenier' : eventType
            const targetUrl = `/${currentCategory}/${region.slug}/${department.slug}/`
            console.log('Department search detected, navigating to:', targetUrl)
            window.location.href = targetUrl
            return
          }
        }

        // Sinon, chercher une ville dans geo-data pour obtenir le slug
        const citySlug = searchTerm.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const cityData = geoData.cities?.find((c: any) =>
          c.name.toLowerCase() === searchTerm.trim().toLowerCase() ||
          c.slug === citySlug
        )

        if (cityData) {
          // Build hierarchical URL
          const targetUrl = buildHierarchicalUrl(cityData.slug, cityData.department, eventType === 'tous' ? 'vide-greniers-brocantes' : eventType)
          if (targetUrl) {
            console.log('Navigating to:', targetUrl)
            window.location.href = targetUrl
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
                const targetUrl = buildHierarchicalUrl(city.slug, city.department, eventType === 'tous' ? 'vide-greniers-brocantes' : eventType)
                if (targetUrl) {
                  console.log('City added successfully, navigating to:', targetUrl)
                  window.location.href = targetUrl
                  return
                }
              }
            }
          } catch (error) {
            console.error('Error adding city:', error)
          }
        }

        // Si on arrive ici, naviguer quand même (ville ajoutée ou géocodage réussi)
        // Utiliser le nom de la ville du géocodage pour créer un slug
        const citySlugFallback = geocodeResult.city
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')

        // Trouver le département via les coordonnées (approximatif)
        const dept = geoData.departments?.find((d: any) => {
          // Distance approximative - on pourrait améliorer ça
          const distance = Math.sqrt(
            Math.pow(d.lat - geocodeResult.latitude, 2) +
            Math.pow(d.lon - geocodeResult.longitude, 2)
          )
          return distance < 1 // Environ 100km
        })

        if (dept) {
          const targetUrl = buildHierarchicalUrl(citySlugFallback, dept.code, eventType === 'tous' ? 'vide-greniers-brocantes' : eventType)
          if (targetUrl) {
            console.log('Navigating to fallback:', targetUrl)
            window.location.href = targetUrl
            return
          }
        }
      } else {
        console.log('❌ No geocode result or geoData')
      }
    } catch (error) {
      console.error('Erreur lors du géocodage:', error)
    } finally {
      setGeocoding(false)
    }
  }

  const handleGeolocate = async () => {
    setGeolocating(true)
    setSearchTerm('') // Clear search term immediately

    if (!navigator.geolocation) {
      toast.success('La géolocalisation n\'est pas supportée par votre navigateur')
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
              const targetUrl = buildHierarchicalUrl(cityData.slug, cityData.department, eventType === 'tous' ? 'vide-greniers-brocantes' : eventType)
              if (targetUrl) {
                // Set radius to 30km for geolocation
                setRadius(30)
                // Save GPS position to localStorage
                saveUserLocation({
                  type: 'gps',
                  city: cityName,
                  latitude: latitude,
                  longitude: longitude,
                  radius: 30
                })
                navigate(targetUrl)
                setGeolocating(false)
                return
              }
            }
          }

          // Fallback: appeler onSearch avec les coordonnées et rayon de 30km
          setRadius(30)
          // Save GPS position to localStorage
          saveUserLocation({
            type: 'gps',
            city: cityName,
            latitude: latitude,
            longitude: longitude,
            radius: 30
          })
          onSearch('', 30, eventType, { latitude, longitude, city: cityName })
          setGeolocating(false)
        } catch (error) {
          console.error('Erreur reverse geocoding:', error)
          setGeolocating(false)
        }
      },
      (error) => {
        console.error('Erreur géolocalisation:', error)
        toast.error('Impossible d\'obtenir votre position')
        setGeolocating(false)
      }
    )
  }

  // Appeler la recherche automatiquement quand le type change
  const handleTypeChange = (newType: string) => {
    setEventType(newType)
    onSearch(searchTerm, radius, newType)
  }

  return (
    <div className="bg-background-paper shadow-md sticky top-0 z-50 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
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
            className={`flex-1 px-4 py-3 md:py-2 bg-background text-text-primary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-500 ${showFilters ? 'block' : 'hidden md:block'
              }`}
            disabled={geocoding}
          />
          <button
            onClick={handleSearch}
            disabled={geocoding}
            className={`w-full md:w-auto px-6 py-3 md:py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed font-semibold ${showFilters ? 'block' : 'hidden md:block'
              }`}
          >
            {geocoding ? 'Recherche...' : 'Rechercher'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden w-full px-4 py-3 bg-background-lighter text-text-primary border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 font-semibold"
          >
            <span>⚙️</span> {showFilters ? 'Masquer les filtres' : 'Filtres'}
          </button>
        </div>

        {/* Filtres */}
        <div className={`flex-col md:flex-row gap-4 items-center transition-all duration-300 overflow-hidden ${showFilters ? 'flex mt-4' : 'hidden md:flex'
          }`}>
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
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:border-primary bg-background text-text-primary"
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


