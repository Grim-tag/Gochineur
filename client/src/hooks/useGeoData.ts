import { useState, useEffect } from 'react'
import { API } from '../config/constants'

export interface GeoData {
    regions: { code: string; name: string; slug: string; lat: number; lon: number }[]
    departments: { code: string; name: string; slug: string; region: string; lat: number; lon: number }[]
    cities: { name: string; slug: string; department: string; lat: number; lon: number }[]
}

export const useGeoData = () => {
    const [geoData, setGeoData] = useState<GeoData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchGeoData = async () => {
            try {
                const [geoDataRes, citiesRes] = await Promise.all([
                    fetch(`${API.BASE_URL}/api/geo/data`).then(res => res.json()),
                    fetch(`${API.BASE_URL}/api/geo/cities-db`).then(res => res.json())
                ])

                if (geoDataRes.success) {
                    const data = geoDataRes.data
                    // Fusionner les villes de geo-data.json avec celles de MongoDB
                    if (citiesRes.success && citiesRes.cities) {
                        data.cities = [...data.cities, ...citiesRes.cities]
                    }
                    setGeoData(data)
                } else {
                    setError('Failed to load geo data')
                }
            } catch (err: any) {
                console.error('Erreur chargement geo data:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchGeoData()
    }, [])

    return { geoData, loading, error }
}
