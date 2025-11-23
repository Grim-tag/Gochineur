/**
 * Service d'authentification JWT
 */

const TOKEN_KEY = 'gochineur_token';

/**
 * Stocke le JWT dans localStorage
 */
export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Récupère le JWT depuis localStorage
 */
export function getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('🔍 getToken - Clé:', TOKEN_KEY, 'Token trouvé:', !!token);
    return token;
}

/**
 * Supprime le JWT (déconnexion)
 */
export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Vérifie si l'utilisateur est connecté
 */
export function isAuthenticated(): boolean {
    return getToken() !== null;
}

/**
 * Décode le JWT (sans vérification - juste pour lire le payload)
 */
export function decodeToken(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
        return null;
    }
}

/**
 * Récupère les informations utilisateur depuis le token
 */
export function getUserFromToken(): any | null {
    const token = getToken();
    if (!token) return null;
    return decodeToken(token);
}
