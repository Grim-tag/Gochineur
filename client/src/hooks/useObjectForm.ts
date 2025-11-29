import { useState, useEffect } from 'react'
import { addItem, updateItem, type CollectionItem } from '../services/collectionApi'
import { useNavigate } from 'react-router-dom'

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

export function useObjectForm(initialData?: CollectionItem) {
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>(
        initialData?.photos_principales || []
    )
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('')

    const [formData, setFormData] = useState<ObjectFormData>({
        name: initialData?.name || '',
        status: initialData?.status || 'keeper',
        category: initialData?.category || '',
        subCategory: initialData?.subCategory || '',
        description: initialData?.description || '',
        purchasePrice: initialData?.purchasePrice?.toString() || '',
        estimatedValue: initialData?.valeur_estimee?.toString() || '',
        acquisitionDate: initialData?.date_acquisition
            ? new Date(initialData.date_acquisition).toISOString().split('T')[0]
            : '',
        storageLocation: initialData?.emplacement_stockage || '',
        condition: initialData?.etat_objet || '',
        historyLog: initialData?.historyLog || '',
        isPublic: initialData?.isPublic || false
    })

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
        const urlToRevoke = previewUrls[index]
        if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
            URL.revokeObjectURL(urlToRevoke)
        }

        setPreviewUrls(prev => prev.filter((_, i) => i !== index))
        if (index >= (initialData?.photos_principales?.length || 0)) {
            const fileIndex = index - (initialData?.photos_principales?.length || 0)
            setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex))
        }
    }

    const handleSubmit = async (e: React.FormEvent, isEditing: boolean) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const submitData = new FormData()
            submitData.append('name', formData.name)
            submitData.append('status', formData.status)
            submitData.append('isPublic', String(formData.isPublic))

            if (formData.category) submitData.append('category', formData.category)
            if (formData.subCategory) submitData.append('subCategory', formData.subCategory)
            if (formData.description) submitData.append('description', formData.description)
            if (formData.purchasePrice) submitData.append('purchasePrice', formData.purchasePrice)
            if (formData.estimatedValue) submitData.append('valeur_estimee', formData.estimatedValue)
            if (formData.acquisitionDate) submitData.append('date_acquisition', formData.acquisitionDate)
            if (formData.storageLocation) submitData.append('emplacement_stockage', formData.storageLocation)
            if (formData.condition) submitData.append('etat_objet', formData.condition)
            if (formData.historyLog) submitData.append('historyLog', formData.historyLog)

            // Add Cloudinary URL from estimation if available
            if (uploadedPhotoUrl) {
                submitData.append('cloudinaryUrl', uploadedPhotoUrl)
                console.log('📤 Sending Cloudinary URL to backend:', uploadedPhotoUrl)
            }

            selectedFiles.forEach(file => {
                submitData.append('photos', file)
            })

            if (isEditing && initialData) {
                await updateItem(initialData._id, submitData)
            } else {
                await addItem(submitData)
            }

            navigate('/mon-compte')
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            previewUrls.forEach(url => {
                if (url && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url)
                }
            })
        }
    }, [previewUrls])

    return {
        formData,
        setFormData,
        selectedFiles,
        previewUrls,
        uploadedPhotoUrl,
        setUploadedPhotoUrl,
        loading,
        error,
        handleFileChange,
        removeImage,
        handleSubmit
    }
}
