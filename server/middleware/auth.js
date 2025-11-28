const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Middleware d'authentification JWT
 * Vérifie que la requête contient un token JWT valide
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  console.log('🔐 [Auth Debug] Header:', authHeader ? 'Present' : 'Missing');
  console.log('🔐 [Auth Debug] Token:', token ? token.substring(0, 10) + '...' : 'Missing');

  if (!token) {
    console.warn('⚠️ [Auth] Token manquant');
    return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    console.error('❌ [Auth] Token invalide ou expiré');
    return res.status(403).json({ error: 'Accès interdit. Token invalide ou expiré.' });
  }

  // Attacher l'utilisateur décodé à la requête
  req.user = decoded;
  next();
}

/**
 * Middleware pour vérifier le rôle administrateur
 * Doit être utilisé APRES authenticateJWT
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Droits d\'administrateur requis.' });
  }

  next();
}

/**
 * Middleware pour vérifier le rôle administrateur ou modérateur
 * Doit être utilisé APRES authenticateJWT
 */
function requireAdminOrModerator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Accès refusé. Droits d\'administrateur ou de modérateur requis.' });
  }

  next();
}

module.exports = {
  authenticateJWT,
  requireAdmin,
  requireAdminOrModerator
};
