function requireLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  next();
}

function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.session.usuario) {
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.usuario.rol)) {
      return res.status(403).render('mensaje', {
        titulo: 'Sin permisos',
        error: 'Tu rol no tiene permiso para realizar esta acción.'
      });
    }
    next();
  };
}

module.exports = { requireLogin, requireRol };
