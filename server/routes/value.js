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
            logger.info(`🛍️ Google Shopping search for: "${query}"`);

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

    // POST /api/value/estimate-by-title - Get price estimation using Google Shopping (SerpApi)
    // PROTECTED: Admin only
    router.post('/estimate-by-title', authenticateJWT, requireAdmin, async (req, res) => {
        logger.info('💰 [Step 2] Estimation request received (Google Shopping Only)');

        // Declare at route level so accessible in catch block
        let searchQuery = req.body.searchQuery;
        let imageUrl = req.body.imageUrl;

        try {

            if (!searchQuery) {
                return res.status(400).json({ error: 'Titre de recherche manquant' });
            }

            if (!SERPAPI_KEY) {
                throw new Error('SERPAPI_KEY manquante');
            }

            logger.info(`🔎 Searching Google Shopping for: "${searchQuery}"`);

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
            } else {
                // No Google Shopping result
                logger.info('⚠️ No results found on Google Shopping');
                return res.json({
                    success: true,
                    averagePrice: 0,
                    minPrice: 0,
                    maxPrice: 0,
                    soldCount: 0,
                    message: 'Aucun résultat trouvé sur Google Shopping',
                    source: 'google_shopping'
                });
            }

        } catch (error) {
            logger.error('❌ Error in /estimate-by-title:', error.message);

            // Log to file for debugging
            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.join(__dirname, '..', 'error.log');
                const logEntry = `[${new Date().toISOString()}] /estimate-by-title Error: ${error.message}\nStack: ${error.stack}\nResponse: ${JSON.stringify(error.response?.data || 'No response data')}\n\n`;
                fs.appendFileSync(logPath, logEntry);
            } catch (e) {
                logger.error('Failed to write to error log:', e);
            }

            res.status(500).json({ error: 'Erreur lors de l\'estimation', details: error.message });
        }
    });

    return router;
};