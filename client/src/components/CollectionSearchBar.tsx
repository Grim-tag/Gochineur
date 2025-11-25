import { useState, useEffect } from 'react'

interface CollectionSearchBarProps {
    value: string
    onChange: (value: string) => void
    resultCount: number
    totalCount: number
    loading: boolean
}

export default function CollectionSearchBar({
    value,
    onChange,
    resultCount,
    totalCount,
    loading
}: CollectionSearchBarProps) {
    const [localValue, setLocalValue] = useState(value)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onChange(localValue)
        }, 300)

        return () => clearTimeout(timer)
    }, [localValue])

    // Sync with external value changes
    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const handleClear = () => {
        setLocalValue('')
        onChange('')
    }

    return (
        <div className="mb-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-xl">🔍</span>
                </div>
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    placeholder="Rechercher dans ma collection..."
                    className="w-full pl-12 pr-24 py-3 bg-background-paper border border-gray-600 rounded-lg text-text-primary placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {localValue && (
                    <button
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Result counter */}
            {!loading && value && (
                <p className="text-sm text-text-secondary mt-2">
                    {resultCount === 0 ? (
                        <span className="text-red-400">Aucun résultat trouvé</span>
                    ) : (
                        <>
                            <span className="text-primary font-semibold">{resultCount}</span> objet{resultCount > 1 ? 's' : ''} trouvé{resultCount > 1 ? 's' : ''}
                            {resultCount < totalCount && <span className="text-gray-500"> sur {totalCount}</span>}
                        </>
                    )}
                </p>
            )}
        </div>
    )
}
