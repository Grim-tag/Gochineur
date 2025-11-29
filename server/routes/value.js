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

            // Convert to base64 for temporary storage
            const imageBase64 = processedImageBuffer.toString('base64');
            console.log('✅ Image converted to base64');

            // Upload to Cloudinary TEMP folder (needed for SerpApi, will be deleted later)
            console.log('☁️ Uploading to Cloudinary temp folder...');
            const cloudinaryResult = await uploadToCloudinary(processedImageBuffer);
            const imageUrl = cloudinaryResult.secure_url;
            const cloudinaryPublicId = cloudinaryResult.public_id;
            console.log('✅ Temp image uploaded:', imageUrl);

            // Call SerpApi with the public URL
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

            // Return base64 instead of Cloudinary URL
            // The temp Cloudinary image will be cleaned up later or expire
            res.json({
                success: true,
                identifiedTitle: identifiedTitle || '',
                imageBase64: imageBase64, // Return base64 for temp storage
                cloudinaryPublicId: cloudinaryPublicId // For cleanup if needed
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

    // Helper function to fetch prices from Google Shopping (via SerpApi)
    const fetchGoogleShoppingPrices = async (searchQuery) => {
        console.log(`🛒 Fetching prices from Google Shopping for: "${searchQuery}"`);

        try {
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_shopping',
                    q: searchQuery,
                    api_key: SERPAPI_KEY,
                    gl: 'fr', // France
                    hl: 'fr', // French
                    num: 20   // Get 20 results
                }
            });

            const shoppingResults = response.data.shopping_results || [];

            if (shoppingResults.length === 0) {
                console.log('⚠️ No Google Shopping results found');
                return null;
            }

            // Extract prices
            const prices = shoppingResults
                .map(item => {
                    // Try to get price from different possible fields
                    const priceStr = item.extracted_price || item.price;
                    if (!priceStr) return null;

                    // Parse price (handle different formats)
                    const price = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
                    return isNaN(price) ? null : price;
                })
                .filter(p => p !== null && p > 0);

            if (prices.length === 0) {
                console.log('⚠️ No valid prices found in Google Shopping results');
                return null;
            }

            // Calculate median
            prices.sort((a, b) => a - b);
            const mid = Math.floor(prices.length / 2);
            const medianPrice = prices.length % 2 !== 0
                ? prices[mid]
                : (prices[mid - 1] + prices[mid]) / 2;

            const minPrice = prices[0];
            const maxPrice = prices[prices.length - 1];

            console.log(`✅ Google Shopping: ${prices.length} results. Median: ${medianPrice}€ (Range: ${minPrice}-${maxPrice})`);

            return {
                medianPrice,
                minPrice,
                maxPrice,
                count: prices.length,
                source: 'google_shopping'
            };

        } catch (error) {
            console.error('❌ Error fetching Google Shopping prices:', error.message);
            return null;
        }
    };

    const { authenticateJWT, requireAdmin } = require('../middleware/auth');
    const { getPriceHistoryCollection, getUserEstimationsTempCollection } = require('../config/db');

    // Route 2: Estimation sur Objets Vendus (eBay Finding API)
    // PROTECTED: Admin only
    router.post('/estimate-by-title', authenticateJWT, requireAdmin, async (req, res) => {
        console.log('💰 [Step 2] Estimation request received');
        try {
            const { searchQuery, imageBase64 } = req.body;

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

                // ✨ FALLBACK: If eBay quota exceeded, try Google Shopping
                if (errorId === '10001') {
                    console.log('🔄 eBay quota exceeded, falling back to Google Shopping...');

                    const googleResult = await fetchGoogleShoppingPrices(searchQuery);

                    if (googleResult) {
                        // Save to price_history with Google Shopping source
                        try {
                            const priceHistoryCollection = getPriceHistoryCollection();
                            await priceHistoryCollection.updateOne(
                                { search_query: searchQuery },
                                {
                                    $set: {
                                        median_price: googleResult.medianPrice,
                                        min_price: googleResult.minPrice,
                                        max_price: googleResult.maxPrice,
                                        sold_count_total: googleResult.count,
                                        source: 'google_shopping',
                                        last_updated: new Date()
                                    }
                                },
                                { upsert: true }
                            );
                        } catch (historyError) {
                            console.error('⚠️ Error saving Google Shopping to price_history:', historyError);
                        }

                        // Save to user_estimations_temp
                        try {
                            const userEstimationsTempCollection = getUserEstimationsTempCollection();
                            await userEstimationsTempCollection.insertOne({
                                user_id: req.user.id,
                                search_query: searchQuery,
                                image_base64: imageBase64 || null, // Store base64 instead of URL
                                estimation_result: {
                                    median_price: googleResult.medianPrice,
                                    min_price: googleResult.minPrice,
                                    max_price: googleResult.maxPrice,
                                    sold_count: googleResult.count
                                },
                                source: 'google_shopping',
                                status: 'keeper',
                                createdAt: new Date()
                            });
                        } catch (tempError) {
                            console.error('⚠️ Error saving to user_estimations_temp:', tempError);
                        }

                        return res.json({
                            success: true,
                            averagePrice: googleResult.medianPrice,
                            minPrice: googleResult.minPrice,
                            maxPrice: googleResult.maxPrice,
                            soldCount: googleResult.count,
                            source: 'google_shopping',
                            currency: 'EUR'
                        });
                    }

                    // If Google Shopping also fails, return error
                    return res.status(429).json({
                        error: 'Limite d\'appels eBay atteinte et Google Shopping indisponible.',
                        details: 'Le quota journalier de l\'API eBay a été dépassé et Google Shopping n\'a pas retourné de résultats. Veuillez réessayer plus tard ou saisir le prix manuellement.'
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

            // ✨ NEW: Save to price_history collection
            try {
                const priceHistoryCollection = getPriceHistoryCollection();
                await priceHistoryCollection.updateOne(
                    { search_query: searchQuery },
                    {
                        $set: {
                            median_price: medianPrice,
                            min_price: minPrice,
                            max_price: maxPrice,
                            sold_count_total: count,
                            source: 'ebay',
                            last_updated: new Date()
                        }
                    },
                    { upsert: true }
                );
                console.log('💾 Price history updated (eBay)');
            } catch (historyError) {
                console.error('⚠️ Error saving to price_history:', historyError);
                // Continue even if history save fails
            }

            // ✨ NEW: Save to user_estimations_temp collection
            try {
                const userEstimationsTempCollection = getUserEstimationsTempCollection();
                await userEstimationsTempCollection.insertOne({
                    user_id: req.user.id,
                    search_query: searchQuery,
                    image_base64: imageBase64 || null, // Store base64 instead of URL
                    estimation_result: {
                        median_price: medianPrice,
                        min_price: minPrice,
                        max_price: maxPrice,
                        sold_count: count
                    },
                    source: 'ebay',
                    status: 'keeper', // Default status
                    createdAt: new Date()
                });
                console.log('💾 Temp estimation saved (eBay)');
            } catch (tempError) {
                console.error('⚠️ Error saving to user_estimations_temp:', tempError);
                // Continue even if temp save fails
            }

            res.json({
                success: true,
                averagePrice: medianPrice,
                minPrice: minPrice,
                maxPrice: maxPrice,
                soldCount: count,
                source: 'ebay',
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
