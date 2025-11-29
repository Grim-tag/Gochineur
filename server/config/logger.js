const winston = require('winston');
const path = require('path');

/**
 * Configuration Winston Logger
 * Logs structurés pour production et développement
 */

const isProduction = process.env.NODE_ENV === 'production';

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Format console pour développement
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Transports
const transports = [];

// En production : fichiers uniquement
if (isProduction) {
    transports.push(
        // Erreurs dans error.log
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Tous les logs dans combined.log
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
} else {
    // En développement : console + fichiers
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/dev.log'),
            maxsize: 5242880,
            maxFiles: 2,
        })
    );
}

// Créer le logger
const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: logFormat,
    transports,
    // Ne pas sortir en cas d'erreur de log
    exitOnError: false,
});

// Stream pour Morgan (HTTP logs)
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};

module.exports = logger;
