import { getUserFromToken } from '../services/auth'
import { type CollectionItem } from '../services/collectionApi'
import PhotoUploadSection from './PhotoUploadSection'
import EstimationWizard from './EstimationWizard'
import ObjectFormFields from './ObjectFormFields'
import { useObjectForm } from '../hooks/useObjectForm'

interface ObjectFormProps {
    initialData?: CollectionItem
    isEditing?: boolean
}

export default function ObjectForm({ initialData, isEditing = false }: ObjectFormProps) {
    const user = getUserFromToken()
    const isAdmin = user?.role === 'admin'

    const {
        formData,
        setFormData,
        selectedFiles,
        previewUrls,
        setUploadedPhotoUrl,
        loading,
        error,
        handleFileChange,
        removeImage,
        handleSubmit
    } = useObjectForm(initialData)

    const handleEstimationComplete = (result: any) => {
        // Update form with estimation results
        if (result.identifiedTitle && !formData.name) {
            setFormData(prev => ({ ...prev, name: result.identifiedTitle }))
        }
        if (result.estimatedValue) {
            setFormData(prev => ({ ...prev, estimatedValue: result.estimatedValue }))
        }
        if (result.imageUrl) {
            setUploadedPhotoUrl(result.imageUrl)
            console.log('📸 Cloudinary URL saved from estimation:', result.imageUrl)
        }
    }

    const updateFormField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <form
            onSubmit={(e) => handleSubmit(e, isEditing)}
            className="space-y-8 max-w-3xl mx-auto bg-background-paper p-6 rounded-lg shadow-lg border border-gray-700"
        >
            {/* Photo Upload Section */}
            <PhotoUploadSection
                previewUrls={previewUrls}
                onFileChange={handleFileChange}
                onRemoveImage={removeImage}
                maxPhotos={3}
            />

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* AI Estimation Section - Admin Only */}
            {isAdmin && (
                <EstimationWizard
                    selectedFiles={selectedFiles}
                    onEstimationComplete={handleEstimationComplete}
                />
            )}

            {/* Form Fields */}
            <ObjectFormFields
                formData={formData}
                onChange={updateFormField}
                isAdmin={isAdmin}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Ajouter à ma collection')}
                </button>
            </div>
        </form>
    )
}
