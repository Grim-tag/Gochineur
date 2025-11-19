/**
 * Middleware pour vérifier l'authentification et les rôles admin/moderator
 */
function requireAdminOrModerator(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  
  const userRole = req.user.role || 'user';
  
  if (userRole !== 'admin' && userRole !== 'moderator') {
    return res.status(403).json({ error: 'Accès refusé. Rôle admin ou moderator requis.' });
  }
  
  next();
}

/**
 * Middleware pour vérifier le rôle admin uniquement
 */
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  
  const userRole = req.user.role || 'user';
  
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Rôle admin requis.' });
  }
  
  next();
}

module.exports = {
  requireAdminOrModerator,
  requireAdmin
};



