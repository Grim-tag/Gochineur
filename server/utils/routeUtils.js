/**
 * Calcule la distance entre deux points GPS en utilisant la formule Haversine
 * @param {number} lat1 - Latitude du premier point
 * @param {number} lon1 - Longitude du premier point
 * @param {number} lat2 - Latitude du second point
 * @param {number} lon2 - Longitude du second point
 * @returns {number} Distance en kilomètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

/**
 * Optimise l'ordre des événements en utilisant l'algorithme du Plus Proche Voisin (Nearest Neighbor)
 * @param {Object} startPoint - Point de départ {latitude, longitude}
 * @param {Array} eventsList - Liste des événements à optimiser
 * @returns {Array} Liste des événements triés dans l'ordre optimisé
 */
function optimizeNearestNeighbor(startPoint, eventsList) {
    if (!eventsList || eventsList.length === 0) {
        return []
    }

    if (eventsList.length === 1) {
        return eventsList
    }

    // Copie pour ne pas modifier l'original
    const unvisited = [...eventsList]
    const optimizedRoute = []
    let currentPoint = startPoint

    // Tant qu'il reste des événements non visités
    while (unvisited.length > 0) {
        let nearestIndex = 0
        let nearestDistance = Infinity

        // Trouver l'événement le plus proche du point actuel
        for (let i = 0; i < unvisited.length; i++) {
            const event = unvisited[i]
            const distance = calculateDistance(
                currentPoint.latitude,
                currentPoint.longitude,
                event.latitude,
                event.longitude
            )

            if (distance < nearestDistance) {
                nearestDistance = distance
                nearestIndex = i
            }
        }

        // Ajouter l'événement le plus proche à la route optimisée
        const nearestEvent = unvisited.splice(nearestIndex, 1)[0]
        optimizedRoute.push(nearestEvent)

        // Le prochain point de départ est cet événement
        currentPoint = {
            latitude: nearestEvent.latitude,
            longitude: nearestEvent.longitude
        }
    }

    console.log(`🗺️ Circuit optimisé : ${optimizedRoute.length} événements ordonnés par proximité`)
    return optimizedRoute
}

module.exports = {
    calculateDistance,
    optimizeNearestNeighbor
}
