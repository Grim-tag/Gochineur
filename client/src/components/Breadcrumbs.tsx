import { Link } from 'react-router-dom'

interface BreadcrumbItem {
    label: string
    path?: string
    onClick?: () => void
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    if (!items || items.length === 0) return null

    return (
        <nav className="flex text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                    <Link
                        to="/"
                        onClick={(e) => {
                            const homeItem = items[0]
                            if (homeItem?.onClick) {
                                e.preventDefault()
                                homeItem.onClick()
                            }
                        }}
                        className="inline-flex items-center hover:text-blue-600"
                    >
                        <svg className="w-3 h-3 mr-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                        </svg>
                        Accueil
                    </Link>
                </li>
                {items.slice(1).map((item, index) => (
                    <li key={index}>
                        <div className="flex items-center">
                            <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
                            </svg>
                            {item.path ? (
                                <Link
                                    to={item.path}
                                    onClick={(e) => {
                                        if (item.onClick) {
                                            e.preventDefault()
                                            item.onClick()
                                        }
                                    }}
                                    className="ml-1 hover:text-blue-600 md:ml-2"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="ml-1 text-gray-700 font-medium md:ml-2">
                                    {item.label}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    )
}
