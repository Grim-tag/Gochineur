interface BulkActionsBarProps {
    selectedCount: number
    onBulkDelete: () => void
    onBulkStatusChange: (status: string) => void
    onDeselectAll: () => void
}

export default function BulkActionsBar({
    selectedCount,
    onBulkDelete,
    onBulkStatusChange,
    onDeselectAll
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null

    return (
        <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-lg">{selectedCount}</span>
                <span className="text-text-secondary">objet{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}</span>
            </div>

            <div className="flex gap-2 ml-auto">
                {/* Change Status */}
                <select
                    onChange={(e) => {
                        if (e.target.value) {
                            onBulkStatusChange(e.target.value)
                            e.target.value = ''
                        }
                    }}
                    className="px-3 py-2 bg-background-paper border border-gray-600 rounded-lg text-text-primary text-sm hover:border-primary transition-colors"
                    defaultValue=""
                >
                    <option value="" disabled>Changer le statut...</option>
                    <option value="keeper">→ Gardé</option>
                    <option value="for_sale">→ À vendre</option>
                    <option value="for_exchange">→ Échange</option>
                </select>

                {/* Bulk Delete */}
                <button
                    onClick={onBulkDelete}
                    className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-800/50 rounded-lg hover:bg-red-600/30 text-sm font-medium transition-colors"
                >
                    🗑️ Supprimer
                </button>

                {/* Deselect All */}
                <button
                    onClick={onDeselectAll}
                    className="px-4 py-2 border border-gray-600 rounded-lg text-text-primary hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                    Tout désélectionner
                </button>
            </div>
        </div>
    )
}
