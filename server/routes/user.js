const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const { authenticateJWT } = require('../middleware/auth');
const { extractTokenFromHeader, verifyToken } = require('../utils/jwt');
const logger = require('../config/logger');

module.exports = function () {
    // Route pour récupérer l'utilisateur courant
    // Cette route gère l'authentification optionnelle pour le frontend
    router.get('/current', async (req, res) => {
        try {
            // Tenter d'extraire et vérifier le token manuellement pour cette route
            // car on veut renvoyer { authenticated: false } au lieu de 401 si pas de token
            const authHeader = req.headers.authorization;
            const token = extractTokenFromHeader(authHeader);

            if (!token) {
                return res.json({ authenticated: false, user: null });
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return res.json({ authenticated: false, user: null });
            }

            const db = getDB();
            // Recherche par le champ 'id' (string) et non '_id' (ObjectId) car les IDs Google sont des strings
            // ou des IDs générés personnalisés (USER_...)
            const user = await db.collection('users').findOne({ id: decoded.id });

            if (!user) {
                return res.json({ authenticated: false, user: null });
            }

            // Ne pas renvoyer d'informations sensibles
            const safeUser = {
                id: user.id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                photo: user.photo,
                role: user.role || 'user',
                validatedEventsCount: user.validatedEventsCount || 0,
                isExpert: user.isExpert || false
            };

            res.json({
                authenticated: true,
                user: safeUser
            });
        } catch (error) {
            // En cas d'erreur de token (expiré, invalide), on considère non authentifié
            res.json({ authenticated: false, user: null, error: error.message });
        }
    });

    // Route pour définir le pseudo (Protégée)
    router.post('/set-pseudo', authenticateJWT, async (req, res) => {
        try {
            const { displayName } = req.body;
            const userId = req.user.id;

            if (!displayName || displayName.trim().length < 2) {
                return res.status(400).json({ error: 'Le pseudo doit contenir au moins 2 caractères' });
            }

            const db = getDB();

            // Vérifier si le pseudo est déjà pris (insensible à la casse)
            const existingUser = await db.collection('users').findOne({
                displayName: { $regex: new RegExp(`^${displayName.trim()}$`, 'i') },
                id: { $ne: userId } // Exclure l'utilisateur actuel
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Ce pseudo est déjà pris' });
            }

            // Mettre à jour l'utilisateur
            const result = await db.collection('users').findOneAndUpdate(
                { id: userId },
                { $set: { displayName: displayName.trim(), updatedAt: new Date() } },
                { returnDocument: 'after' }
            );

            if (!result) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            const updatedUser = result; // findOneAndUpdate retourne le document directement ou dans value selon driver version
            // Avec mongodb driver v6+, result est le document si returnDocument: 'after'

            const safeUser = {
                id: updatedUser._id,
                email: updatedUser.email,
                name: updatedUser.name,
                displayName: updatedUser.displayName,
                photo: updatedUser.photo,
                role: updatedUser.role || 'user'
            };

            res.json({
                success: true,
                user: safeUser
            });
        } catch (error) {
            logger.error('Erreur /set-pseudo:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du pseudo' });
        }
    });

    // Route pour supprimer son compte
    router.delete('/me', authenticateJWT, async (req, res) => {
        try {
            const userId = req.user.id;
            const db = getDB();

            // Supprimer l'utilisateur
            const result = await db.collection('users').deleteOne({ id: userId });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            // Note: On ne supprime PAS les événements créés par l'utilisateur, comme demandé.
            // Ils restent visibles publiquement.

            res.json({ success: true, message: 'Compte supprimé avec succès' });
        } catch (error) {
            logger.error('Erreur lors de la suppression du compte:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la suppression du compte' });
        }
    });

    return router;
};
