/**
 * Utilitaires pour la gestion de l'authentification côté client
 */

import { getCurrentUser } from '../services/api'
import { removeToken } from '../services/auth'
import { API } from '../config/constants'

export interface User {
  id: string
  email: string
  name: string
  displayName: string | null
  photo: string | null
  role: string
}

export interface AuthStatus {
  authenticated: boolean
  user: User | null
}

/**
 * Vérifie si l'utilisateur est authentifié et récupère ses informations
 */
export async function checkAuth(): Promise<AuthStatus> {
  try {
    const data = await getCurrentUser()
    return {
      authenticated: data.authenticated || false,
      user: data.user || null
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification:', error)
    return { authenticated: false, user: null }
  }
}

/**
 * Redirige vers la connexion Google
 */
export function redirectToGoogleAuth() {
  const authUrl = API.BASE_URL
    ? `${API.BASE_URL}${API.ENDPOINTS.AUTH}/google`
    : `${API.ENDPOINTS.AUTH}/google`

  window.location.href = authUrl
}

/**
 * Déconnecte l'utilisateur
 */
export function logout() {
  removeToken()
  localStorage.removeItem('gochineur-circuit')
}


