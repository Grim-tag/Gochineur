const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware de validation des entrées
 * Protection contre les injections et données invalides
 */

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Données invalides',
            details: errors.array()
        });
    }
    next();
};

// Validation pour l'ajout d'objet à la collection
const validateCollectionItem = [
    body('name')
        .trim()
        .notEmpty().withMessage('Le nom est requis')
        .isLength({ max: 200 }).withMessage('Le nom ne peut pas dépasser 200 caractères')
        .escape(),
    body('status')
        .optional()
        .isIn(['keeper', 'for_sale', 'for_exchange']).withMessage('Statut invalide'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Catégorie trop longue')
        .escape(),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Description trop longue'),
    body('purchasePrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('Prix d\'achat invalide'),
    body('valeur_estimee')
        .optional()
        .isFloat({ min: 0 }).withMessage('Valeur estimée invalide'),
    handleValidationErrors
];

// Validation pour l'estimation de prix
const validatePriceEstimation = [
    body('searchQuery')
        .trim()
        .notEmpty().withMessage('Le titre de recherche est requis')
        .isLength({ min: 2, max: 200 }).withMessage('Titre invalide')
        .escape(),
    body('imageBase64')
        .optional()
        .isString().withMessage('Image base64 invalide'),
    handleValidationErrors
];

// Validation pour la recherche d'événements
const validateEventSearch = [
    query('lat')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    query('lon')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    query('radius')
        .optional()
        .isInt({ min: 1, max: 1000 }).withMessage('Rayon invalide (1-1000 km)'),
    query('type')
        .optional()
        .trim()
        .escape(),
    handleValidationErrors
];

// Validation pour les paramètres MongoDB ObjectId
const validateObjectId = [
    param('id')
        .isMongoId().withMessage('ID invalide'),
    handleValidationErrors
];

// Validation pour la mise à jour du profil utilisateur
const validateUserProfile = [
    body('displayName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Nom d\'affichage invalide')
        .escape(),
    body('email')
        .optional()
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
    handleValidationErrors
];

module.exports = {
    validateCollectionItem,
    validatePriceEstimation,
    validateEventSearch,
    validateObjectId,
    validateUserProfile,
    handleValidationErrors
};
