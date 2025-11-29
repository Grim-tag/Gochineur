const NodeCache = require('node-cache');
const logger = require('../config/logger');

/**
 * Cache Middleware using node-cache
 * Caches API responses to reduce database load
 */

// Create cache instance (TTL in seconds)
const cache = new NodeCache({
    stdTTL: 600, // 10 minutes default
    checkperiod: 120, // Check for expired keys every 2 minutes
    useClones: false // Don't clone data (better performance)
});

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = 600) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = req.originalUrl || req.url;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            logger.debug(`Cache HIT: ${key}`);
            return res.json(cachedResponse);
        }

        logger.debug(`Cache MISS: ${key}`);

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful responses
            if (res.statusCode === 200) {
                cache.set(key, body, duration);
                logger.debug(`Cached: ${key} (${duration}s)`);
            }
            return originalJson(body);
        };

        next();
    };
};

/**
 * Clear cache for a specific pattern
 * @param {string} pattern - URL pattern to clear (e.g., '/api/events')
 */
const clearCachePattern = (pattern) => {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));

    matchingKeys.forEach(key => {
        cache.del(key);
        logger.info(`Cache cleared: ${key}`);
    });

    return matchingKeys.length;
};

/**
 * Clear all cache
 */
const clearAllCache = () => {
    cache.flushAll();
    logger.info('All cache cleared');
};

/**
 * Get cache stats
 */
const getCacheStats = () => {
    return cache.getStats();
};

module.exports = {
    cacheMiddleware,
    clearCachePattern,
    clearAllCache,
    getCacheStats
};
