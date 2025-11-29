interface ObjectFormData {
    name: string
    status: string
    category: string
    subCategory: string
    description: string
    purchasePrice: string
    estimatedValue: string
    acquisitionDate: string
    storageLocation: string
    condition: string
    historyLog: string
    isPublic: boolean
}

interface ObjectFormFieldsProps {
    formData: ObjectFormData
    onChange: (field: keyof ObjectFormData, value: any) => void
    isAdmin?: boolean
}

export default function ObjectFormFields({
    formData,
    onChange,
    isAdmin = false
}: ObjectFormFieldsProps) {
    return (
        <div className="space-y-8">
            {/* Main Info */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-gray-700 pb-2">Informations Principales</h3>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Nom de l'objet *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => onChange('name', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        placeholder="Ex: Vase Gallé, Carte Pokémon Dracaufeu..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Statut *</label>
                        <select
                            required
                            value={formData.status}
                            onChange={e => onChange('status', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        >
                            <option value="keeper">🏠 Keeper (à garder)</option>
                            <option value="seller">💰 Seller (à vendre)</option>
                            <option value="sold">✅ Vendu</option>
                        </select>
                    </div>

                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Visibilité</label>
                            <label className="flex items-center gap-2 px-4 py-2 bg-background border border-gray-600 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isPublic}
                                    onChange={e => onChange('isPublic', e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary"
                                />
                                <span className="text-text-primary">Public (visible par tous)</span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Catégorie</label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={e => onChange('category', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="Ex: Art, Jeux vidéo, Cartes..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Sous-catégorie</label>
                        <input
                            type="text"
                            value={formData.subCategory}
                            onChange={e => onChange('subCategory', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="Ex: Verrerie, Pokémon..."
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={e => onChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary resize-none"
                        placeholder="Décrivez l'objet..."
                    />
                </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-gray-700 pb-2">Détails Financiers</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Date d'acquisition</label>
                        <input
                            type="date"
                            value={formData.acquisitionDate}
                            onChange={e => onChange('acquisitionDate', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">État de l'objet</label>
                        <input
                            type="text"
                            value={formData.condition}
                            onChange={e => onChange('condition', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="Ex: Neuf, Très bon état, Usé..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Prix d'achat (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.purchasePrice}
                            onChange={e => onChange('purchasePrice', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Valeur estimée (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.estimatedValue}
                            onChange={e => onChange('estimatedValue', e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="0.00"
                        />
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-gray-700 pb-2">Informations Complémentaires</h3>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Emplacement de stockage</label>
                    <input
                        type="text"
                        value={formData.storageLocation}
                        onChange={e => onChange('storageLocation', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        placeholder="Ex: Grenier, Cave, Vitrine salon..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Historique / Notes</label>
                    <textarea
                        value={formData.historyLog}
                        onChange={e => onChange('historyLog', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary resize-none"
                        placeholder="Provenance, histoire, anecdotes..."
                    />
                </div>
            </div>
        </div>
    )
}
