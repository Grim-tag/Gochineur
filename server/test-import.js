// Script de diagnostic pour tester l'importation DATAtourisme
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const DATATOURISME_API_BASE_URL = process.env.DATATOURISME_API_BASE_URL;
const DATATOURISME_API_KEY = process.env.DATATOURISME_API_KEY;

console.log('🔍 Diagnostic de l\'importation DATAtourisme\n');

// Test 1: Vérifier les fichiers locaux
console.log('=== TEST 1: Vérification des fichiers locaux ===');
const datatourismeDataPath = path.join(__dirname, 'datatourisme_data');
const indexFilePath = path.join(datatourismeDataPath, 'index.json');

if (!fs.existsSync(datatourismeDataPath)) {
  console.log('❌ Dossier datatourisme_data introuvable');
} else {
  console.log('✅ Dossier datatourisme_data trouvé');
  
  if (!fs.existsSync(indexFilePath)) {
    console.log('❌ Fichier index.json introuvable');
  } else {
    console.log('✅ Fichier index.json trouvé');
    
    try {
      const indexContent = fs.readFileSync(indexFilePath, 'utf8');
      const indexData = JSON.parse(indexContent);
      console.log(`✅ ${indexData.length} fichiers trouvés dans index.json`);
      
      // Tester la lecture d'un fichier
      if (indexData.length > 0) {
        const firstFile = indexData[0];
        const filePath = path.join(datatourismeDataPath, 'objects', firstFile.file);
        
        if (fs.existsSync(filePath)) {
          console.log(`✅ Fichier test trouvé: ${firstFile.file}`);
          
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const eventData = JSON.parse(fileContent);
          
          console.log(`\n📋 Structure du premier événement:`);
          console.log(`  - @id: ${eventData['@id'] || 'NON TROUVÉ'}`);
          console.log(`  - rdfs:label.fr: ${eventData['rdfs:label']?.['fr']?.[0] || 'NON TROUVÉ'}`);
          console.log(`  - isLocatedAt[0].schema:geo: ${eventData['isLocatedAt']?.[0]?.['schema:geo'] ? 'TROUVÉ' : 'NON TROUVÉ'}`);
          console.log(`  - schema:latitude: ${eventData['isLocatedAt']?.[0]?.['schema:geo']?.['schema:latitude'] || 'NON TROUVÉ'}`);
          console.log(`  - schema:longitude: ${eventData['isLocatedAt']?.[0]?.['schema:geo']?.['schema:longitude'] || 'NON TROUVÉ'}`);
          console.log(`  - takesPlaceAt: ${eventData['takesPlaceAt'] ? `${eventData['takesPlaceAt'].length} période(s)` : 'NON TROUVÉ'}`);
          console.log(`  - schema:startDate: ${eventData['schema:startDate'] ? `${eventData['schema:startDate'].length} date(s)` : 'NON TROUVÉ'}`);
        } else {
          console.log(`❌ Fichier test introuvable: ${firstFile.file}`);
        }
      }
    } catch (error) {
      console.log(`❌ Erreur lors de la lecture de index.json: ${error.message}`);
    }
  }
}

console.log('\n=== TEST 2: Vérification de l\'API DATAtourisme ===');

if (!DATATOURISME_API_BASE_URL || !DATATOURISME_API_KEY) {
  console.log('❌ Variables d\'environnement manquantes');
  console.log(`  - DATATOURISME_API_BASE_URL: ${DATATOURISME_API_BASE_URL || 'NON DÉFINI'}`);
  console.log(`  - DATATOURISME_API_KEY: ${DATATOURISME_API_KEY ? 'DÉFINI' : 'NON DÉFINI'}`);
} else {
  console.log('✅ Variables d\'environnement configurées');
  console.log(`  - Base URL: ${DATATOURISME_API_BASE_URL}`);
  console.log(`  - API Key: ${DATATOURISME_API_KEY.substring(0, 8)}...`);
  
  // Test de l'API
  (async () => {
    try {
      console.log('\n📡 Test de connexion à l\'API...');
      
      // Test 1: Requête simple sans paramètres
      const apiUrl = `${DATATOURISME_API_BASE_URL}/poi`;
      console.log(`URL: ${apiUrl}`);
      
      const params = {
        apikey: DATATOURISME_API_KEY,
        rpp: 10,
        page: 1
      };
      
      console.log('Paramètres:', JSON.stringify(params, null, 2));
      
      const response = await axios.get(apiUrl, {
        params: params,
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ Réponse reçue: ${response.status} ${response.statusText}`);
      console.log(`  - Type de contenu: ${response.headers['content-type']}`);
      console.log(`  - Taille de la réponse: ${JSON.stringify(response.data).length} caractères`);
      
      if (response.data?.features) {
        console.log(`  - Nombre d'événements: ${response.data.features.length}`);
        if (response.data.features.length > 0) {
          const firstEvent = response.data.features[0];
          console.log(`  - Premier événement: ${JSON.stringify(firstEvent.properties?.name || firstEvent.properties?.['rdfs:label']?.['fr']?.[0] || 'Sans nom').substring(0, 50)}`);
        }
      } else {
        console.log('  - Structure de la réponse:', Object.keys(response.data || {}));
        console.log('  - Réponse complète (premiers 500 caractères):', JSON.stringify(response.data).substring(0, 500));
      }
    } catch (error) {
      console.log('❌ Erreur lors de l\'appel API:');
      if (error.response) {
        console.log(`  - Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`  - Headers:`, error.response.headers);
        console.log(`  - Données:`, JSON.stringify(error.response.data).substring(0, 500));
      } else if (error.request) {
        console.log(`  - Pas de réponse reçue`);
        console.log(`  - Détails: ${error.message}`);
      } else {
        console.log(`  - Erreur: ${error.message}`);
      }
    }
  })();
}

console.log('\n✅ Diagnostic terminé');




