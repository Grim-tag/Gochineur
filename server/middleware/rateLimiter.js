const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Middleware
 * Protection contre les abus d'API
 */

// API générale : 100 requêtes par 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Estimation IA : 10 requêtes par heure (coûteux en API externes)
const estimationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10,
    message: {
        error: 'Limite d\'estimations atteinte. Veuillez réessayer dans 1 heure.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Authentification : 5 tentatives par 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Ne compte que les échecs
});

// Upload de fichiers : 20 uploads par heure
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 20,
    message: {
        error: 'Limite d\'uploads atteinte. Veuillez réessayer dans 1 heure.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    estimationLimiter,
    authLimiter,
    uploadLimiter
};
