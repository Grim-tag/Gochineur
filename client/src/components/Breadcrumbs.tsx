import { Link } from 'react-router-dom'

interface BreadcrumbItem {
    label: string
    path?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    // Génération du JSON-LD pour Schema.org
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.label,
            "item": item.path ? `${window.location.origin}${item.path}` : undefined
        }))
    }

    return (
        <nav aria-label="Fil d'ariane" className="text-sm text-gray-500 mb-4">
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>
            <ol className="list-none p-0 inline-flex">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        {index > 0 && <span className="mx-2">/</span>}
                        {item.path ? (
                            <Link to={item.path} className="hover:text-blue-600 transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-gray-800 font-medium" aria-current="page">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    )
}
