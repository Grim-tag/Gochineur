import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addItem, updateItem, type CollectionItem } from '../services/collectionApi'
import { getUserFromToken, getToken } from '../services/auth'

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

    // Estimation states
    const [estimationStep, setEstimationStep] = useState<'idle' | 'analyzing' | 'review' | 'estimating' | 'complete'>('idle')
    const [identifiedName, setIdentifiedName] = useState('')
    const [estimationStats, setEstimationStats] = useState<{ min: number, max: number, count: number } | null>(null)

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

    // Check permissions
    const user = getUserFromToken()
    const isAdmin = user?.role === 'admin'

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
        if (index >= (initialData?.photos_principales?.length || 0)) {
            const fileIndex = index - (initialData?.photos_principales?.length || 0)
            setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex))
        }
    }

    // Step 1: Identify Photo (SerpApi)
    const handleAnalyzePhoto = async () => {
        if (selectedFiles.length === 0) {
            setError("Veuillez ajouter au moins une photo pour l'estimation")
            return
        }

        setEstimationStep('analyzing')
        setError(null)

        try {
            const formData = new FormData()
            formData.append('image', selectedFiles[0])

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
            const response = await fetch(`${apiUrl}/api/value/identify-photo`, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'identification')
            }

            if (data.success) {
                setIdentifiedName(data.identifiedTitle || '')
                setEstimationStep('review')
                // Pre-fill name if empty
                if (!name && data.identifiedTitle) {
                    setName(data.identifiedTitle)
                }
            }
        } catch (err: any) {
            console.error('Erreur identification:', err)
            setError(err.message || "Erreur lors de l'identification")
            setEstimationStep('idle')
        }
    }

    // Step 2: Estimate Price (eBay Finding API - Sold Items)
    const handleEstimatePrice = async () => {
        setEstimationStep('estimating')
        setError(null)

        try {
            const token = getToken();
            if (!token) {
                throw new Error("Vous devez être connecté pour utiliser cette fonctionnalité.");
            }

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
            const response = await fetch(`${apiUrl}/api/value/estimate-by-title`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ searchQuery: identifiedName })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'estimation')
            }

            if (data.success) {
                setEstimatedValue(data.averagePrice.toFixed(2))
                setEstimationStats({
                    min: data.minPrice,
                    max: data.maxPrice,
                    count: data.soldCount
                })
                setEstimationStep('complete')

                // Update main name if user edited it in the review step
                if (identifiedName && identifiedName !== name) {
                    if (window.confirm(`Voulez-vous utiliser "${identifiedName}" comme nom principal de l'objet ?`)) {
                        setName(identifiedName)
                    }
                }
            }
        } catch (err: any) {
            console.error('Erreur estimation:', err)
            setError(err.message || "Erreur lors de l'estimation")
            setEstimationStep('review')
        }
    }

    const resetEstimation = () => {
        setEstimationStep('idle')
        setIdentifiedName('')
        setEstimationStats(null)
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

            {/* AI Estimation Section (New V2 Flow) - Admin Only */}
            {isAdmin && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <span>✨</span> Estimation IA (Prix Réels)
                    </h3>

                    {estimationStep === 'idle' && (
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleAnalyzePhoto}
                                disabled={selectedFiles.length === 0}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                📷 Analyser la photo
                            </button>
                            {selectedFiles.length === 0 && (
                                <p className="text-xs text-text-secondary mt-2">Ajoutez une photo d'abord</p>
                            )}
                        </div>
                    )}

                    {estimationStep === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <p className="text-text-secondary animate-pulse">Identification de l'objet en cours...</p>
                        </div>
                    )}

                    {estimationStep === 'review' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-start gap-4">
                                {previewUrls.length > 0 && (
                                    <img src={previewUrls[0]} alt="Thumbnail" className="w-16 h-16 object-cover rounded border border-gray-600" />
                                )}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Objet identifié (Modifiez si nécessaire)
                                    </label>
                                    <input
                                        type="text"
                                        value={identifiedName}
                                        onChange={(e) => setIdentifiedName(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-gray-600 rounded focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={resetEstimation}
                                    className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEstimatePrice}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
                                >
                                    💰 Lancer l'estimation finale
                                </button>
                            </div>
                        </div>
                    )}

                    {estimationStep === 'estimating' && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
                            <p className="text-text-secondary animate-pulse">Recherche des ventes réussies sur eBay...</p>
                        </div>
                    )}

                    {estimationStep === 'complete' && estimationStats && (
                        <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg animate-fade-in">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-green-400">Estimation Réussie</h4>
                                <button onClick={resetEstimation} className="text-xs text-text-secondary hover:text-white">Recommencer</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-text-secondary">Prix Médian :</span>
                                    <span className="block text-2xl font-bold text-white">{estimatedValue} €</span>
                                </div>
                                <div>
                                    <span className="text-text-secondary">Basé sur :</span>
                                    <span className="block text-white">{estimationStats.count} ventes réussies</span>
                                </div>
                                <div className="col-span-2 text-xs text-text-secondary mt-1">
                                    Fourchette : {estimationStats.min}€ - {estimationStats.max}€
                                </div>
                            </div>
                        </div>
                    )}
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
                        <input
                            type="number"
                            step="0.01"
                            value={estimatedValue}
                            onChange={e => setEstimatedValue(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-text-primary"
                            placeholder="0.00"
                        />
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
