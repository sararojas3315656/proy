const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

const ROLES = {
  ciudadano: 'Ciudadano',
  empresa: 'Empresa',
  autoridad: 'Autoridad',
  organizacion: 'Organización internacional'
};

router.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/');
  res.render('login', { titulo: 'Iniciar sesión', ok: false, error: '', correo: '', rol: '' });
});

router.post('/login', async (req, res) => {
  try {
    const { correo, contraseña, rol } = req.body;

    if (!correo || !contraseña) {
      return res.render('login', {
        titulo: 'Iniciar sesión',
        ok: false,
        error: 'Ingresa tu correo y contraseña.',
        correo: correo || '',
        rol: rol || ''
      });
    }

    let sql = 'SELECT * FROM usuarios WHERE correo = ? AND activo = 1';
    const params = [correo.trim()];
    if (rol) {
      sql += ' AND rol = ?';
      params.push(rol);
    }

    const [usuarios] = await pool.query(sql, params);
    const usuario = usuarios[0];

    if (!usuario || !(await bcrypt.compare(contraseña, usuario.contraseña))) {
      return res.render('login', {
        titulo: 'Iniciar sesión',
        ok: false,
        error: 'Correo, contraseña o rol incorrectos.',
        correo: correo.trim(),
        rol: rol || ''
      });
    }

    req.session.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      ciudad_id: usuario.ciudad_id,
      servicio_id: usuario.servicio_id
    };

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo iniciar sesión.' });
  }
});

router.get('/registro', async (req, res) => {
  try {
    if (req.session.usuario) return res.redirect('/');

    const [ciudades] = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
    const [servicios] = await pool.query('SELECT id, nombre FROM servicios ORDER BY nombre');

    res.render('registro', {
      titulo: 'Crear cuenta',
      error: '',
      valores: {},
      ciudades,
      servicios
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo cargar el formulario de registro.' });
  }
});

router.post('/registro', async (req, res) => {
  try {
    const { nombre, correo, contraseña, rol, ciudad_id, servicio_id } = req.body;
    const valores = { nombre, correo, rol, ciudad_id, servicio_id };

    if (!nombre || !correo || !contraseña || !rol || !ciudad_id) {
      const [ciudades] = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
      const [servicios] = await pool.query('SELECT id, nombre FROM servicios ORDER BY nombre');
      return res.status(400).render('registro', {
        titulo: 'Crear cuenta',
        error: 'Nombre, correo, contraseña, rol y ciudad son obligatorios.',
        valores,
        ciudades,
        servicios
      });
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    if (!correoValido) {
      const [ciudades] = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
      const [servicios] = await pool.query('SELECT id, nombre FROM servicios ORDER BY nombre');
      return res.status(400).render('registro', {
        titulo: 'Crear cuenta',
        error: 'El correo no tiene un formato válido.',
        valores,
        ciudades,
        servicios
      });
    }

    if (!ROLES[rol]) {
      const [ciudades] = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
      const [servicios] = await pool.query('SELECT id, nombre FROM servicios ORDER BY nombre');
      return res.status(400).render('registro', {
        titulo: 'Crear cuenta',
        error: 'Rol no válido.',
        valores,
        ciudades,
        servicios
      });
    }

    const servicioFinal = rol === 'empresa' ? Number(servicio_id) || null : null;

    const hash = await bcrypt.hash(contraseña, 10);

    await pool.query(
      'INSERT INTO usuarios (nombre, correo, contraseña, rol, ciudad_id, servicio_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre.trim(), correo.trim(), hash, rol, Number(ciudad_id), servicioFinal]
    );

    res.render('login', {
      titulo: 'Iniciar sesión',
      ok: true,
      error: '',
      correo: correo.trim(),
      rol: ''
    });
  } catch (error) {
    console.error(error);

    const [ciudades] = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
    const [servicios] = await pool.query('SELECT id, nombre FROM servicios ORDER BY nombre');
    const esDuplicado = error && error.code === 'ER_DUP_ENTRY';

    res.status(400).render('registro', {
      titulo: 'Crear cuenta',
      error: esDuplicado ? 'El correo ya está registrado.' : 'No se pudo crear la cuenta.',
      valores: { ...req.body },
      ciudades,
      servicios
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
module.exports.ROLES = ROLES;
