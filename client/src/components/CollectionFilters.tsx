interface CollectionFiltersProps {
    categories: string[]
    selectedCategory: string
    onCategoryChange: (category: string) => void
    selectedStatus: string
    onStatusChange: (status: string) => void
    selectedSort: string
    onSortChange: (sort: string) => void
    onClearFilters: () => void
    hasActiveFilters: boolean
}

export default function CollectionFilters({
    categories,
    selectedCategory,
    onCategoryChange,
    selectedStatus,
    onStatusChange,
    selectedSort,
    onSortChange,
    onClearFilters,
    hasActiveFilters
}: CollectionFiltersProps) {
    return (
        <div className="flex flex-wrap gap-3 mb-6 items-center">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary font-medium">Catégorie:</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="px-3 py-2 bg-background-paper border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none text-sm"
                >
                    <option value="all">Toutes</option>
                    {categories.filter(c => c !== 'all').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary font-medium">Statut:</label>
                <select
                    value={selectedStatus}
                    onChange={(e) => onStatusChange(e.target.value)}
                    className="px-3 py-2 bg-background-paper border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none text-sm"
                >
                    <option value="all">Tous</option>
                    <option value="keeper">Gardé</option>
                    <option value="for_sale">À vendre</option>
                    <option value="for_exchange">Échange</option>
                </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary font-medium">Trier par:</label>
                <select
                    value={selectedSort}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="px-3 py-2 bg-background-paper border border-gray-600 rounded-lg text-text-primary focus:border-primary focus:outline-none text-sm"
                >
                    <option value="date_desc">Plus récent</option>
                    <option value="date_asc">Plus ancien</option>
                    <option value="name_asc">Nom (A-Z)</option>
                    <option value="name_desc">Nom (Z-A)</option>
                    <option value="price_asc">Prix croissant</option>
                    <option value="price_desc">Prix décroissant</option>
                </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={onClearFilters}
                    className="ml-auto px-4 py-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                >
                    ✕ Réinitialiser les filtres
                </button>
            )}
        </div>
    )
}
