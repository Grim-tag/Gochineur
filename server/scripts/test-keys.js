require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const axios = require('axios');

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

console.log('--- TEST DES CLÉS API ---');

// 1. Check Google Vision
if (GOOGLE_VISION_API_KEY) {
    console.log('✅ GOOGLE_VISION_API_KEY trouvée:', GOOGLE_VISION_API_KEY.substring(0, 5) + '...');

    // Test réel de l'API Vision
    console.log('🔄 Test de l\'API Google Vision...');
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

    // Image 1x1 pixel blanc en base64
    const dummyImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==';

    axios.post(visionUrl, {
        requests: [{
            image: { content: dummyImage },
            features: [{ type: 'LABEL_DETECTION', maxResults: 1 }]
        }]
    }).then(res => {
        console.log('✅ API Google Vision FONCTIONNELLE !');
    }).catch(err => {
        console.error('❌ Erreur API Google Vision:', err.response?.data?.error?.message || err.message);
        console.error('   Code:', err.response?.status);
        console.error('   Détails:', JSON.stringify(err.response?.data?.error, null, 2));
        console.error('   Conseil: Vérifiez que "Cloud Vision API" est activée dans la console Google Cloud et que la facturation est active.');
    });

} else {
    console.error('❌ GOOGLE_VISION_API_KEY manquante');
}

// 2. Check eBay
if (EBAY_CLIENT_ID && EBAY_CLIENT_SECRET) {
    console.log('✅ Identifiants eBay trouvés');
    console.log('   Client ID:', EBAY_CLIENT_ID.substring(0, 5) + '...');

    // Test Auth eBay
    console.log('🔄 Tentative de connexion à eBay Production...');
    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');

    axios.post('https://api.ebay.com/identity/v1/oauth2/token',
        'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
        {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    ).then(response => {
        console.log('✅ Connexion eBay RÉUSSIE !');
        console.log('   Token reçu (valide 2h)');
    }).catch(error => {
        console.error('❌ Échec connexion eBay:', error.response?.data || error.message);
        console.error('   Vérifiez que vos identifiants sont bien ceux de la SANDBOX eBay.');
    });

} else {
    console.error('❌ Identifiants eBay manquants (EBAY_CLIENT_ID ou EBAY_CLIENT_SECRET)');
}
