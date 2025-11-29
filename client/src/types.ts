export interface Event {
  id: string | number
  id_source?: string | null
  source_name?: string
  name: string
  type: string
  date: string
  date_debut?: string
  date_fin?: string
  city: string
  postalCode: string
  address: string
  latitude: number
  longitude: number
  description: string
  distance: number
  statut_validation?: string
  date_creation?: string
  telephone?: string
  pays?: string
  prix_visiteur?: string
  prix_montant?: number
  submitted_by_pseudo?: string
  role?: string
  email?: string
  website?: string
  cancelled?: boolean
  nombre_exposants?: number
}

export interface CollectionStats {
  totalItems: number
  totalValue: number
  byStatus: {
    keeper: number
    for_sale: number
    for_exchange: number
  }
  byCategory: Record<string, number>
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UserPosition {
  latitude: number
  longitude: number
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  message: string
  status?: number
  details?: unknown
}

// Geo Data types
export interface City {
  name: string
  slug: string
  department: string
  lat: number
  lon: number
}

export interface Department {
  code: string
  name: string
  slug: string
  region: string
}

export interface Region {
  code: string
  name: string
  slug: string
}

export interface GeoData {
  cities?: City[]
  departments?: Department[]
  regions?: Region[]
}

// User & Auth types
export interface User {
  id: string
  email: string
  displayName?: string
  role: 'user' | 'admin' | 'moderator'
  createdAt?: string
  updatedAt?: string
}

export interface DecodedToken {
  id: string
  email: string
  role: string
  displayName?: string
  exp?: number
  iat?: number
}

// Collection types
export interface CollectionItem {
  _id: string
  user_id: string
  name: string
  status: 'keeper' | 'for_sale' | 'for_exchange'
  category?: string
  subCategory?: string
  description?: string
  purchasePrice?: number
  valeur_estimee?: number
  date_acquisition?: string
  emplacement_stockage?: string
  etat_objet?: string
  historyLog?: string
  isPublic?: boolean
  photos_principales?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface SearchCollectionParams {
  query?: string
  status?: string
  category?: string
  page?: number
  limit?: number
}

export interface SearchCollectionResponse {
  data: CollectionItem[]
  pagination: Pagination
}
