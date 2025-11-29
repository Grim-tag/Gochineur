const express = require('express');
const router = express.Router();
const geoData = require('../config/geo-data.json');
const { getDB } = require('../config/db');
const axios = require('axios');
const logger = require('../config/logger');

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
            logger.error('Erreur lors de la récupération des données géographiques:', error);
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
            logger.error('Erreur lors de la récupération des villes:', error);
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
            logger.error('Erreur lors de la récupération des régions:', error);
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
            logger.error('Erreur lors de la récupération des départements:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/geo/cities-db - Retourne les villes depuis MongoDB
    router.get('/cities-db', async (req, res) => {
        try {
            const db = getDB();
            const citiesCollection = db.collection('cities');
            const cities = await citiesCollection.find().sort({ name: 1 }).toArray();
            res.json({
                success: true,
                cities
            });
        } catch (error) {
            logger.error('Erreur récupération villes DB:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/geo/geocode - Proxy pour le géocodage Nominatim (évite CORS et ajoute User-Agent)
    router.get('/geocode', async (req, res) => {
        try {
            const { q, limit = 1 } = req.query;

            if (!q) {
                return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
            }

            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q,
                    format: 'json',
                    limit,
                    addressdetails: 1
                },
                headers: { 'User-Agent': 'GoChineur/1.0' }
            });

            res.json(response.data);
        } catch (error) {
            logger.error('Erreur proxy géocodage:', error.message);
            res.status(500).json({ success: false, error: 'Erreur lors du géocodage' });
        }
    });

    // GET /api/geo/reverse - Reverse geocoding (coordonnées → adresse)
    router.get('/reverse', async (req, res) => {
        try {
            const { lat, lon } = req.query;

            if (!lat || !lon) {
                return res.status(400).json({ success: false, error: 'Parameters "lat" and "lon" are required' });
            }

            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                params: {
                    lat,
                    lon,
                    format: 'json',
                    addressdetails: 1,
                    zoom: 18
                },
                headers: { 'User-Agent': 'GoChineur/1.0' }
            });

            res.json(response.data);
        } catch (error) {
            logger.error('Erreur reverse geocoding:', error.message);
            res.status(500).json({ success: false, error: 'Erreur lors du reverse geocoding' });
        }
    });

    // POST /api/geo/add-city - Ajoute une ville dynamiquement
    router.post('/add-city', async (req, res) => {
        try {
            const { name, lat, lon } = req.body;

            if (!name || !lat || !lon) {
                return res.status(400).json({ success: false, error: 'Missing required fields' });
            }

            // Créer le slug
            const slug = name.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            const db = getDB();
            const citiesCollection = db.collection('cities');

            // Vérifier si existe déjà
            const existing = await citiesCollection.findOne({ slug });
            if (existing) {
                return res.json({ success: true, city: existing, alreadyExists: true });
            }

            // Vérifier que c'est en France via reverse geocoding
            const geoCheck = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                params: {
                    lat,
                    lon,
                    format: 'json',
                    addressdetails: 1
                },
                headers: { 'User-Agent': 'GoChineur/1.0' }
            });

            if (!geoCheck.data?.address?.country?.toLowerCase().includes('france')) {
                return res.status(400).json({ success: false, error: 'City must be in France' });
            }

            // Trouver le département via le code postal (plus précis que la proximité)
            let closestDept = null;
            const postalCode = geoCheck.data?.address?.postcode;

            if (postalCode) {
                // Extraire les 2 premiers chiffres du code postal
                const deptCode = postalCode.replace(/\s/g, '').substring(0, 2);
                const dept = geoData.departments.find(d => d.code === deptCode);
                if (dept) {
                    closestDept = deptCode;
                    logger.info(`Département trouvé via code postal ${postalCode}: ${deptCode}`);
                }
            }

            // Fallback: proximité géographique si pas de code postal
            if (!closestDept) {
                logger.info('Code postal non disponible, utilisation de la proximité géographique');
                let minDistance = Infinity;
                geoData.departments.forEach(dept => {
                    const distance = Math.sqrt(
                        Math.pow(dept.lat - lat, 2) + Math.pow(dept.lon - lon, 2)
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestDept = dept.code;
                    }
                });
            }

            if (!closestDept) {
                return res.status(400).json({ success: false, error: 'Department not found' });
            }

            // Créer la ville
            const city = {
                name,
                slug,
                department: closestDept,
                lat,
                lon,
                source: 'search',
                addedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await citiesCollection.insertOne(city);

            res.json({ success: true, city });
        } catch (error) {
            logger.error('Erreur ajout ville:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
