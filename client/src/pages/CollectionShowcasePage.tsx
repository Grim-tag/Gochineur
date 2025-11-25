import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API } from '../config/constants'
import Header from '../components/Header'
import type { CollectionItem } from '../services/collectionApi'

interface PublicUser {
    pseudo: string
    bio?: string
    avatar?: string
}

export default function CollectionShowcasePage() {
    const { userPseudo } = useParams<{ userPseudo: string }>()
    const [items, setItems] = useState<CollectionItem[]>([])
    const [user, setUser] = useState<PublicUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null)
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    // Reset active image when modal opens/closes or item changes
    useEffect(() => {
        setActiveImageIndex(0)
    }, [selectedItem])

    useEffect(() => {
        const fetchPublicCollection = async () => {
            try {
                const response = await fetch(`${API.BASE_URL}/api/collection/public/${userPseudo}`)
                if (!response.ok) {
                    throw new Error('Collection introuvable')
                }
                const data = await response.json()
                setItems(data.data)
                setUser(data.user)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (userPseudo) {
            fetchPublicCollection()
        }
    }, [userPseudo])

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <div className="flex-grow flex flex-col items-center justify-center p-4">
                    <h1 className="text-2xl font-bold text-text-primary mb-4">Oups !</h1>
                    <p className="text-text-secondary mb-6">{error || 'Utilisateur introuvable'}</p>
                    <Link to="/" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover">
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            {/* Hero Section */}
            <div className="bg-background-paper border-b border-gray-800">
                <div className="container mx-auto px-4 py-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg shadow-orange-900/20">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.pseudo} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.pseudo.charAt(0).toUpperCase()
                            )}
                        </div>
                        <h1 className="text-4xl font-bold text-text-primary mb-2">
                            Collection de {user.pseudo}
                        </h1>
                        {user.bio && (
                            <p className="text-text-secondary max-w-2xl">{user.bio}</p>
                        )}
                        <div className="mt-6 flex gap-4 text-sm text-text-muted">
                            <span>🏺 {items.length} objets</span>
                            <span>📅 Membre depuis 2024</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="container mx-auto px-4 py-12 flex-grow">
                {items.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-text-muted text-lg">Cette collection est vide pour le moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {items.map(item => (
                            <div
                                key={item._id}
                                onClick={() => setSelectedItem(item)}
                                className="bg-background-paper rounded-lg shadow-lg border border-gray-700 overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                            >
                                <div className="aspect-square relative overflow-hidden bg-gray-800">
                                    {item.photos_principales && item.photos_principales.length > 0 ? (
                                        <img
                                            src={item.photos_principales[0]}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            <span className="text-4xl">📷</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-sm text-white shadow-sm ${item.status === 'keeper' ? 'bg-blue-500/80' :
                                            item.status === 'for_sale' ? 'bg-yellow-500/80' : 'bg-purple-500/80'
                                            }`}>
                                            {item.status === 'keeper' ? 'Collection' :
                                                item.status === 'for_sale' ? 'À Vendre' : 'Échange'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-text-primary truncate mb-1">{item.name}</h3>
                                    <p className="text-sm text-text-secondary">{item.category || 'Non classé'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Détails */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="bg-background-paper rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            {/* Image Gallery */}
                            <div className="bg-black flex flex-col items-center justify-center min-h-[300px] p-4">
                                <div className="relative w-full h-[400px] flex items-center justify-center mb-4">
                                    {selectedItem.photos_principales && selectedItem.photos_principales.length > 0 ? (
                                        <img
                                            src={selectedItem.photos_principales[activeImageIndex]}
                                            alt={`${selectedItem.name} - Vue ${activeImageIndex + 1}`}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-6xl">📷</span>
                                    )}
                                </div>

                                {/* Thumbnails */}
                                {selectedItem.photos_principales && selectedItem.photos_principales.filter(p => p).length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                                        {selectedItem.photos_principales.filter(p => p).map((photo, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setActiveImageIndex(selectedItem.photos_principales.indexOf(photo))}
                                                className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${activeImageIndex === selectedItem.photos_principales.indexOf(photo) ? 'border-primary scale-110' : 'border-gray-600 hover:border-gray-400 opacity-70 hover:opacity-100'
                                                    }`}
                                                title={`Image ${index + 1}`}
                                            >
                                                <img src={photo} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Infos */}
                            <div className="p-8 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-3xl font-bold text-text-primary mb-2">{selectedItem.name}</h2>
                                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                            {selectedItem.category}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="text-text-muted hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-6 flex-grow">
                                    {selectedItem.description && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Description</h3>
                                            <p className="text-text-primary leading-relaxed">{selectedItem.description}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedItem.etat_objet && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">État</h3>
                                                <p className="text-text-primary">{selectedItem.etat_objet}</p>
                                            </div>
                                        )}
                                        {selectedItem.date_acquisition && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">Acquis le</h3>
                                                <p className="text-text-primary">{new Date(selectedItem.date_acquisition).toLocaleDateString()}</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedItem.historyLog && (
                                        <div className="bg-background p-4 rounded-lg border border-gray-700">
                                            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Histoire de l'objet</h3>
                                            <p className="text-text-primary italic">"{selectedItem.historyLog}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className={`px-4 py-2 rounded-lg font-semibold ${selectedItem.status === 'keeper' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' :
                                            selectedItem.status === 'for_sale' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' :
                                                'bg-purple-900/30 text-purple-400 border border-purple-800'
                                            }`}>
                                            {selectedItem.status === 'keeper' ? '🔒 Pas à vendre' :
                                                selectedItem.status === 'for_sale' ? '💰 Disponible à l\'achat' : '🤝 Disponible à l\'échange'}
                                        </span>

                                        {selectedItem.status !== 'keeper' && (
                                            <button className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover shadow-lg shadow-orange-900/20 transition-colors">
                                                Contacter {user.pseudo}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
