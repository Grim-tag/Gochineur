const jwt = require('jsonwebtoken');

/**
 * Génère un JWT pour un utilisateur
 * @param {Object} user - Objet utilisateur (doit contenir au moins id, email, role)
 * @returns {string} - JWT token
 */
function generateToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
    }

    const payload = {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        displayName: user.displayName
    };

    // Token valide pendant 7 jours
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
}

/**
 * Vérifie et décode un JWT
 * @param {string} token - JWT token
 * @returns {Object|null} - Payload décodé ou null si invalide
 */
function verifyToken(token) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
    }

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.error('❌ Erreur lors de la vérification du JWT:', error.message);
        return null;
    }
}

/**
 * Extrait le token du header Authorization
 * @param {string} authHeader - Header Authorization (format: "Bearer <token>")
 * @returns {string|null} - Token ou null
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Enlever "Bearer "
}

module.exports = {
    generateToken,
    verifyToken,
    extractTokenFromHeader
};
