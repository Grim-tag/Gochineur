import { useState, useEffect } from 'react'
import { CATEGORY_CONFIG } from '../config/seoConfig'

export const useSEO = (category?: string) => {
    const [seoTitle, setSeoTitle] = useState<string>('')

    // Initial SEO setup based on category
    useEffect(() => {
        if (category && CATEGORY_CONFIG[category]) {
            const config = CATEGORY_CONFIG[category]
            setSeoTitle(config.h1)
            document.title = config.metaTitle
            const metaDesc = document.querySelector('meta[name="description"]')
            if (metaDesc) metaDesc.setAttribute('content', config.metaDescription)
        } else if (!category) {
            // Default homepage
            setSeoTitle('Vide-greniers et brocantes l\'agenda des chineurs')
            document.title = 'Vide-greniers et brocantes l\'agenda des chineurs - GoChineur'
        }
    }, [category])

    const updateSeoTitle = (locationName: string, type: string, radius: number, deptCode?: string, isCity: boolean = false) => {
        const typeLabel = type === 'tous' ? 'Vide-greniers et brocantes' : type + 's'
        let title = ''

        if (isCity) {
            // Pour les villes : "Vide-greniers à Paris (25 km)"
            title = `${typeLabel} à ${locationName}`
            if (!deptCode) {
                title += ` (${radius} km)`
            }
        } else if (deptCode) {
            // Pour les départements : "Vide-greniers Landes (33)"
            title = `${typeLabel} ${locationName} (${deptCode})`
        } else {
            // Pour les régions ou autres : "Vide-greniers Nouvelle-Aquitaine"
            title = `${typeLabel} ${locationName}`
        }

        setSeoTitle(title)
        document.title = `${title} - GoChineur`
    }

    return { seoTitle, setSeoTitle, updateSeoTitle }
}
