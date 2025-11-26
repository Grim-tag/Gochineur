const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const vision = require('@google-cloud/vision');

// Configuration Multer (stockage en mémoire)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Configuration
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

// URLs eBay (Sandbox pour le test)
const EBAY_OAUTH_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
const EBAY_BROWSE_URL = 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search';

// Helper: Obtenir Token eBay
async function getEbayToken() {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
        throw new Error('Identifiants eBay manquants');
    }

    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.post(EBAY_OAUTH_URL,
            'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Erreur Auth eBay:', error.response?.data || error.message);
        throw new Error('Impossible de se connecter à eBay');
    }
}

// Route: Estimer la valeur par photo
router.post('/photo', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        // 1. Pré-traitement de l'image avec Sharp
        const processedImageBuffer = await sharp(req.file.buffer)
            .resize(800, 800, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();

        // 2. Google Cloud Vision (Label & Web Detection)
        // Utilisation de l'API REST si une clé API simple est fournie, sinon SDK
        let labels = [];
        let webEntities = [];

        if (GOOGLE_VISION_API_KEY) {
            // Méthode REST (plus simple avec une clé API string)
            const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
            const visionResponse = await axios.post(visionUrl, {
                requests: [{
                    image: { content: processedImageBuffer.toString('base64') },
                    features: [
                        { type: 'LABEL_DETECTION', maxResults: 5 },
                        { type: 'WEB_DETECTION', maxResults: 5 }
                    ]
                }]
            });

            const result = visionResponse.data.responses[0];
            labels = result.labelAnnotations?.map(l => l.description) || [];
            webEntities = result.webDetection?.webEntities?.map(w => w.description) || [];
        } else {
            // Fallback SDK (nécessite GOOGLE_APPLICATION_CREDENTIALS json)
            // Note: Si le SDK est installé mais pas configuré, cela échouera ici
            try {
                const client = new vision.ImageAnnotatorClient();
                const [result] = await client.annotateImage({
                    image: { content: processedImageBuffer },
                    features: [{ type: 'LABEL_DETECTION' }, { type: 'WEB_DETECTION' }]
                });
                labels = result.labelAnnotations?.map(l => l.description) || [];
                webEntities = result.webDetection?.webEntities?.map(w => w.description) || [];
            } catch (sdkError) {
                console.warn('Erreur SDK Vision (fallback):', sdkError.message);
                if (!GOOGLE_VISION_API_KEY) {
                    throw new Error('Configuration Google Vision manquante (API Key ou Credentials)');
                }
            }
        }

        // Combiner et nettoyer les mots-clés
        const allKeywords = [...new Set([...webEntities, ...labels])].filter(k => k);
        const searchQuery = allKeywords.slice(0, 3).join(' '); // Prendre les 3 premiers

        console.log('Mots-clés détectés:', allKeywords);
        console.log('Recherche eBay:', searchQuery);

        if (!searchQuery) {
            return res.json({
                success: true,
                estimatedMin: 0,
                estimatedMax: 0,
                currency: 'EUR',
                keywords: [],
                message: 'Aucun objet identifiable détecté'
            });
        }

        // 3. eBay Browse API
        const token = await getEbayToken();
        const ebayResponse = await axios.get(EBAY_BROWSE_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR' // Marché français
            },
            params: {
                q: searchQuery,
                limit: 10,
                sort: 'price' // Pour avoir une idée de la fourchette
            }
        });

        const items = ebayResponse.data.itemSummaries || [];

        if (items.length === 0) {
            return res.json({
                success: true,
                estimatedMin: 0,
                estimatedMax: 0,
                currency: 'EUR',
                keywords: allKeywords,
                message: 'Aucun objet similaire trouvé sur eBay'
            });
        }

        // Calculer la fourchette de prix
        const prices = items
            .map(item => parseFloat(item.price.value))
            .filter(p => !isNaN(p));

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        res.json({
            success: true,
            estimatedMin: minPrice,
            estimatedMax: maxPrice,
            averagePrice: avgPrice,
            currency: 'EUR', // On force EUR car on a demandé EBAY_FR, mais idéalement on prendrait la devise de la réponse
            keywords: allKeywords,
            itemCount: items.length,
            sampleItem: items[0] // Pour info
        });

    } catch (error) {
        console.error('Erreur API Value:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'estimation',
            details: error.message
        });
    }
});

module.exports = () => router;
