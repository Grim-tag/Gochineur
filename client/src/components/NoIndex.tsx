import { useEffect } from 'react'

interface NoIndexProps {
    title?: string
}

/**
 * Composant pour bloquer l'indexation d'une page par les moteurs de recherche
 * Ajoute les balises meta noindex, nofollow
 */
export default function NoIndex({ title }: NoIndexProps) {
    useEffect(() => {
        // Créer ou mettre à jour la balise robots
        let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement
        if (!robotsMeta) {
            robotsMeta = document.createElement('meta')
            robotsMeta.name = 'robots'
            document.head.appendChild(robotsMeta)
        }
        robotsMeta.content = 'noindex, nofollow'

        // Créer ou mettre à jour la balise googlebot
        let googlebotMeta = document.querySelector('meta[name="googlebot"]') as HTMLMetaElement
        if (!googlebotMeta) {
            googlebotMeta = document.createElement('meta')
            googlebotMeta.name = 'googlebot'
            document.head.appendChild(googlebotMeta)
        }
        googlebotMeta.content = 'noindex, nofollow'

        // Mettre à jour le title si fourni
        if (title) {
            document.title = title
        }

        // Cleanup : remettre à index quand le composant est démonté
        return () => {
            if (robotsMeta) robotsMeta.content = 'index, follow'
            if (googlebotMeta) googlebotMeta.content = 'index, follow'
        }
    }, [title])

    return null
}
