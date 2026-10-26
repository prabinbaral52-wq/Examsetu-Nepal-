function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(403).json({ success: false, message: 'Admin access privileges required.' });
  }
  return res.status(403).send('Forbidden: Admin access only.');
}

function optionalUser(req, res, next) {
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  optionalUser
};
