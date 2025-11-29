import { useState, useEffect } from 'react'
import { getToken } from '../services/auth'

interface TempEstimation {
    _id: string
    search_query: string
    image_url: string | null
    estimation_result: {
        median_price: number
        min_price: number
        max_price: number
        sold_count: number
    }
    status: string
    createdAt: string
}

export default function CardsInProgress() {
    const [tempItems, setTempItems] = useState<TempEstimation[]>([])
    const [adding, setAdding] = useState<string | null>(null)

    const loadTempItems = async () => {
        try {
            const token = getToken()
            if (!token) return

            const apiUrl = import.meta.env.VITE_API_URL || ''
            const response = await fetch(`${apiUrl}/api/collection/temp`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            if (data.success) {
                setTempItems(data.data)
            }
        } catch (error) {
            console.error('Error loading temp items:', error)
        }
    }

    useEffect(() => {
        loadTempItems()
        // Poll every 5 seconds
        const interval = setInterval(loadTempItems, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleQuickAdd = async (tempId: string) => {
        setAdding(tempId)
        try {
            const token = getToken()
            if (!token) {
                alert('Vous devez être connecté')
                return
            }

            const apiUrl = import.meta.env.VITE_API_URL || ''
            const response = await fetch(`${apiUrl}/api/collection/add-quick`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tempId })
            })

            const data = await response.json()
            if (data.success) {
                // Remove from temp list
                setTempItems(prev => prev.filter(item => item._id !== tempId))
            } else {
                alert(`Erreur: ${data.error}`)
            }
        } catch (error: any) {
            console.error('Error adding item:', error)
            alert(`Erreur: ${error.message}`)
        } finally {
            setAdding(null)
        }
    }

    if (tempItems.length === 0) {
        return null
    }

    return (
        <div className="mt-8 bg-background-paper rounded-lg shadow-lg border border-gray-700 p-6">
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                ⏳ Estimations en cours ({tempItems.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tempItems.map(item => (
                    <div key={item._id} className="bg-background border border-gray-600 rounded-lg p-4 flex flex-col">
                        {item.image_url && (
                            <img
                                src={item.image_url}
                                alt={item.search_query}
                                className="w-full h-40 object-cover rounded mb-3"
                            />
                        )}
                        <h4 className="font-semibold text-text-primary mb-2 line-clamp-2">{item.search_query}</h4>

                        {item.estimation_result && (
                            <div className="bg-green-900/20 border border-green-800 rounded p-3 mb-3">
                                <div className="text-sm text-text-secondary mb-1">Prix médian estimé</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {item.estimation_result.median_price.toFixed(2)} €
                                </div>
                                <div className="text-xs text-text-muted mt-1">
                                    Basé sur {item.estimation_result.sold_count} ventes
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => handleQuickAdd(item._id)}
                            disabled={adding === item._id}
                            className="mt-auto w-full bg-primary text-white py-2 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 font-semibold"
                        >
                            {adding === item._id ? 'Ajout...' : '➕ Ajouter à ma collection'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
