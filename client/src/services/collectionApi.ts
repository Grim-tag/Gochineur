import { API } from '../config/constants'
import { getToken } from './auth'

export interface CollectionItem {
    _id: string
    user_id: string
    name: string
    category?: string
    subCategory?: string
    description?: string
    historyLog?: string
    date_acquisition?: string
    etat_objet?: string
    emplacement_stockage?: string
    acquisitionEventId?: string
    purchasePrice?: number
    frais_annexes?: number
    devise?: string
    valeur_estimee?: number
    source_estimation?: string
    status: 'keeper' | 'for_sale' | 'for_exchange'
    isPublic: boolean
    metadonnees_techniques?: Record<string, any>
    photos_principales: string[]
    createdAt: string
    updatedAt?: string
}

export const fetchCollection = async (): Promise<CollectionItem[]> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection?t=${new Date().getTime()}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch collection')
    }

    const data = await response.json()
    return data.data
}

export const addItem = async (formData: FormData): Promise<CollectionItem> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection/add`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add item')
    }

    const data = await response.json()
    return data.data
}

export const updateItem = async (id: string, formData: FormData): Promise<CollectionItem> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item')
    }

    const data = await response.json()
    if (data.debug) {
        (data.data as any).debug = data.debug
    }
    return data.data
}

// Import items from CSV
export const importCSV = async (file: File) => {
    const token = getToken()
    const formData = new FormData();
    formData.append('csvFile', file);

    const response = await fetch(`${API.BASE_URL}/api/collection/import-csv`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import CSV');
    }

    return response.json();
};

// Delete an item
export const deleteItem = async (id: string): Promise<void> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
    }
};

// Search collection with filters
export const searchCollection = async (params: {
    q?: string
    category?: string
    status?: string
    priceMin?: number
    priceMax?: number
    sort?: string
    page?: number
    limit?: number
}): Promise<SearchCollectionResponse> => {
    const token = getToken()
    const queryString = new URLSearchParams(
        Object.entries(params)
            .filter(([_, v]) => v != null && v !== '')
            .map(([k, v]) => [k, String(v)])
    ).toString()

    const response = await fetch(`${API.BASE_URL}/api/collection/search?${queryString}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to search collection')
    }

    return response.json()
}

// Get collection statistics
export const getCollectionStats = async (): Promise<any> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch stats')
    }

    const result = await response.json()
    return result.data
}

// Bulk delete items
export const bulkDeleteItems = async (itemIds: string[]): Promise<void> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection/bulk-delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemIds })
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete items')
    }
}

// Bulk update status
export const bulkUpdateStatus = async (itemIds: string[], status: string): Promise<void> => {
    const token = getToken()
    const response = await fetch(`${API.BASE_URL}/api/collection/bulk-update-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemIds, status })
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update status')
    }
}
