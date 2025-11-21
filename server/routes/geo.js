const express = require('express');
const router = express.Router();
const geoData = require('../config/geo-data.json');

/**
 * Routes pour les données géographiques
 */
module.exports = function () {
    // GET /api/geo/data - Retourne toutes les données géographiques
    router.get('/data', (req, res) => {
        try {
            res.json({
                success: true,
                data: geoData
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des données géo:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/geo/regions - Retourne uniquement les régions
    router.get('/regions', (req, res) => {
        try {
            res.json({
                success: true,
                regions: geoData.regions
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/geo/cities - Retourne uniquement les villes
    router.get('/cities', (req, res) => {
        try {
            res.json({
                success: true,
                cities: geoData.cities
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des villes:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/geo/departments - Retourne uniquement les départements
    router.get('/departments', (req, res) => {
        try {
            res.json({
                success: true,
                departments: geoData.departments
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des départements:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
