const express = require('express');
const router = express.Router();
const geoData = require('../config/geo-data.json');

/**
 * Routes pour les données géographiques
 */
module.exports = function () {
    // Route pour obtenir toutes les données géographiques (départements et villes)
    router.get('/data', (req, res) => {
        try {
            res.json({
                success: true,
                data: geoData
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des données géo:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Route pour obtenir uniquement les villes
    router.get('/cities', (req, res) => {
        try {
            res.json({
                success: true,
                cities: geoData.cities
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des villes:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Route pour obtenir uniquement les départements
    router.get('/departments', (req, res) => {
        try {
            res.json({
                success: true,
                departments: geoData.departments
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des départements:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    return router;
};
