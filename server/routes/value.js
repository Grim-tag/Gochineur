const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

module.exports = function () {
    const router = express.Router();
    console.log('🔧 Initializing Value Routes...');

    // Configuration Cloudinary
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Configuration Multer (stockage en mémoire)
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
    });

    // Configuration
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    const EBAY_APP_ID = process.env.EBAY_CLIENT_ID;
    const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';

    // Helper function to upload to Cloudinary
    const uploadToCloudinary = (buffer) => {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'temp_analysis' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(buffer);
        });
    };

    // Route de test
    router.get('/test', (req, res) => {
        res.json({ status: 'OK', message: 'Value API is working' });
    });

    // Route 1: Identification Visuelle (SerpApi / Google Lens)
    router.post('/identify-photo', upload.single('image'), async (req, res) => {
        console.log('📸 [Step 1] Identification request received');
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Aucune image fournie' });
            }

            if (!SERPAPI_KEY) {
                throw new Error('Clé API SerpApi manquante (SERPAPI_KEY)');
            }

            // Log file details
            console.log(`📂 Received file: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

            // Pré-traitement de l'image
            let processedImageBuffer;
            try {
                processedImageBuffer = await sharp(req.file.buffer)
                    .resize(800, 800, { fit: 'inside' })
                    .jpeg({ quality: 80 })
                    .toBuffer();
                console.log('✅ Image processed with Sharp');
            } catch (sharpError) {
                console.warn('⚠️ Sharp processing failed, using original buffer:', sharpError.message);
                processedImageBuffer = req.file.buffer;
            }

            // 1. Upload to Cloudinary to get a public URL
            console.log('☁️ Uploading to Cloudinary...');
            const cloudinaryResult = await uploadToCloudinary(processedImageBuffer);
            const imageUrl = cloudinaryResult.secure_url;
            console.log('✅ Image uploaded:', imageUrl);

            // 2. Call SerpApi with the public URL
            console.log('🔍 Sending to SerpApi (Google Lens)...');

            const serpResponse = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_lens',
                    api_key: SERPAPI_KEY,
                    url: imageUrl
                }
            });

            const visualMatches = serpResponse.data.visual_matches || [];
            let identifiedTitle = '';

            if (visualMatches.length > 0) {
                identifiedTitle = visualMatches[0].title;
                console.log('🧠 Identified Title:', identifiedTitle);
            } else {
                console.log('⚠️ No visual matches found');
            }

            // Optional: Delete from Cloudinary to save space? 
            // For now we keep it as it might be useful for debugging or history.

            res.json({
                success: true,
                identifiedTitle: identifiedTitle || '',
                imageUrl: imageUrl // Return the URL so frontend can use it if needed
            });

        } catch (error) {
            console.error('❌ Error in /identify-photo:', error.message);

            // Log to file for debugging
            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.join(__dirname, '..', 'error.log');
                const logEntry = `[${new Date().toISOString()}] /identify-photo Error: ${error.message}\nStack: ${error.stack}\nResponse: ${JSON.stringify(error.response?.data || 'No response data')}\n\n`;
                fs.appendFileSync(logPath, logEntry);
            } catch (e) {
                console.error('Failed to write to error log:', e);
            }

            res.status(500).json({ error: 'Erreur lors de l\'identification', details: error.message });
        }
    });

    const { authenticateJWT, requireAdmin } = require('../middleware/auth');

    // Route 2: Estimation sur Objets Vendus (eBay Finding API)
    // PROTECTED: Admin only
    router.post('/estimate-by-title', authenticateJWT, requireAdmin, async (req, res) => {
        console.log('💰 [Step 2] Estimation request received');
        try {
            const { searchQuery } = req.body;

            if (!searchQuery) {
                return res.status(400).json({ error: 'Titre de recherche manquant' });
            }

            if (!EBAY_APP_ID) {
                throw new Error('EBAY_CLIENT_ID (App ID) manquant');
            }

            console.log(`🔎 Searching eBay Sold Items for: "${searchQuery}"`);

            // Appel eBay Finding API (Legacy)
            // Note: Passing SECURITY-APPNAME in params as well to ensure it's picked up
            const headers = {
                'X-EBAY-SOA-OPERATION-NAME': 'findCompletedItems',
                'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID,
                'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
                'X-EBAY-SOA-GLOBAL-ID': 'EBAY-FR'
            };

            // Inject User Token if available (bypasses rate limits)
            if (process.env.EBAY_USER_TOKEN) {
                console.log('🔑 EBAY_USER_TOKEN found, injecting into headers...');
                headers['X-EBAY-SOA-SECURITY-TOKEN'] = process.env.EBAY_USER_TOKEN;
            } else {
                console.warn('⚠️ EBAY_USER_TOKEN is missing from environment variables');
            }

            const response = await axios.get(EBAY_FINDING_URL, {
                headers: headers,
                params: {
                    'SECURITY-APPNAME': EBAY_APP_ID,
                    'OPERATION-NAME': 'findCompletedItems',
                    'SERVICE-VERSION': '1.0.0',
                    'RESPONSE-DATA-FORMAT': 'JSON',
                    'keywords': searchQuery,
                    'categoryId': '',
                    'itemFilter(0).name': 'SoldItemsOnly',
                    'itemFilter(0).value': 'true',
                    'sortOrder': 'EndTimeSoonest',
                    'paginationInput.entriesPerPage': '20'
                }
            });

            const data = response.data;

            if (data.findCompletedItemsResponse && data.findCompletedItemsResponse[0].ack[0] === 'Failure') {
                const errorData = data.findCompletedItemsResponse[0].errorMessage[0].error[0];
                const errorId = errorData.errorId[0];
                const errorMsg = errorData.message[0];

                console.error(`❌ eBay API Error [${errorId}]: ${errorMsg}`);

                if (errorId === '10001') {
                    return res.status(429).json({
                        error: 'Limite d\'appels eBay atteinte pour aujourd\'hui.',
                        details: 'Le quota journalier de l\'API eBay a été dépassé. Veuillez réessayer demain ou saisir le prix manuellement.'
                    });
                }

                throw new Error(`eBay API Error: ${errorMsg}`);
            }

            const searchResult = data.findCompletedItemsResponse[0].searchResult[0];
            const count = parseInt(searchResult['@count'], 10);

            if (count === 0) {
                console.log('⚠️ No sold items found');
                return res.json({
                    success: true,
                    averagePrice: 0,
                    minPrice: 0,
                    maxPrice: 0,
                    soldCount: 0,
                    message: 'Aucune vente trouvée pour cet objet'
                });
            }

            const items = searchResult.item || [];
            const prices = items.map(item => {
                const sellingStatus = item.sellingStatus && item.sellingStatus[0];
                const currentPrice = sellingStatus && sellingStatus.currentPrice && sellingStatus.currentPrice[0];
                return currentPrice ? parseFloat(currentPrice['__value__']) : null;
            }).filter(p => p !== null && !isNaN(p));

            if (prices.length === 0) {
                return res.json({ success: true, averagePrice: 0, soldCount: 0 });
            }

            prices.sort((a, b) => a - b);
            const mid = Math.floor(prices.length / 2);
            const medianPrice = prices.length % 2 !== 0
                ? prices[mid]
                : (prices[mid - 1] + prices[mid]) / 2;

            const minPrice = prices[0];
            const maxPrice = prices[prices.length - 1];

            console.log(`✅ Found ${count} sold items. Median: ${medianPrice}€ (Range: ${minPrice}-${maxPrice})`);

            res.json({
                success: true,
                averagePrice: medianPrice,
                minPrice: minPrice,
                maxPrice: maxPrice,
                soldCount: count,
                currency: 'EUR'
            });

        } catch (error) {
            console.error('❌ Error in /estimate-by-title:', error.message);

            if (error.response && error.response.data) {
                const data = error.response.data;
                console.error('eBay Response Data:', JSON.stringify(data, null, 2));

                // Check for Rate Limit Error (10001) in the error response
                if (data.errorMessage && data.errorMessage[0] && data.errorMessage[0].error) {
                    const errorData = data.errorMessage[0].error[0];
                    const errorId = errorData.errorId ? errorData.errorId[0] : null;

                    if (errorId === '10001') {
                        return res.status(429).json({
                            error: 'Limite d\'appels eBay atteinte pour aujourd\'hui.',
                            details: 'Le quota journalier de l\'API eBay a été dépassé. Veuillez réessayer demain ou saisir le prix manuellement.'
                        });
                    }
                }
            }

            // Log to file for debugging
            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.join(__dirname, '..', 'error.log');
                const logEntry = `[${new Date().toISOString()}] /estimate-by-title Error: ${error.message}\nStack: ${error.stack}\nResponse: ${JSON.stringify(error.response?.data || 'No response data')}\n\n`;
                fs.appendFileSync(logPath, logEntry);
            } catch (e) {
                console.error('Failed to write to error log:', e);
            }

            res.status(500).json({ error: 'Erreur lors de l\'estimation', details: error.message });
        }
    });

    return router;
};
