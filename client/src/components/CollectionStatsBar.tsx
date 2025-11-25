import { type CollectionStats } from '../types'

interface CollectionStatsProps {
    stats: CollectionStats | null
    loading: boolean
}

export default function CollectionStatsBar({ stats, loading }: CollectionStatsProps) {
    if (loading || !stats) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-background-paper rounded-lg p-4 border border-gray-700 animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                        <div className="h-8 bg-gray-700 rounded w-16"></div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Total Items */}
            <div className="bg-background-paper rounded-lg p-4 border border-gray-700 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-secondary mb-1">Total objets</p>
                        <p className="text-2xl font-bold text-text-primary">{stats.totalItems}</p>
                    </div>
                    <span className="text-3xl">📦</span>
                </div>
            </div>

            {/* Total Value */}
            <div className="bg-background-paper rounded-lg p-4 border border-gray-700 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-secondary mb-1">Valeur totale</p>
                        <p className="text-2xl font-bold text-primary">{stats.totalValue.toFixed(0)}€</p>
                    </div>
                    <span className="text-3xl">💰</span>
                </div>
            </div>

            {/* For Sale */}
            <div className="bg-background-paper rounded-lg p-4 border border-gray-700 hover:border-yellow-500 transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-secondary mb-1">À vendre</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats.byStatus.for_sale}</p>
                    </div>
                    <span className="text-3xl">🏷️</span>
                </div>
            </div>

            {/* Keeper */}
            <div className="bg-background-paper rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-secondary mb-1">Collection</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.byStatus.keeper}</p>
                    </div>
                    <span className="text-3xl">⭐</span>
                </div>
            </div>
        </div>
    )
}
