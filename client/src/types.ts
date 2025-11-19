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
}





