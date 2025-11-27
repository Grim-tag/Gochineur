/**
 * Utility functions for saving and retrieving user's last location in localStorage
 */

const LOCATION_STORAGE_KEY = 'gochineur-last-location';
const EXPIRATION_DAYS = 30;

export interface SavedLocation {
    type: 'gps' | 'city';
    city?: string;
    latitude?: number;
    longitude?: number;
    radius: number;
    timestamp: number;
}

/**
 * Save user's location to localStorage
 */
export function saveUserLocation(location: Omit<SavedLocation, 'timestamp'>): void {
    try {
        const savedLocation: SavedLocation = {
            ...location,
            timestamp: Date.now()
        };
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(savedLocation));
    } catch (error) {
        console.warn('Failed to save location to localStorage:', error);
    }
}

/**
 * Get saved user location from localStorage
 * Returns null if not found or expired
 */
export function getUserLocation(): SavedLocation | null {
    try {
        const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (!saved) return null;

        const location: SavedLocation = JSON.parse(saved);

        // Check expiration (30 days)
        const expirationTime = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - location.timestamp > expirationTime;

        if (isExpired) {
            clearUserLocation();
            return null;
        }

        return location;
    } catch (error) {
        console.warn('Failed to retrieve location from localStorage:', error);
        return null;
    }
}

/**
 * Clear saved user location from localStorage
 */
export function clearUserLocation(): void {
    try {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear location from localStorage:', error);
    }
}
