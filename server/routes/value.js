const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

module.exports = function ({ logger, authenticateJWT, requireAdmin, getPriceHistoryCollection, getUserEstimationsTempCollection, db }) {
    const router = express.Router();
    logger.info('🔧 Initializing Value Routes...');

    // Configuration Cloudinary
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Configuration Multer (stockage en mémoire)
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 20 * 1024 * 1024 } // 20MB max (smartphones photos)
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

    // Clean product titles by removing site names and URLs
    const cleanTitle = (title) => {
        if (!title) return '';
        const patterns = [/Amazon\.com:\s*/gi, /Amazon\.fr:\s*/gi, /eBay:\s*/gi, /GameStop\s*\|\s*/gi, /\|\s*GameStop/gi, /Walmart:\s*/gi, /Best Buy:\s*/gi, /Target:\s*/gi, /Fnac:\s*/gi, /Cdiscount:\s*/gi, /Rakuten:\s*/gi, /AliExpress:\s*/gi, /\bhttps?:\/\/[^\s]+/gi, /www\.[^\s]+/gi, /\.\w{2,3}$/gi];
        let cleaned = title;
        patterns.forEach(p => { cleaned = cleaned.replace(p, ''); });
        return cleaned.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[^\w\d]+|[^\w\d]+$/g, '');
    };

    // Helper function to fetch prices from Google Shopping via SerpApi
    const fetchGoogleShoppingPrices = async (query) => {
        try {
            logger.info(`🛍️ Google Shopping fallback for: "${query}"`);

            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_shopping',
                    q: query,
                    api_key: SERPAPI_KEY,
                    google_domain: 'google.fr',
                    gl: 'fr',
                    hl: 'fr'
                }
            });

            const shoppingResults = response.data.shopping_results || [];

            if (shoppingResults.length === 0) {
                logger.warn('⚠️ No Google Shopping results found');
                return null;
            }

            // Extract prices
            const prices = shoppingResults
                .map(item => item.price)
                .filter(p => p) // Filter undefined/null
                .map(p => {
                    // Extract numeric value from string like "12,50 €" or "€12.50"
                    const match = p.toString().match(/[\d,.]+/);
                    if (!match) return null;
                    // Replace comma with dot for parsing if needed
                    let val = match[0].replace(',', '.');
                    return parseFloat(val);
                })
                .filter(p => p !== null && !isNaN(p));

            if (prices.length === 0) {
                return null;
            }

            prices.sort((a, b) => a - b);
            const mid = Math.floor(prices.length / 2);
            const medianPrice = prices.length % 2 !== 0
                ? prices[mid]
                : (prices[mid - 1] + prices[mid]) / 2;

            const minPrice = prices[0];
            const maxPrice = prices[prices.length - 1];

            logger.info(`✅ Google Shopping: ${prices.length} items. Median: ${medianPrice}€`);

            return {
                medianPrice,
                minPrice,
                maxPrice,
                count: prices.length
            };

        } catch (error) {
            logger.error('❌ Google Shopping API Error:', error.message);
            return null;
        }
    };

    // Route de test
    router.get('/test', (req, res) => {
        res.json({ status: 'OK', message: 'Value API is working' });
    });

    // Route 1: Identification Visuelle (SerpApi / Google Lens)
    router.post('/identify-photo', upload.single('image'), async (req, res) => {
        logger.info('📸 [Step 1] Identification request received');
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Aucune image fournie' });
            }

            if (!SERPAPI_KEY) {
                throw new Error('Clé API SerpApi manquante (SERPAPI_KEY)');
            }

            // Log file details
            logger.info(`📂 Received file: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

            // Pré-traitement de l'image
            let processedImageBuffer;
            try {
                processedImageBuffer = await sharp(req.file.buffer)
                    .resize(800, 800, { fit: 'inside' })
                    .jpeg({ quality: 80 })
                    .toBuffer();
                logger.info('✅ Image processed with Sharp');
            } catch (sharpError) {
                logger.warn('⚠️ Sharp processing failed, using original buffer:', sharpError.message);
                processedImageBuffer = req.file.buffer;
            }

            // 1. Upload to Cloudinary to get a public URL
            logger.info('☁️ Uploading to Cloudinary...');
            const cloudinaryResult = await uploadToCloudinary(processedImageBuffer);
            const imageUrl = cloudinaryResult.secure_url;
            logger.info('✅ Image uploaded:', imageUrl);

            // 2. Call SerpApi with the public URL
            logger.info('🔍 Sending to SerpApi (Google Lens)...');

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
                logger.info('🧠 Raw:', identifiedTitle);
                identifiedTitle = cleanTitle(identifiedTitle);
                logger.info('✨ Clean:', identifiedTitle);
            } else {
                logger.info('⚠️ No visual matches found');
            }

            res.json({
                success: true,
                identifiedTitle: identifiedTitle || '',
                imageUrl: imageUrl // Return the URL so frontend can use it if needed
            });

            // Clean up temporary Cloudinary upload after response
            try {
                const publicId = cloudinaryResult.public_id;
                await cloudinary.uploader.destroy(publicId);
                logger.info('🧹 Temp image deleted from Cloudinary:', publicId);
            } catch (cleanupError) {
                logger.warn('⚠️ Failed to delete temp image:', cleanupError.message);
            }

        } catch (error) {
            logger.error('❌ Error in /identify-photo:', error.message);
            res.status(500).json({ error: 'Erreur lors de l\'identification de l\'image', details: error.message });
        }
    });

    // POST /api/value/estimate-by-title - Get price estimation using eBay Finding API (Sold Items)
    // PROTECTED: Admin only
    router.post('/estimate-by-title', authenticateJWT, requireAdmin, async (req, res) => {
        logger.info('💰 [Step 2] Estimation request received');

        // Declare at route level so accessible in catch block
        let searchQuery = req.body.searchQuery;
        let imageUrl = req.body.imageUrl;

        try {

            if (!searchQuery) {
                return res.status(400).json({ error: 'Titre de recherche manquant' });
            }

            if (!EBAY_APP_ID) {
                throw new Error('EBAY_CLIENT_ID (App ID) manquant');
            }

            logger.info(`🔎 Searching eBay Sold Items for: "${searchQuery}"`);

            // Appel eBay Finding API (Legacy)
            const headers = {
                'X-EBAY-SOA-OPERATION-NAME': 'findCompletedItems',
                'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID,
                'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
                'X-EBAY-SOA-GLOBAL-ID': 'EBAY-FR'
            };

            // Inject User Token if available (bypasses rate limits)
            if (process.env.EBAY_USER_TOKEN) {
                logger.info('🔑 EBAY_USER_TOKEN found, injecting into headers...');
                headers['X-EBAY-SOA-SECURITY-TOKEN'] = process.env.EBAY_USER_TOKEN;
            } else {
                logger.warn('⚠️ EBAY_USER_TOKEN is missing from environment variables');
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

                logger.error(`❌ eBay API Error [${errorId}]: ${errorMsg}`);

                // ✨ FALLBACK: If eBay quota exceeded, try Google Shopping
                if (errorId === '10001') {
                    logger.info('🔄 eBay quota exceeded, falling back to Google Shopping...');

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
                            logger.error('⚠️ Error saving Google Shopping to price_history:', historyError);
                        }

                        // Save to user_estimations_temp
                        try {
                            const userEstimationsTempCollection = getUserEstimationsTempCollection();
                            await userEstimationsTempCollection.insertOne({
                                user_id: req.user.id,
                                search_query: searchQuery,
                                image_url: imageUrl || null,
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
                            logger.error('⚠️ Error saving to user_estimations_temp:', tempError);
                        }

                        // Return Google Shopping result
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

                    // No Google Shopping result
                    return res.status(500).json({
                        success: false,
                        error: 'Limite d\'appels eBay atteinte et Google Shopping indisponible.',
                        details: 'Le quota journalier de l\'API eBay a été dépassé et Google Shopping n\'a pas retourné de résultats.'
                    });
                }

                // Other eBay errors
                return res.status(500).json({
                    success: false,
                    error: `eBay API Error: ${errorMsg}`
                });
            }

            // Normal eBay processing
            const searchResult = data.findCompletedItemsResponse[0].searchResult[0];
            const count = parseInt(searchResult['@count'], 10);

            if (count === 0) {
                logger.info('⚠️ No sold items found');
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

            logger.info(`✅ Found ${count} sold items. Median: ${medianPrice}€ (Range: ${minPrice}-${maxPrice})`);

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
                logger.info('💾 Price history updated (eBay)');
            } catch (historyError) {
                logger.error('⚠️ Error saving to price_history:', historyError);
            }

            // ✨ NEW: Save to user_estimations_temp collection
            try {
                const userEstimationsTempCollection = getUserEstimationsTempCollection();
                await userEstimationsTempCollection.insertOne({
                    user_id: req.user.id,
                    search_query: searchQuery,
                    image_url: imageUrl || null,
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
                logger.info('💾 Temp estimation saved (eBay)');
            } catch (tempError) {
                logger.error('⚠️ Error saving to user_estimations_temp:', tempError);
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
            logger.error('❌ Error in /estimate-by-title:', error.message);
            res.status(500).json({ error: 'Erreur lors de l\'estimation', details: error.message });
        }
    });

    return router;
};