import { type CollectionItem } from '../services/collectionApi'

interface QuickViewModalProps {
    item: CollectionItem | null
    onClose: () => void
    onEdit: (item: CollectionItem) => void
}

export default function QuickViewModal({ item, onClose, onEdit }: QuickViewModalProps) {
    if (!item) return null

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'keeper': return 'Gardé'
            case 'for_sale': return 'À vendre'
            case 'for_exchange': return 'Échange'
            default: return status
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'keeper': return 'bg-blue-500/80 text-white'
            case 'for_sale': return 'bg-yellow-500/80 text-white'
            case 'for_exchange': return 'bg-purple-500/80 text-white'
            default: return 'bg-gray-500/80 text-white'
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-background-paper rounded-lg shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-background-paper border-b border-gray-700 p-6 flex justify-between items-center z-10">
                    <h3 className="text-2xl font-bold text-text-primary">{item.name}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Images */}
                    {item.photos_principales && item.photos_principales.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {item.photos_principales.map((photo, index) => (
                                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                                    <img
                                        src={photo}
                                        alt={`${item.name} - Photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Catégorie</label>
                            <p className="text-text-primary">{item.category || 'Non classé'}</p>
                        </div>

                        {item.subCategory && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Sous-catégorie</label>
                                <p className="text-text-primary">{item.subCategory}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Statut</label>
                            <span className={`inline-block text-xs px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
                                {getStatusLabel(item.status)}
                            </span>
                        </div>

                        {item.purchasePrice && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Prix d'achat</label>
                                <p className="text-primary font-bold text-lg">{item.purchasePrice}€</p>
                            </div>
                        )}

                        {item.etat_objet && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">État</label>
                                <p className="text-text-primary capitalize">{item.etat_objet}</p>
                            </div>
                        )}

                        {item.emplacement_stockage && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Emplacement</label>
                                <p className="text-text-primary">{item.emplacement_stockage}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Visibilité</label>
                            <p className="text-text-primary">
                                {item.isPublic ? (
                                    <span className="text-green-400">✓ Public</span>
                                ) : (
                                    <span className="text-gray-400">Privé</span>
                                )}
                            </p>
                        </div>

                        {item.createdAt && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Ajouté le</label>
                                <p className="text-text-primary">
                                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                            <p className="text-text-primary whitespace-pre-wrap bg-background rounded-lg p-4 border border-gray-700">
                                {item.description}
                            </p>
                        </div>
                    )}

                    {/* History Log */}
                    {item.historyLog && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Historique</label>
                            <p className="text-text-primary whitespace-pre-wrap bg-background rounded-lg p-4 border border-gray-700">
                                {item.historyLog}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-background-paper border-t border-gray-700 p-6 flex gap-3 justify-end z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-600 rounded-lg text-text-primary hover:bg-gray-700 transition-colors"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={() => {
                            onEdit(item)
                            onClose()
                        }}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/20"
                    >
                        ✏️ Modifier
                    </button>
                </div>
            </div>
        </div>
    )
}
