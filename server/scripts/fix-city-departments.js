require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');
const geoData = require('../config/geo-data.json');

/**
 * Script pour corriger les départements des villes mal assignées
 * Utilise le code postal de Nominatim pour déterminer le bon département
 */

async function fixCityDepartments() {
    let client = null;

    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI non définie dans les variables d\'environnement');
            console.log('Variables disponibles:', Object.keys(process.env).filter(k => k.includes('MONGO')));
            return;
        }

        console.log('🔌 Connexion à MongoDB...');
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        console.log('✅ Connecté à MongoDB');

        const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'gochineur';
        const db = client.db(dbName);
        const citiesCollection = db.collection('cities');

        console.log('\n📊 Récupération de toutes les villes...');
        const cities = await citiesCollection.find().toArray();
        console.log(`✅ ${cities.length} villes trouvées\n`);

        let fixed = 0;
        let errors = 0;
        let unchanged = 0;

        for (const city of cities) {
            try {
                console.log(`🔍 Vérification: ${city.name} (actuellement: ${city.department})`);

                // Reverse geocode pour obtenir le code postal
                const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                    params: {
                        lat: city.lat,
                        lon: city.lon,
                        format: 'json',
                        addressdetails: 1
                    },
                    headers: { 'User-Agent': 'GoChineur/1.0' }
                });

                const postalCode = response.data?.address?.postcode;

                if (!postalCode) {
                    console.log(`  ⚠️  Pas de code postal trouvé`);
                    errors++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Extraire le département du code postal
                const deptCode = postalCode.replace(/\s/g, '').substring(0, 2);
                const dept = geoData.departments.find(d => d.code === deptCode);

                if (!dept) {
                    console.log(`  ⚠️  Département ${deptCode} non trouvé pour code postal ${postalCode}`);
                    errors++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                if (dept.code === city.department) {
                    console.log(`  ✅ Département correct (${dept.code})`);
                    unchanged++;
                } else {
                    console.log(`  🔧 Correction: ${city.department} → ${dept.code} (code postal: ${postalCode})`);

                    await citiesCollection.updateOne(
                        { _id: city._id },
                        { $set: { department: dept.code } }
                    );

                    fixed++;
                }

                // Pause pour respecter les limites de Nominatim
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`  ❌ Erreur pour ${city.name}:`, error.message);
                errors++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('\n📈 Résumé:');
        console.log(`  🔧 Corrigées: ${fixed}`);
        console.log(`  ✅ Inchangées: ${unchanged}`);
        console.log(`  ❌ Erreurs: ${errors}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Déconnecté de MongoDB');
        }
    }
}

fixCityDepartments();
