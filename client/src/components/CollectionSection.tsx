import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    searchCollection,
    deleteItem,
    updateItem,
    getCollectionStats,
    bulkDeleteItems,
    bulkUpdateStatus,
    importCSV,
    type CollectionItem
} from '../services/collectionApi'
import type { User } from '../utils/authUtils'
import type { CollectionStats } from '../types'
import CollectionStatsBar from './CollectionStatsBar'
import CollectionSearchBar from './CollectionSearchBar'
import CollectionFilters from './CollectionFilters'
import CollectionTable from './CollectionTable'
import BulkActionsBar from './BulkActionsBar'
import QuickViewModal from './QuickViewModal'
import { useRef } from 'react'

interface CollectionSectionProps {
    user: User | null
}

export default function CollectionSection({ user }: CollectionSectionProps) {
    // Data states
    const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([])
    const [stats, setStats] = useState<CollectionStats | null>(null)
    const [loadingCollection, setLoadingCollection] = useState(false)
    const [loadingStats, setLoadingStats] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Search & Filter states
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedStatus, setSelectedStatus] = useState('all')
    const [selectedSort, setSelectedSort] = useState('date_desc')
    const [totalCount, setTotalCount] = useState(0)

    // Selection states
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Modal states
    const [editingItem, setEditingItem] = useState<CollectionItem | null>(null)
    const [quickViewItem, setQuickViewItem] = useState<CollectionItem | null>(null)
    const [editForm, setEditForm] = useState<Partial<CollectionItem>>({})
    const [saving, setSaving] = useState(false)

    // Image states for edit modal
    const [imageSlots, setImageSlots] = useState<(string | File | null)[]>([null, null, null])

    // Load collection and stats on mount
    useEffect(() => {
        loadCollection()
        loadStats()
    }, [])

    // Reload collection when search/filter/sort changes
    useEffect(() => {
        loadCollection()
    }, [searchQuery, selectedCategory, selectedStatus, selectedSort])

    const loadCollection = async () => {
        setLoadingCollection(true)
        try {
            const result = await searchCollection({
                q: searchQuery || undefined,
                category: selectedCategory !== 'all' ? selectedCategory : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                sort: selectedSort,
                limit: 1000 // Load all for now, can add pagination later
            })
            setCollectionItems(result.data)
            setTotalCount(result.pagination?.total || result.data.length)
        } catch (error) {
            console.error('Erreur chargement collection:', error)
        } finally {
            setLoadingCollection(false)
        }
    }

    const loadStats = async () => {
        setLoadingStats(true)
        try {
            const statsData = await getCollectionStats()
            setStats(statsData)
        } catch (error) {
            console.error('Erreur chargement stats:', error)
        } finally {
            setLoadingStats(false)
        }
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const result = await importCSV(file)
            alert(`Import terminé avec succès ! ${result.success} objets importés.`)
            await loadCollection()
            await loadStats()
        } catch (error: any) {
            console.error('Erreur import:', error)
            alert(`Erreur lors de l'import: ${error.message}`)
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleDeleteItem = async (itemId: string, itemName: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${itemName}" ?`)) {
            return
        }

        try {
            await deleteItem(itemId)
            await loadCollection()
            await loadStats()
            setSelectedIds(selectedIds.filter(id => id !== itemId))
        } catch (error) {
            console.error('Error deleting item:', error)
            alert('Erreur lors de la suppression de l\'objet')
        }
    }

    const handleBulkDelete = async () => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} objet(s) ?`)) {
            return
        }

        try {
            await bulkDeleteItems(selectedIds)
            await loadCollection()
            await loadStats()
            setSelectedIds([])
        } catch (error) {
            console.error('Error bulk deleting:', error)
            alert('Erreur lors de la suppression des objets')
        }
    }

    const handleBulkStatusChange = async (status: string) => {
        try {
            await bulkUpdateStatus(selectedIds, status)
            await loadCollection()
            await loadStats()
            setSelectedIds([])
        } catch (error) {
            console.error('Error bulk updating status:', error)
            alert('Erreur lors de la modification du statut')
        }
    }

    const handleEditClick = (item: CollectionItem) => {
        setEditingItem(item)
        setEditForm({
            name: item.name,
            category: item.category,
            subCategory: item.subCategory,
            description: item.description,
            purchasePrice: item.purchasePrice,
            etat_objet: item.etat_objet,
            status: item.status,
            isPublic: item.isPublic,
            historyLog: item.historyLog
        })

        // Initialize slots with existing images or null
        const currentPhotos = item.photos_principales || []
        setImageSlots([
            currentPhotos[0] || null,
            currentPhotos[1] || null,
            currentPhotos[2] || null
        ])
    }

    const handleSaveEdit = async () => {
        if (!editingItem) return

        setSaving(true)
        try {
            const formData = new FormData()

            // Add all modified fields
            if (editForm.name) formData.append('name', editForm.name)
            if (editForm.category) formData.append('category', editForm.category)
            if (editForm.subCategory) formData.append('subCategory', editForm.subCategory)
            if (editForm.description) formData.append('description', editForm.description)
            if (editForm.purchasePrice !== undefined) formData.append('purchasePrice', editForm.purchasePrice.toString())
            if (editForm.etat_objet) formData.append('etat_objet', editForm.etat_objet)
            if (editForm.status) formData.append('status', editForm.status)
            if (editForm.historyLog) formData.append('historyLog', editForm.historyLog)
            formData.append('isPublic', editForm.isPublic ? 'true' : 'false')

            // Construct image layout FIRST
            const layout = imageSlots.map(slot => {
                if (slot instanceof File) {
                    return 'new'
                }
                return slot // URL or null
            })

            const layoutString = JSON.stringify(layout)
            formData.append('image_layout', layoutString)

            // Append files LAST
            imageSlots.forEach(slot => {
                if (slot instanceof File) {
                    formData.append('photos', slot)
                }
            })

            await updateItem(editingItem._id, formData)
            await loadCollection()
            await loadStats()
            setEditingItem(null)
            setEditForm({})
            setImageSlots([null, null, null])

        } catch (error: any) {
            console.error('Error updating item:', error)
            alert(`Erreur lors de la modification de l'objet: ${error.message || 'Erreur inconnue'}`)
        } finally {
            setSaving(false)
        }
    }

    const handleClearFilters = () => {
        setSearchQuery('')
        setSelectedCategory('all')
        setSelectedStatus('all')
        setSelectedSort('date_desc')
    }

    const categories = ['all', ...new Set(collectionItems.map(item => item.category || 'Autre').filter(Boolean))]
    const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedSort !== 'date_desc'

    return (
        <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    🏺 Ma Collection
                </h2>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv,.xlsx"
                        className="hidden"
                    />
                    <button
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="bg-background-paper border border-gray-600 text-text-primary px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-semibold flex items-center gap-2"
                    >
                        <span>{isImporting ? 'Importation...' : '📥 Importer CSV'}</span>
                    </button>
                    {user?.displayName && (
                        <Link
                            to={`/collection/${user.displayName}`}
                            className="bg-background-paper border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors font-semibold flex items-center gap-2"
                            target="_blank"
                        >
                            <span>👁️ Voir ma vitrine</span>
                        </Link>
                    )}
                    <Link
                        to="/ma-collection/ajouter"
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/20 font-semibold flex items-center gap-2"
                    >
                        <span>+ Ajouter un objet</span>
                    </Link>
                </div>
            </div>

            {/* Statistics */}
            <CollectionStatsBar stats={stats} loading={loadingStats} />

            {loadingCollection && !collectionItems.length ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
            ) : collectionItems.length > 0 || searchQuery || hasActiveFilters ? (
                <div>
                    {/* Search Bar */}
                    <CollectionSearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        resultCount={collectionItems.length}
                        totalCount={totalCount}
                        loading={loadingCollection}
                    />

                    {/* Filters */}
                    <CollectionFilters
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        selectedStatus={selectedStatus}
                        onStatusChange={setSelectedStatus}
                        selectedSort={selectedSort}
                        onSortChange={setSelectedSort}
                        onClearFilters={handleClearFilters}
                        hasActiveFilters={hasActiveFilters}
                    />

                    {/* Bulk Actions Bar */}
                    <BulkActionsBar
                        selectedCount={selectedIds.length}
                        onBulkDelete={handleBulkDelete}
                        onBulkStatusChange={handleBulkStatusChange}
                        onDeselectAll={() => setSelectedIds([])}
                    />

                    {/* Collection Table */}
                    <CollectionTable
                        items={collectionItems}
                        loading={loadingCollection}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteItem}
                        onView={setQuickViewItem}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                    />
                </div>
            ) : (
                <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-6 text-center">
                    <p className="text-text-muted mb-4">Vous n'avez pas encore ajouté d'objets à votre collection.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/ma-collection/ajouter" className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors">
                            ➕ Ajouter un objet
                        </Link>
                        <Link to="/ma-collection/importer-csv" className="px-6 py-2 border border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors">
                            📄 Importer un CSV
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick View Modal */}
            <QuickViewModal
                item={quickViewItem}
                onClose={() => setQuickViewItem(null)}
                onEdit={handleEditClick}
            />

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditingItem(null)}>
                    <div className="bg-background-paper rounded-lg shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-background-paper border-b border-gray-700 p-6 flex justify-between items-center z-10">
                            <h3 className="text-2xl font-bold text-text-primary">Modifier l'objet</h3>
                            <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Nom */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Nom *</label>
                                <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Catégorie */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Catégorie</label>
                                    <input
                                        type="text"
                                        value={editForm.category || ''}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                    />
                                </div>

                                {/* Sous-catégorie */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Sous-catégorie</label>
                                    <input
                                        type="text"
                                        value={editForm.subCategory || ''}
                                        onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                                <textarea
                                    value={editForm.description || ''}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                />
                            </div>

                            {/* Images - 3 slots */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-3">Images de l'objet</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Image à la une */}
                                    <ImageSlot
                                        label="📸 Image à la une"
                                        color="primary"
                                        content={imageSlots[0]}
                                        onUpdate={(content) => {
                                            const updated = [...imageSlots]
                                            updated[0] = content
                                            setImageSlots(updated)
                                        }}
                                    />

                                    {/* Dos de l'objet */}
                                    <ImageSlot
                                        label="🔄 Dos de l'objet"
                                        color="blue"
                                        content={imageSlots[1]}
                                        onUpdate={(content) => {
                                            const updated = [...imageSlots]
                                            updated[1] = content
                                            setImageSlots(updated)
                                        }}
                                    />

                                    {/* Image bonus */}
                                    <ImageSlot
                                        label="✨ Image bonus"
                                        color="green"
                                        content={imageSlots[2]}
                                        onUpdate={(content) => {
                                            const updated = [...imageSlots]
                                            updated[2] = content
                                            setImageSlots(updated)
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Prix d'achat */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Prix d'achat (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.purchasePrice || ''}
                                        onChange={(e) => setEditForm({ ...editForm, purchasePrice: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                    />
                                </div>

                                {/* État */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">État</label>
                                    <select
                                        value={editForm.etat_objet || ''}
                                        onChange={(e) => setEditForm({ ...editForm, etat_objet: e.target.value })}
                                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                    >
                                        <option value="">Sélectionner...</option>
                                        <option value="excellent">Excellent</option>
                                        <option value="good">Bon</option>
                                        <option value="fair">Moyen</option>
                                        <option value="poor">Mauvais</option>
                                    </select>
                                </div>

                                {/* Statut */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Statut</label>
                                    <select
                                        value={editForm.status || ''}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'keeper' | 'for_sale' | 'for_exchange' })}
                                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none"
                                    >
                                        <option value="keeper">Gardé</option>
                                        <option value="for_sale">À Vendre</option>
                                        <option value="for_exchange">Échange</option>
                                    </select>
                                </div>
                            </div>

                            {/* Public */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={editForm.isPublic || false}
                                    onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                                    className="w-5 h-5 text-primary bg-background border-gray-600 rounded focus:ring-primary"
                                />
                                <label htmlFor="isPublic" className="text-sm font-medium text-text-secondary">
                                    Visible dans ma vitrine publique
                                </label>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-background-paper border-t border-gray-700 p-6 flex gap-3 justify-end z-10">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-6 py-2 border border-gray-600 rounded-lg text-text-primary hover:bg-gray-700 transition-colors"
                                disabled={saving}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

// Composant pour un slot d'image
interface ImageSlotProps {
    label: string
    color: 'primary' | 'blue' | 'green'
    content: string | File | null
    onUpdate: (content: string | File | null) => void
}

function ImageSlot({ label, color, content, onUpdate }: ImageSlotProps) {
    const colorClasses = {
        primary: 'bg-primary hover:bg-primary-hover text-primary border-primary',
        blue: 'bg-blue-600 hover:bg-blue-700 text-blue-400 border-blue-600',
        green: 'bg-green-600 hover:bg-green-700 text-green-400 border-green-600'
    }

    const displayImage = content instanceof File ? URL.createObjectURL(content) : content

    return (
        <div className="border border-gray-600 rounded-lg p-3 bg-background">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${colorClasses[color].split(' ')[4]}`}>{label}</span>
                {content && (
                    <button
                        type="button"
                        onClick={() => onUpdate(null)}
                        className="text-xs text-red-400 hover:text-red-300"
                    >
                        🗑️ Supprimer
                    </button>
                )}
            </div>
            <div className="aspect-square bg-gray-800 rounded border border-gray-700 overflow-hidden mb-2">
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={label}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <span className="text-4xl">📷</span>
                    </div>
                )}
            </div>
            <label className={`block w-full text-xs px-2 py-2 ${colorClasses[color].split(' ').slice(0, 2).join(' ')} text-white rounded text-center cursor-pointer transition-colors`}>
                {content ? 'Remplacer' : 'Choisir'}
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onUpdate(file)
                    }}
                    className="hidden"
                />
            </label>
        </div>
    )
}
