import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

interface GeoData {
    regions: { code: string; name: string; slug: string; lat: number; lon: number }[]
    departments: { code: string; name: string; slug: string; region: string; lat: number; lon: number }[]
}

interface DepartmentCodeRedirectProps {
    code?: string
}

export default function DepartmentCodeRedirect({ code }: DepartmentCodeRedirectProps) {
    const { category, deptCode, param } = useParams<{ category?: string; deptCode?: string; param?: string }>()
    const [shouldRedirect, setShouldRedirect] = useState<boolean | null>(null)
    const [targetUrl, setTargetUrl] = useState<string>('')

    // Use prop if available, otherwise try params
    const codeToUse = code || deptCode || param

    useEffect(() => {
        const checkAndRedirect = async () => {
            if (!codeToUse) {
                setShouldRedirect(false)
                return
            }

            // Check if code looks like a department code (01, 2A, 75, etc.)
            const isDeptCodePattern = /^(\d{1,3}|2[AB])$/.test(codeToUse)

            if (!isDeptCodePattern) {
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
                    const dept = geoData.departments.find(d => d.code === codeToUse)

                    if (dept) {
                        // Find region
                        const region = geoData.regions.find(r => r.code === dept.region)

                        if (region) {
                            // Build hierarchical URL
                            const currentCategory = category || 'vide-grenier'
                            const url = `/${currentCategory}/${region.slug}/${dept.slug}/`
                            console.log(`Redirecting from /${currentCategory}/${codeToUse} to ${url}`)
                            setTargetUrl(url)
                            setShouldRedirect(true)
                            return
                        }
                    }
                }

                setShouldRedirect(false)
            } catch (error) {
                console.error('Error checking department code:', error)
                setShouldRedirect(false)
            }
        }

        checkAndRedirect()
    }, [category, codeToUse])

    // Redirect via window.location for full page reload
    useEffect(() => {
        if (shouldRedirect && targetUrl) {
            window.location.href = targetUrl
        }
    }, [shouldRedirect, targetUrl])

    // While checking or redirecting, show loader
    if (shouldRedirect === null || shouldRedirect === true) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">{shouldRedirect ? 'Redirection en cours...' : 'Chargement...'}</p>
                </div>
            </div>
        )
    }

    // If failed to redirect (not a dept code or not found), render nothing or error
    // In the new architecture, this component is only rendered if we suspect it IS a dept code.
    // If it turns out it's not, we should probably render null or let the parent handle it?
    // But since this is a "Redirect" component, if it fails, it's a dead end.
    // However, for safety, if used in a route, we might want to show 404.
    // But here we'll just render null as the parent CategoryRouteWrapper should have handled the "is it a region?" check.
    // Actually, if we are here, it means we matched the pattern but failed to find the dept in DB.

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-400">Département introuvable ({codeToUse})</p>
                <a href="/" className="text-primary hover:underline mt-4 block">Retour à l'accueil</a>
            </div>
        </div>
    )
}
