import { useState } from 'react'
import { getToken } from '../services/auth'
import { compressImage } from '../utils/imageCompression'
import toast from 'react-hot-toast'

interface EstimationResult {
    identifiedTitle: string
    imageUrl?: string
    averagePrice?: number
    minPrice?: number
    maxPrice?: number
    soldCount?: number
}

interface EstimationWizardProps {
    selectedFiles: File[]
    onEstimationComplete: (result: EstimationResult & { estimatedValue: string }) => void
    onCancel?: () => void
}

type EstimationStep = 'idle' | 'analyzing' | 'review' | 'estimating' | 'complete'

export default function EstimationWizard({
    selectedFiles,
    onEstimationComplete,
    onCancel
}: EstimationWizardProps) {
    const [estimationStep, setEstimationStep] = useState<EstimationStep>('idle')
    const [identifiedName, setIdentifiedName] = useState('')
    const [estimationStats, setEstimationStats] = useState<{ min: number, max: number, count: number } | null>(null)
    const [estimatedValue, setEstimatedValue] = useState('')
    const [fastScanMode, setFastScanMode] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cloudinaryImageUrl, setCloudinaryImageUrl] = useState('')
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('')

    // Step 1: Identify Photo
    const handleAnalyzePhoto = async () => {
        if (selectedFiles.length === 0) {
            setError("Veuillez ajouter au moins une photo pour l'estimation")
            return
        }

        setEstimationStep('analyzing')
        setError(null)

        try {
            console.log('📦 Compressing image...')
            const compressedFile = await compressImage(selectedFiles[0], 2, 1920)

            const formData = new FormData()
            formData.append('image', compressedFile)

            const apiUrl = import.meta.env.VITE_API_URL || ''
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
                setCloudinaryImageUrl(data.imageBase64 || '')

                // Save Cloudinary URL
                if (data.imageUrl) {
                    setUploadedPhotoUrl(data.imageUrl)
                    console.log('📸 Cloudinary URL saved:', data.imageUrl)
                }

                setEstimationStep('review')
            }
        } catch (err: any) {
            console.error('Erreur identification:', err)
            setError(err.message || "Erreur lors de l'identification")
            setEstimationStep('idle')
        }
    }

    // Step 2: Estimate Price
    const handleEstimatePrice = async () => {
        setEstimationStep('estimating')
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Vous devez être connecté pour utiliser cette fonctionnalité.")
            }

            const apiUrl = import.meta.env.VITE_API_URL || ''
            const response = await fetch(`${apiUrl}/api/value/estimate-by-title`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    searchQuery: identifiedName,
                    imageBase64: cloudinaryImageUrl
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de l\'estimation')
            }

            if (data.success) {
                const value = data.averagePrice.toFixed(2)
                setEstimatedValue(value)
                setEstimationStats({
                    min: data.minPrice,
                    max: data.maxPrice,
                    count: data.soldCount
                })
                setEstimationStep('complete')

                // Notify parent with complete result
                onEstimationComplete({
                    identifiedTitle: identifiedName,
                    imageUrl: uploadedPhotoUrl,
                    averagePrice: data.averagePrice,
                    minPrice: data.minPrice,
                    maxPrice: data.maxPrice,
                    soldCount: data.soldCount,
                    estimatedValue: value
                })

                if (fastScanMode) {
                    setTimeout(() => {
                        resetEstimation()
                        toast.success('✅ Estimation enregistrée ! Vous pouvez scanner un nouvel objet.')
                    }, 2000)
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
        setEstimatedValue('')
        setCloudinaryImageUrl('')
        setUploadedPhotoUrl('')
        setError(null)
        if (onCancel) onCancel()
    }

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <span>✨</span> Estimation IA (Prix Réels)
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={fastScanMode}
                        onChange={(e) => setFastScanMode(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary bg-background"
                    />
                    <span className="text-sm font-medium text-text-secondary">⚡ Mode Scan Rapide</span>
                </label>
            </div>

            {fastScanMode && (
                <div className="bg-blue-900/20 border border-blue-800 rounded p-3 mb-4 text-sm text-blue-300">
                    <strong>Mode Scan Rapide activé :</strong> Le formulaire se réinitialisera automatiquement après chaque estimation.
                </div>
            )}

            {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-300 p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Step: Idle */}
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

            {/* Step: Analyzing */}
            {estimationStep === 'analyzing' && (
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-text-secondary animate-pulse">Identification de l'objet en cours...</p>
                </div>
            )}

            {/* Step: Review */}
            {estimationStep === 'review' && (
                <div className="space-y-4 animate-fade-in">
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

            {/* Step: Estimating */}
            {estimationStep === 'estimating' && (
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
                    <p className="text-text-secondary animate-pulse">Recherche des ventes réussies sur eBay...</p>
                </div>
            )}

            {/* Step: Complete */}
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
    )
}
