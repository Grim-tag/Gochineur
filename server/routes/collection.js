const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const { ObjectId } = require('mongodb');
const { getUserItemsCollection, getUserEstimationsTempCollection } = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');
const DOMPurify = require('isomorphic-dompurify');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
    fileFilter: (req, file, cb) => {
        // Accepter uniquement les images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté. Veuillez uploader uniquement des images.'), false);
        }
    }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'user_collections' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

module.exports = () => {
    // GET /api/collection - Get all items for the authenticated user
    router.get('/', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;

            const items = await collection.find({ user_id: userId }).toArray();

            res.json({
                success: true,
                count: items.length,
                data: items
            });
        } catch (error) {
            console.error('Error fetching collection:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // GET /api/collection/temp - Get pending estimations for the authenticated user
    router.get('/temp', authenticateJWT, async (req, res) => {
        try {
            const { getUserEstimationsTempCollection } = require('../config/db');
            const collection = getUserEstimationsTempCollection();
            const userId = req.user.id;

            const items = await collection.find({ user_id: userId }).sort({ createdAt: -1 }).toArray();

            res.json({
                success: true,
                count: items.length,
                data: items
            });
        } catch (error) {
            console.error('Error fetching temp estimations:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // DELETE /api/collection/temp/:id - Delete temporary estimation
    router.delete('/temp/:id', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserEstimationsTempCollection();
            const result = await collection.deleteOne({
                _id: new ObjectId(req.params.id),
                user_id: req.user.id
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Not found' });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting temp estimation:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // GET /api/collection/search - Search and filter collection
    router.get('/search', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;
            const { q, category, status, priceMin, priceMax, sort, page = 1, limit = 50 } = req.query;

            // Build query
            const query = { user_id: userId };

            // Text search (name, description, category, subCategory)
            if (q) {
                query.$or = [
                    { name: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } },
                    { category: { $regex: q, $options: 'i' } },
                    { subCategory: { $regex: q, $options: 'i' } }
                ];
            }

            // Filters
            if (category && category !== 'all') query.category = category;
            if (status && status !== 'all') query.status = status;
            if (priceMin || priceMax) {
                query.purchasePrice = {};
                if (priceMin) query.purchasePrice.$gte = parseFloat(priceMin);
                if (priceMax) query.purchasePrice.$lte = parseFloat(priceMax);
            }

            // Sorting
            let sortObj = { createdAt: -1 }; // Default: newest first
            if (sort === 'price_asc') sortObj = { purchasePrice: 1 };
            else if (sort === 'price_desc') sortObj = { purchasePrice: -1 };
            else if (sort === 'name_asc') sortObj = { name: 1 };
            else if (sort === 'name_desc') sortObj = { name: -1 };
            else if (sort === 'date_asc') sortObj = { createdAt: 1 };

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Execute query
            const items = await collection.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit))
                .toArray();

            const total = await collection.countDocuments(query);

            res.json({
                success: true,
                data: items,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Error searching collection:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // GET /api/collection/stats - Get collection statistics
    router.get('/stats', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;

            const items = await collection.find({ user_id: userId }).toArray();

            const stats = {
                totalItems: items.length,
                totalValue: items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0),
                byStatus: {
                    keeper: items.filter(i => i.status === 'keeper').length,
                    for_sale: items.filter(i => i.status === 'for_sale').length,
                    for_exchange: items.filter(i => i.status === 'for_exchange').length
                },
                byCategory: {}
            };

            // Count by category
            items.forEach(item => {
                const cat = item.category || 'Non classé';
                stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
            });

            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // POST /api/collection/bulk-delete - Bulk delete items
    router.post('/bulk-delete', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;
            const { itemIds } = req.body;

            if (!itemIds || !Array.isArray(itemIds)) {
                return res.status(400).json({ success: false, error: 'Invalid itemIds' });
            }

            const result = await collection.deleteMany({
                _id: { $in: itemIds.map(id => new ObjectId(id)) },
                user_id: userId
            });

            res.json({ success: true, deletedCount: result.deletedCount });
        } catch (error) {
            console.error('Error bulk deleting:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // POST /api/collection/bulk-update-status - Bulk update status
    router.post('/bulk-update-status', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;
            const { itemIds, status } = req.body;

            if (!itemIds || !Array.isArray(itemIds) || !status) {
                return res.status(400).json({ success: false, error: 'Invalid parameters' });
            }

            const result = await collection.updateMany(
                {
                    _id: { $in: itemIds.map(id => new ObjectId(id)) },
                    user_id: userId
                },
                { $set: { status, updatedAt: new Date() } }
            );

            res.json({ success: true, modifiedCount: result.modifiedCount });
        } catch (error) {
            console.error('Error bulk updating status:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });


    // POST /api/collection/add - Add a new item with images
    router.post('/add', authenticateJWT, upload.array('photos', 3), async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;

            const {
                name, category, subCategory, description, historyLog,
                date_acquisition, etat_objet, emplacement_stockage,
                acquisitionEventId, purchasePrice, frais_annexes, devise,
                valeur_estimee, source_estimation, status, isPublic,
                metadonnees_techniques
            } = req.body;

            // Sanitisation des entrées
            const sanitizedName = DOMPurify.sanitize(name);
            const sanitizedDescription = description ? DOMPurify.sanitize(description) : null;
            const sanitizedHistoryLog = historyLog ? DOMPurify.sanitize(historyLog) : null;
            const sanitizedCategory = category ? DOMPurify.sanitize(category) : null;
            const sanitizedSubCategory = subCategory ? DOMPurify.sanitize(subCategory) : null;
            const sanitizedEtat = etat_objet ? DOMPurify.sanitize(etat_objet) : null;
            const sanitizedEmplacement = emplacement_stockage ? DOMPurify.sanitize(emplacement_stockage) : null;

            if (!sanitizedName) {
                return res.status(400).json({ success: false, error: 'Name is required' });
            }

            let photoUrls = [];

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const optimizedBuffer = await sharp(file.buffer)
                        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toBuffer();

                    const uploadResult = await uploadToCloudinary(optimizedBuffer);
                    photoUrls.push(uploadResult.secure_url);
                }
            }

            let parsedMetadata = null;
            if (metadonnees_techniques) {
                try {
                    parsedMetadata = typeof metadonnees_techniques === 'string'
                        ? JSON.parse(metadonnees_techniques)
                        : metadonnees_techniques;
                } catch (e) {
                    console.error('Error parsing metadata:', e);
                }
            }

            const newItem = {
                user_id: userId,
                name: sanitizedName,
                category: sanitizedCategory,
                subCategory: sanitizedSubCategory,
                description: sanitizedDescription,
                historyLog: sanitizedHistoryLog,
                date_acquisition: date_acquisition ? new Date(date_acquisition) : null,
                etat_objet: sanitizedEtat,
                emplacement_stockage: sanitizedEmplacement,
                acquisitionEventId: acquisitionEventId ? new ObjectId(acquisitionEventId) : null,
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
                frais_annexes: frais_annexes ? parseFloat(frais_annexes) : null,
                devise: devise || 'EUR',
                valeur_estimee: valeur_estimee ? parseFloat(valeur_estimee) : null,
                source_estimation,
                status: status || 'keeper',
                isPublic: isPublic === 'true' || isPublic === true,
                metadonnees_techniques: parsedMetadata,
                photos_principales: photoUrls,
                photos_detail: [],
                photos_preuve: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await collection.insertOne(newItem);

            res.status(201).json({
                success: true,
                message: 'Item added successfully',
                data: { ...newItem, _id: result.insertedId }
            });

        } catch (error) {
            console.error('Error adding item:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // POST /api/collection/add-quick - Quick add from temp estimation
    router.post('/add-quick', authenticateJWT, async (req, res) => {
        try {
            const { getUserEstimationsTempCollection } = require('../config/db');
            const collection = getUserItemsCollection();
            const tempCollection = getUserEstimationsTempCollection();
            const userId = req.user.id;
            const { tempId } = req.body;

            if (!tempId || !ObjectId.isValid(tempId)) {
                return res.status(400).json({ success: false, error: 'Invalid tempId' });
            }

            // Find the temp estimation
            const tempItem = await tempCollection.findOne({
                _id: new ObjectId(tempId),
                user_id: userId
            });

            if (!tempItem) {
                return res.status(404).json({ success: false, error: 'Temp estimation not found' });
            }

            // Upload base64 to Cloudinary if available
            let cloudinaryUrl = null;
            if (tempItem.image_base64) {
                try {
                    console.log('📤 Uploading base64 image to Cloudinary...');
                    const buffer = Buffer.from(tempItem.image_base64, 'base64');

                    const uploadResult = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'user_collections' }, // Permanent folder
                            (error, result) => {
                                if (error) return reject(error);
                                resolve(result);
                            }
                        );
                        uploadStream.end(buffer);
                    });

                    cloudinaryUrl = uploadResult.secure_url;
                    console.log('✅ Image uploaded to Cloudinary:', cloudinaryUrl);
                } catch (uploadError) {
                    console.error('⚠️ Error uploading to Cloudinary:', uploadError);
                    // Continue without image if upload fails
                }
            }

            // Create new item from temp estimation
            const newItem = {
                user_id: userId,
                name: tempItem.search_query,
                status: tempItem.status || 'keeper',
                isPublic: false,
                valeur_estimee: tempItem.estimation_result?.median_price || null,
                photos_principales: cloudinaryUrl ? [cloudinaryUrl] : [],
                photos_detail: [],
                photos_preuve: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Insert into main collection
            const result = await collection.insertOne(newItem);

            // Delete from temp collection
            await tempCollection.deleteOne({ _id: new ObjectId(tempId) });

            res.status(201).json({
                success: true,
                message: 'Item added successfully from temp estimation',
                data: { ...newItem, _id: result.insertedId }
            });

        } catch (error) {
            console.error('Error in add-quick:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // PUT /api/collection/:itemId - Update an existing item
    router.put('/:itemId', authenticateJWT, upload.any(), async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;
            const itemId = req.params.itemId;

            if (!ObjectId.isValid(itemId)) {
                return res.status(400).json({ success: false, error: 'Invalid item ID' });
            }

            const existingItem = await collection.findOne({
                _id: new ObjectId(itemId),
                user_id: userId
            });

            if (!existingItem) {
                return res.status(404).json({ success: false, error: 'Item not found' });
            }

            const {
                name, category, subCategory, description, historyLog,
                date_acquisition, etat_objet, emplacement_stockage,
                acquisitionEventId, purchasePrice, frais_annexes, devise,
                valeur_estimee, source_estimation, status, isPublic,
                metadonnees_techniques, image_layout
            } = req.body;

            // Sanitisation des entrées
            const sanitizedName = name ? DOMPurify.sanitize(name) : undefined;
            const sanitizedDescription = description ? DOMPurify.sanitize(description) : undefined;
            const sanitizedHistoryLog = historyLog ? DOMPurify.sanitize(historyLog) : undefined;
            const sanitizedCategory = category ? DOMPurify.sanitize(category) : undefined;
            const sanitizedSubCategory = subCategory ? DOMPurify.sanitize(subCategory) : undefined;
            const sanitizedEtat = etat_objet ? DOMPurify.sanitize(etat_objet) : undefined;
            const sanitizedEmplacement = emplacement_stockage ? DOMPurify.sanitize(emplacement_stockage) : undefined;

            let layoutRaw = image_layout;
            let parsedLayout = null;

            if (layoutRaw) {
                try {
                    parsedLayout = JSON.parse(layoutRaw);
                } catch (e) {
                    console.error('Error parsing image_layout:', e);
                }
            }

            const newPhotoUrls = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const optimizedBuffer = await sharp(file.buffer)
                        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toBuffer();

                    const uploadResult = await uploadToCloudinary(optimizedBuffer);
                    newPhotoUrls.push(uploadResult.secure_url);
                }
            }

            let finalPhotos = existingItem.photos_principales || [];

            if (parsedLayout && Array.isArray(parsedLayout)) {
                finalPhotos = parsedLayout.map((slot, index) => {
                    if (slot === 'new') {
                        return newPhotoUrls.shift() || null;
                    } else if (slot === null) {
                        return null;
                    } else {
                        return slot;
                    }
                }).filter(p => p !== null);
            }

            let parsedMetadata = existingItem.metadonnees_techniques;
            if (metadonnees_techniques) {
                try {
                    parsedMetadata = typeof metadonnees_techniques === 'string'
                        ? JSON.parse(metadonnees_techniques)
                        : metadonnees_techniques;
                } catch (e) {
                    console.error('Error parsing metadata:', e);
                }
            }

            const updateData = {
                name: sanitizedName || existingItem.name,
                category: sanitizedCategory || existingItem.category,
                subCategory: sanitizedSubCategory || existingItem.subCategory,
                description: sanitizedDescription || existingItem.description,
                historyLog: sanitizedHistoryLog || existingItem.historyLog,
                date_acquisition: date_acquisition ? new Date(date_acquisition) : existingItem.date_acquisition,
                etat_objet: sanitizedEtat || existingItem.etat_objet,
                emplacement_stockage: sanitizedEmplacement || existingItem.emplacement_stockage,
                acquisitionEventId: acquisitionEventId ? new ObjectId(acquisitionEventId) : existingItem.acquisitionEventId,
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : existingItem.purchasePrice,
                frais_annexes: frais_annexes ? parseFloat(frais_annexes) : existingItem.frais_annexes,
                devise: devise || existingItem.devise,
                valeur_estimee: valeur_estimee ? parseFloat(valeur_estimee) : existingItem.valeur_estimee,
                source_estimation: source_estimation || existingItem.source_estimation,
                status: status || existingItem.status,
                isPublic: isPublic !== undefined ? (isPublic === 'true' || isPublic === true) : existingItem.isPublic,
                metadonnees_techniques: parsedMetadata,
                photos_principales: finalPhotos,
                updatedAt: new Date()
            };

            await collection.updateOne(
                { _id: new ObjectId(itemId) },
                { $set: updateData }
            );

            const updatedItem = await collection.findOne({ _id: new ObjectId(itemId) });

            res.json({
                success: true,
                message: 'Item updated successfully',
                data: updatedItem
            });

        } catch (error) {
            console.error('Error updating item:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // DELETE /api/collection/:itemId - Delete an item
    router.delete('/:itemId', authenticateJWT, async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;
            const itemId = req.params.itemId;

            if (!ObjectId.isValid(itemId)) {
                return res.status(400).json({ success: false, error: 'Invalid item ID' });
            }

            const result = await collection.deleteOne({
                _id: new ObjectId(itemId),
                user_id: userId
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Item not found' });
            }

            res.json({
                success: true,
                message: 'Item deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting item:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    // GET /api/collection/template - Download Excel template
    router.get('/template', async (req, res) => {
        try {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Collection');

            worksheet.columns = [
                { header: 'Nom (Obligatoire)', key: 'name', width: 30 },
                { header: 'Catégorie', key: 'category', width: 20 },
                { header: 'Sous-Catégorie', key: 'subCategory', width: 20 },
                { header: 'Description', key: 'description', width: 40 },
                { header: 'Prix Achat', key: 'purchasePrice', width: 15 },
                { header: 'Valeur Estimée', key: 'estimatedValue', width: 15 },
                { header: 'État', key: 'condition', width: 15 },
                { header: 'Emplacement', key: 'storageLocation', width: 20 },
                { header: 'Statut', key: 'status', width: 15 },
                { header: 'Public (Oui/Non)', key: 'isPublic', width: 15 },
                { header: 'Image Principale (URL)', key: 'mainImage', width: 50 },
                { header: 'Image Secondaire 1 (URL)', key: 'secImage1', width: 50 },
                { header: 'Image Secondaire 2 (URL)', key: 'secImage2', width: 50 }
            ];

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' }
            };

            for (let i = 2; i <= 100; i++) {
                worksheet.getCell(`I${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"Garder,Vendre,Echanger"']
                };

                worksheet.getCell(`J${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"Oui,Non"']
                };
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=template_collection_gochineur.xlsx');

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error generating template:', error);
            res.status(500).json({ success: false, error: 'Could not generate template' });
        }
    });

    // POST /api/collection/import-csv - Import items from CSV or Excel
    router.post('/import-csv', authenticateJWT, upload.single('csvFile'), async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const userId = req.user.id;
            const { parse } = require('csv-parse/sync');
            const axios = require('axios');
            const ExcelJS = require('exceljs');

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file provided' });
            }

            let records = [];

            if (req.file.originalname.endsWith('.xlsx')) {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(req.file.buffer);
                const worksheet = workbook.worksheets[0];

                if (worksheet) {
                    // Get headers from first row
                    const headers = [];
                    worksheet.getRow(1).eachCell((cell, colNumber) => {
                        headers[colNumber] = cell.value;
                    });

                    // Iterate over rows starting from 2
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber === 1) return; // Skip header row

                        const record = {};
                        row.eachCell((cell, colNumber) => {
                            const header = headers[colNumber];
                            if (header) {
                                // Handle rich text or simple values
                                let value = cell.value;
                                if (typeof value === 'object' && value !== null) {
                                    if (value.richText) {
                                        value = value.richText.map(rt => rt.text).join('');
                                    } else if (value.text) {
                                        value = value.text;
                                    } else if (value.result !== undefined) {
                                        // Formula result
                                        value = value.result;
                                    }
                                }
                                record[header] = value;
                            }
                        });
                        records.push(record);
                    });
                }
            } else {
                const csvContent = req.file.buffer.toString('utf-8');
                records = parse(csvContent, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true
                });
            }

            if (records.length === 0) {
                return res.status(400).json({ success: false, error: 'File is empty' });
            }

            const mapColumn = (record, possibleNames) => {
                for (const name of possibleNames) {
                    if (record[name] !== undefined && record[name] !== '') {
                        return record[name];
                    }
                }
                return null;
            };

            const results = {
                success: 0,
                errors: [],
                imageWarnings: [],
                total: records.length
            };

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                const rowNumber = i + 2;

                try {
                    const name = mapColumn(record, ['name', 'nom', 'Name', 'Nom', 'titre', 'Titre', 'title', 'Title', 'Nom (Obligatoire)']);

                    if (!name) continue;

                    const category = mapColumn(record, ['category', 'categorie', 'Category', 'Categorie', 'Catégorie']);
                    const subCategory = mapColumn(record, ['subCategory', 'sous-categorie', 'SubCategory', 'Sous-Categorie', 'Sous-Catégorie']);
                    const description = mapColumn(record, ['description', 'Description', 'desc', 'Desc']);
                    const purchasePrice = mapColumn(record, ['purchasePrice', 'prix', 'price', 'Prix', 'Price', 'prix_achat', 'Prix Achat']);
                    const estimatedValue = mapColumn(record, ['estimatedValue', 'valeur_estimee', 'valeur', 'Valeur', 'estimation', 'Valeur Estimée']);
                    const condition = mapColumn(record, ['condition', 'etat', 'état', 'Etat', 'État', 'etat_objet']);
                    const storageLocation = mapColumn(record, ['storageLocation', 'emplacement', 'Emplacement', 'storage', 'emplacement_stockage']);

                    const statusRaw = mapColumn(record, ['status', 'statut', 'Status', 'Statut']);
                    let status = 'keeper';
                    if (statusRaw) {
                        const s = statusRaw.toLowerCase().trim();
                        if (s === 'vendre' || s === 'for_sale' || s === 'à vendre') status = 'for_sale';
                        else if (s === 'échanger' || s === 'echanger' || s === 'for_exchange' || s === 'échange' || s === 'echange') status = 'for_exchange';
                        else if (s === 'garder' || s === 'keeper' || s === 'collection') status = 'keeper';
                    }

                    const isPublicRaw = mapColumn(record, ['isPublic', 'public', 'Public', 'publique', 'Public (Oui/Non)']);
                    const isPublic = isPublicRaw === 'true' || isPublicRaw === true || isPublicRaw === '1' || (typeof isPublicRaw === 'string' && isPublicRaw.toLowerCase() === 'oui');

                    const acquisitionDate = mapColumn(record, ['acquisitionDate', 'date', 'Date', 'date_acquisition', 'Date Acquisition']);
                    const historyLog = mapColumn(record, ['historyLog', 'historique', 'Historique', 'notes', 'Notes']);

                    const photoUrlsToProcess = [];
                    const mainImageUrl = mapColumn(record, ['image_principale', 'main_image', 'image', 'imageUrl', 'photo', 'Photo', 'url_image', 'image_url', 'Image Principale (URL)']);
                    if (mainImageUrl) photoUrlsToProcess.push(mainImageUrl);

                    const secImage1 = mapColumn(record, ['image_secondaire_1', 'secondary_image_1', 'image2', 'photo2', 'image_2', 'Image Secondaire 1 (URL)']);
                    if (secImage1) photoUrlsToProcess.push(secImage1);

                    const secImage2 = mapColumn(record, ['image_secondaire_2', 'secondary_image_2', 'image3', 'photo3', 'image_3', 'Image Secondaire 2 (URL)']);
                    if (secImage2) photoUrlsToProcess.push(secImage2);

                    const processedPhotos = [];

                    for (const imageUrl of photoUrlsToProcess) {
                        try {
                            const imageResponse = await axios.get(imageUrl, {
                                responseType: 'arraybuffer',
                                timeout: 10000,
                                headers: { 'User-Agent': 'Mozilla/5.0' }
                            });

                            const optimizedBuffer = await sharp(Buffer.from(imageResponse.data))
                                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                                .webp({ quality: 80 })
                                .toBuffer();

                            const uploadResult = await uploadToCloudinary(optimizedBuffer);
                            processedPhotos.push(uploadResult.secure_url);
                        } catch (imageError) {
                            console.error(`Error downloading image for row ${rowNumber}:`, imageError.message);
                            results.imageWarnings.push({
                                row: rowNumber,
                                itemName: name,
                                message: `Image non importée. Vous pourrez l'ajouter manuellement.`
                            });
                        }
                    }

                    const newItem = {
                        user_id: userId,
                        name, status, isPublic,
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    if (category) newItem.category = category;
                    if (subCategory) newItem.subCategory = subCategory;
                    if (description) newItem.description = description;
                    if (purchasePrice) newItem.purchasePrice = parseFloat(purchasePrice);
                    if (estimatedValue) newItem.valeur_estimee = parseFloat(estimatedValue);
                    if (condition) newItem.etat_objet = condition;
                    if (storageLocation) newItem.emplacement_stockage = storageLocation;
                    if (acquisitionDate) newItem.date_acquisition = new Date(acquisitionDate);
                    if (historyLog) newItem.historyLog = historyLog;
                    if (processedPhotos.length > 0) newItem.photos_principales = processedPhotos;

                    await collection.insertOne(newItem);
                    results.success++;

                } catch (rowError) {
                    console.error(`Error processing row ${rowNumber}:`, rowError);
                    results.errors.push({ row: rowNumber, error: rowError.message });
                }
            }

            res.json({
                success: true,
                message: `Import terminé : ${results.success} objet(s) importé(s)${results.imageWarnings.length > 0 ? `, ${results.imageWarnings.length} image(s) non importée(s)` : ''}`,
                results
            });

        } catch (error) {
            console.error('Error importing file:', error);
            res.status(500).json({ success: false, error: 'Server error during import' });
        }
    });

    // GET /api/collection/public/:userId - Get public items for a specific user
    router.get('/public/:userId', async (req, res) => {
        try {
            const collection = getUserItemsCollection();
            const { getUsersCollection } = require('../config/db');
            const usersCollection = getUsersCollection();

            const userId = req.params.userId;

            let user;
            if (ObjectId.isValid(userId)) {
                user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            } else {
                user = await usersCollection.findOne({
                    displayName: { $regex: new RegExp(`^${userId}$`, 'i') }
                });
            }

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const userIdToQuery = user.id || user._id.toString();
            const items = await collection.find({
                user_id: userIdToQuery,
                isPublic: true
            }).toArray();

            const sanitizedItems = items.map(item => {
                const { purchasePrice, valeur_estimee, ...publicItem } = item;
                return publicItem;
            });

            res.json({
                success: true,
                user: {
                    pseudo: user.displayName,
                    bio: user.bio,
                    avatar: user.photo
                },
                data: sanitizedItems
            });

        } catch (error) {
            console.error('Error fetching public collection:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    return router;
};
