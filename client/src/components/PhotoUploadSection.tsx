import { useRef } from 'react'

interface PhotoUploadSectionProps {
    previewUrls: string[]
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onRemoveImage: (index: number) => void
    maxPhotos?: number
}

export default function PhotoUploadSection({
    previewUrls,
    onFileChange,
    onRemoveImage,
    maxPhotos = 3
}: PhotoUploadSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="flex flex-col items-center justify-center mb-8">
            <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                {previewUrls.map((url, index) => (
                    <div key={index} className="aspect-square relative rounded-lg overflow-hidden border border-gray-600 group">
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => onRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ))}

                {previewUrls.length < maxPhotos && (
                    <div
                        className="aspect-square bg-background-lighter border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="text-3xl mb-2">📷</span>
                        <span className="text-xs text-text-secondary text-center px-2">
                            Ajouter ({maxPhotos - previewUrls.length} restants)
                        </span>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
            />
        </div>
    )
}
