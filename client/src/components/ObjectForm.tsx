import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addItem, updateItem, type CollectionItem } from '../services/collectionApi'

interface ObjectFormProps {
    initialData?: CollectionItem
    isEditing?: boolean
}

export default function ObjectForm({ initialData, isEditing = false }: ObjectFormProps) {
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [previewUrls, setPreviewUrls] = useState<string[]>(
        initialData?.photos_principales || []
    )
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [estimating, setEstimating] = useState(false)

    // Form states
    const [name, setName] = useState(initialData?.name || '')
    const [status, setStatus] = useState(initialData?.status || 'keeper')
    const [category, setCategory] = useState(initialData?.category || '')
    const [subCategory, setSubCategory] = useState(initialData?.subCategory || '')
    const [description, setDescription] = useState(initialData?.description || '')
    const [purchasePrice, setPurchasePrice] = useState(initialData?.purchasePrice?.toString() || '')
    const [estimatedValue, setEstimatedValue] = useState(initialData?.valeur_estimee?.toString() || '')
    const [acquisitionDate, setAcquisitionDate] = useState(
        initialData?.date_acquisition ? new Date(initialData.date_acquisition).toISOString().split('T')[0] : ''
    )
    const [storageLocation, setStorageLocation] = useState(initialData?.emplacement_stockage || '')
    const [condition, setCondition] = useState(initialData?.etat_objet || '')
    const [historyLog, setHistoryLog] = useState(initialData?.historyLog || '')
    const [isPublic, setIsPublic] = useState(initialData?.isPublic || false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            const remainingSlots = 3 - previewUrls.length
            const filesToAdd = files.slice(0, remainingSlots)

            if (filesToAdd.length > 0) {
                const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file))
                setPreviewUrls(prev => [...prev, ...newPreviewUrls])
                setSelectedFiles(prev => [...prev, ...filesToAdd])
            }
        }
    }

    const removeImage = (index: number) => {
        setPreviewUrls(prev => prev.filter((_, i) => i !== index))
        // Note: Removing from selectedFiles is tricky because we don't know which file corresponds to which initial URL
        // For simplicity in this version, we'll just clear selectedFiles if user removes an image, forcing them to re-select if they made a mistake
        // A more robust solution would track which preview URL comes from which file source
        if (index >= (initialData?.photos_principales?.length || 0)) {
            // It was a newly added file
            const fileIndex = index - (initialData?.photos_principales?.length || 0)
            setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex))
        }
    }

    const handleEstimateValue = async () => {
        if (selectedFiles.length === 0) {
            setError("Veuillez ajouter au moins une photo pour l'estimation")
            return
        }

        setEstimating(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('image', selectedFiles[0])

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
            const response = await fetch(`${apiUrl}/api/value/photo`, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'estimation')
            }

            if (data.success) {
                if (data.estimatedMax > 0) {
                    // Mettre à jour la valeur estimée avec la moyenne
                    setEstimatedValue(data.averagePrice.toFixed(2))

                    // Si le nom est vide, on peut suggérer des mots-clés
                    if (!name && data.keywords.length > 0) {
                        // On ne remplace pas, on suggère juste via placeholder ou alert?
                        // Pour l'instant on ne touche pas au nom pour ne pas être intrusif
                    }

                    alert(`Estimation réussie !\nFourchette : ${data.estimatedMin}€ - ${data.estimatedMax}€\nMoyenne : ${data.averagePrice.toFixed(2)}€\nBasé sur ${data.itemCount} objets similaires trouvés sur eBay.`)
                } else {
                    alert("Aucun objet similaire avec prix trouvé, mais l'analyse visuelle a fonctionné.\nMots-clés : " + data.keywords.join(', '))
                }
            }
        } catch (err: any) {
            console.error('Erreur estimation:', err)
            setError(err.message || "Erreur lors de l'estimation")
        } finally {
            setEstimating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('name', name)
            formData.append('status', status)
            formData.append('isPublic', String(isPublic))

            if (category) formData.append('category', category)
            if (subCategory) formData.append('subCategory', subCategory)
            if (description) formData.append('description', description)
            if (purchasePrice) formData.append('purchasePrice', purchasePrice)
            if (estimatedValue) formData.append('valeur_estimee', estimatedValue)
            if (acquisitionDate) formData.append('date_acquisition', acquisitionDate)
            if (storageLocation) formData.append('emplacement_stockage', storageLocation)
            if (condition) formData.append('etat_objet', condition)
            if (historyLog) formData.append('historyLog', historyLog)

            selectedFiles.forEach(file => {
                formData.append('photos', file)
            })

            if (isEditing && initialData) {
                await updateItem(initialData._id, formData)
            } else {
                await addItem(formData)
            }

            navigate('/mon-compte')
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto bg-background-paper p-6 rounded-lg shadow-lg border border-gray-700">

            {/* Photo Upload Section */}
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                    {previewUrls.map((url, index) => (
                        <div key={index} className="aspect-square relative rounded-lg overflow-hidden border border-gray-600 group">
                            <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {previewUrls.length < 3 && (
                        <div
                            className="aspect-square bg-background-lighter border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span className="text-3xl mb-2">📷</span>
                            <span className="text-xs text-text-secondary text-center px-2">
                                Ajouter ({3 - previewUrls.length} restants)
                            </span>
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                />
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* Main Info */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-gray-700 pb-2">Informations Principales</h3>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Nom de l'objet *</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        placeholder="Ex: Vase Gallé, Carte Pokémon Dracaufeu..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Statut *</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as any)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        >
                            <option value="keeper">🛡️ À Garder (Collection)</option>
                            <option value="for_sale">💰 À Vendre</option>
                            <option value="for_exchange">🤝 À Échanger</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Visibilité</label>
                        <div className="flex items-center space-x-3 mt-2">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={e => setIsPublic(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary bg-background"
                                />
                                <span className="ml-2 text-text-primary">Rendre public</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Catégorie</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="Ex: Verrerie, Cartes..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Sous-catégorie</label>
                        <input
                            type="text"
                            value={subCategory}
                            onChange={e => setSubCategory(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="Ex: Art Nouveau, Set de base..."
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        placeholder="Détails sur l'objet..."
                    />
                </div>
            </div>

            {/* Details & History */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-gray-700 pb-2 pt-4">Détails & Historique</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Date d'acquisition</label>
                        <input
                            type="date"
                            value={acquisitionDate}
                            onChange={e => setAcquisitionDate(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">État de l'objet</label>
                        <input
                            type="text"
                            value={condition}
                            onChange={e => setCondition(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="Ex: Neuf, Bon état, Restauré..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Prix d'achat (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={purchasePrice}
                            onChange={e => setPurchasePrice(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Valeur estimée (€)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                value={estimatedValue}
                                onChange={e => setEstimatedValue(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                                placeholder="0.00"
                            />
                            <button
                                type="button"
                                onClick={handleEstimateValue}
                                disabled={estimating || selectedFiles.length === 0}
                                className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-md"
                                title={selectedFiles.length === 0 ? "Ajoutez une photo d'abord" : "Estimer la valeur via IA"}
                                style={{ top: '50%', right: '8px' }}
                            >
                                {estimating ? (
                                    <span className="animate-spin">↻</span>
                                ) : (
                                    <span>✨ IA</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Emplacement de stockage</label>
                    <input
                        type="text"
                        value={storageLocation}
                        onChange={e => setStorageLocation(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        placeholder="Ex: Étagère du salon, Carton 4..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Notes d'historique</label>
                    <textarea
                        value={historyLog}
                        onChange={e => setHistoryLog(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                        placeholder="Acheté à la brocante de..."
                    />
                </div>
            </div>

            <div className="pt-6 flex justify-end space-x-4">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 border border-gray-600 rounded-lg text-text-secondary hover:bg-gray-800 transition-colors"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`px-8 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Ajouter à ma collection')}
                </button>
            </div>
        </form>
    )
}
