import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import HomePage from '../pages/HomePage'

interface GeoData {
    regions: { code: string; name: string; slug: string; lat: number; lon: number }[]
    departments: { code: string; name: string; slug: string; region: string; lat: number; lon: number }[]
}

export default function DepartmentCodeRedirect() {
    const { category, deptCode } = useParams<{ category?: string; deptCode?: string }>()
    const [shouldRedirect, setShouldRedirect] = useState<boolean | null>(null)
    const [targetUrl, setTargetUrl] = useState<string>('')

    useEffect(() => {
        const checkAndRedirect = async () => {
            // Check if deptCode looks like a department code (01, 2A, 75, etc.)
            // Department codes are 2-3 characters, numeric or 2A/2B
            const isDeptCodePattern = /^(\d{1,3}|2[AB])$/.test(deptCode || '')

            if (!isDeptCodePattern) {
                // Not a department code pattern - let HomePage handle it (it's probably a region slug)
                setShouldRedirect(false)
                return
            }

            try {
                // Fetch geo data
                const response = await fetch(`${import.meta.env.VITE_API_URL || window.location.origin}/api/geo/data`)
                const result = await response.json()

                if (result.success && result.data) {
                    const geoData: GeoData = result.data

                    // Find department by code
                    const dept = geoData.departments.find(d => d.code === deptCode)

                    if (dept) {
                        // Find region
                        const region = geoData.regions.find(r => r.code === dept.region)

                        if (region) {
                            // Build hierarchical URL
                            const currentCategory = category || 'vide-grenier'
                            const url = `/${currentCategory}/${region.slug}/${dept.slug}/`
                            console.log(`Redirecting from /${currentCategory}/${deptCode} to ${url}`)
                            setTargetUrl(url)
                            setShouldRedirect(true)
                            return
                        }
                    }
                }

                // Department code not found - let HomePage handle it
                setShouldRedirect(false)
            } catch (error) {
                console.error('Error checking department code:', error)
                setShouldRedirect(false)
            }
        }

        if (deptCode) {
            checkAndRedirect()
        }
    }, [category, deptCode])

    // Redirect via window.location for full page reload
    useEffect(() => {
        if (shouldRedirect && targetUrl) {
            window.location.href = targetUrl
        }
    }, [shouldRedirect, targetUrl])

    // While checking or if it's a region slug, render HomePage
    if (shouldRedirect === null) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement...</p>
                </div>
            </div>
        )
    }

    if (shouldRedirect === false) {
        // Not a department code - render HomePage (it's a region slug)
        return <HomePage />
    }

    // Redirecting...
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Redirection en cours...</p>
            </div>
        </div>
    )
}
