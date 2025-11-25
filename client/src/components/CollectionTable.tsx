import { type CollectionItem } from '../services/collectionApi'

interface CollectionTableProps {
    items: CollectionItem[]
    loading: boolean
    onEdit: (item: CollectionItem) => void
    onDelete: (itemId: string, itemName: string) => void
    onView: (item: CollectionItem) => void
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void
}

export default function CollectionTable({
    items,
    loading,
    onEdit,
    onDelete,
    onView,
    selectedIds,
    onSelectionChange
}: CollectionTableProps) {
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onSelectionChange(items.map(item => item._id))
        } else {
            onSelectionChange([])
        }
    }

    const handleSelectOne = (itemId: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedIds, itemId])
        } else {
            onSelectionChange(selectedIds.filter(id => id !== itemId))
        }
    }

    const isAllSelected = items.length > 0 && selectedIds.length === items.length
    const isSomeSelected = selectedIds.length > 0 && selectedIds.length < items.length

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

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-text-muted mt-4">Chargement...</p>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="bg-background-paper rounded-lg border border-gray-700 p-8 text-center">
                <span className="text-6xl mb-4 block">📦</span>
                <p className="text-text-muted text-lg">Aucun objet trouvé</p>
            </div>
        )
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-background-paper rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-background-lighter border-b border-gray-700">
                                <th className="p-3 text-left w-12">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={input => {
                                            if (input) input.indeterminate = isSomeSelected
                                        }}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="w-4 h-4 text-primary bg-background border-gray-600 rounded focus:ring-primary"
                                    />
                                </th>
                                <th className="p-3 text-left w-20">Image</th>
                                <th className="p-3 text-left font-semibold text-text-secondary">Nom</th>
                                <th className="p-3 text-left font-semibold text-text-secondary">Catégorie</th>
                                <th className="p-3 text-left font-semibold text-text-secondary">Prix</th>
                                <th className="p-3 text-left font-semibold text-text-secondary">Statut</th>
                                <th className="p-3 text-right font-semibold text-text-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const isSelected = selectedIds.includes(item._id)
                                return (
                                    <tr
                                        key={item._id}
                                        className={`border-b border-gray-700 hover:bg-background-lighter transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                                    >
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleSelectOne(item._id, e.target.checked)}
                                                className="w-4 h-4 text-primary bg-background border-gray-600 rounded focus:ring-primary"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="w-16 h-16 rounded overflow-hidden bg-gray-800">
                                                {item.photos_principales && item.photos_principales[0] ? (
                                                    <img
                                                        src={item.photos_principales[0]}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <span className="text-2xl">📷</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-semibold text-text-primary">{item.name}</div>
                                            {item.description && (
                                                <div className="text-xs text-text-muted truncate max-w-xs mt-1">
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-text-secondary">{item.category || 'Non classé'}</td>
                                        <td className="p-3">
                                            {item.purchasePrice ? (
                                                <span className="text-primary font-semibold">{item.purchasePrice}€</span>
                                            ) : (
                                                <span className="text-text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => onView(item)}
                                                    className="text-lg hover:scale-110 transition-transform"
                                                    title="Voir"
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => onEdit(item)}
                                                    className="text-lg hover:scale-110 transition-transform"
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => onDelete(item._id, item.name)}
                                                    className="text-lg hover:scale-110 transition-transform"
                                                    title="Supprimer"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {items.map((item) => {
                    const isSelected = selectedIds.includes(item._id)
                    return (
                        <div
                            key={item._id}
                            className={`bg-background-paper rounded-lg border ${isSelected ? 'border-primary bg-primary/10' : 'border-gray-700'} p-4`}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectOne(item._id, e.target.checked)}
                                    className="mt-1 w-4 h-4 text-primary bg-background border-gray-600 rounded focus:ring-primary"
                                />
                                <div className="w-20 h-20 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                                    {item.photos_principales && item.photos_principales[0] ? (
                                        <img
                                            src={item.photos_principales[0]}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            <span className="text-3xl">📷</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-text-primary truncate">{item.name}</h3>
                                    <p className="text-sm text-text-secondary">{item.category || 'Non classé'}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                                            {getStatusLabel(item.status)}
                                        </span>
                                        {item.purchasePrice && (
                                            <span className="text-primary font-semibold text-sm">{item.purchasePrice}€</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                                <button
                                    onClick={() => onView(item)}
                                    className="flex-1 py-2 px-3 bg-background-lighter text-text-primary rounded hover:bg-gray-700 text-sm font-medium transition-colors"
                                >
                                    👁️ Voir
                                </button>
                                <button
                                    onClick={() => onEdit(item)}
                                    className="flex-1 py-2 px-3 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-sm font-medium transition-colors"
                                >
                                    ✏️ Modifier
                                </button>
                                <button
                                    onClick={() => onDelete(item._id, item.name)}
                                    className="py-2 px-3 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 text-sm font-medium transition-colors"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}
