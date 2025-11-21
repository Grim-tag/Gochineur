require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const axios = require('axios');
const City = require('../models/City');
const geoData = require('../config/geo-data.json');

// Fonction pour créer un slug
function createSlug(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

// Fonction pour trouver le département d'une ville via ses coordonnées
function findDepartmentByCoords(lat, lon) {
    let closestDept = null;
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

    return closestDept;
}

// Fonction pour géocoder une ville
async function geocodeCity(cityName, postalCode) {
    try {
        const query = postalCode ? `${cityName}, ${postalCode}, France` : `${cityName}, France`;
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: query,
                format: 'json',
                limit: 1,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'GoChineur/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            const result = response.data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                country: result.address?.country
            };
        }
        return null;
    } catch (error) {
        console.error(`Erreur géocodage pour ${cityName}:`, error.message);
        return null;
    }
}

async function extractCities() {
    try {
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        // Récupérer la collection events
        const db = mongoose.connection.db;
        const eventsCollection = db.collection('events');

        console.log('\n📊 Extraction des villes uniques...');
        const uniqueCities = await eventsCollection.aggregate([
            {
                $match: {
                    city: { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: {
                        city: '$city',
                        postalCode: '$postalCode'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        console.log(`✅ ${uniqueCities.length} villes uniques trouvées\n`);

        let added = 0;
        let skipped = 0;
        let errors = 0;

        for (const item of uniqueCities) {
            const cityName = item._id.city;
            const postalCode = item._id.postalCode;
            const slug = createSlug(cityName);

            // Vérifier si la ville existe déjà
            const existing = await City.findOne({ slug });
            if (existing) {
                skipped++;
                continue;
            }

            // Géocoder la ville
            console.log(`🔍 Géocodage: ${cityName} (${item.count} événements)...`);
            const geoResult = await geocodeCity(cityName, postalCode);

            if (!geoResult) {
                console.log(`  ❌ Géocodage échoué`);
                errors++;
                continue;
            }

            // Vérifier que c'est en France
            if (!geoResult.country || !geoResult.country.toLowerCase().includes('france')) {
                console.log(`  ⚠️  Pas en France: ${geoResult.country}`);
                errors++;
                continue;
            }

            // Trouver le département
            const department = findDepartmentByCoords(geoResult.lat, geoResult.lon);
            if (!department) {
                console.log(`  ❌ Département non trouvé`);
                errors++;
                continue;
            }

            // Ajouter à la collection
            await City.create({
                name: cityName,
                slug,
                department,
                lat: geoResult.lat,
                lon: geoResult.lon,
                source: 'event'
            });

            console.log(`  ✅ Ajoutée: ${cityName} → ${department}`);
            added++;

            // Pause pour respecter les limites de Nominatim
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n📈 Résumé:');
        console.log(`  ✅ Ajoutées: ${added}`);
        console.log(`  ⏭️  Ignorées: ${skipped}`);
        console.log(`  ❌ Erreurs: ${errors}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Déconnecté de MongoDB');
    }
}

extractCities();
