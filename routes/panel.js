const express = require('express');
const pool = require('../db');
const { requireLogin, requireRol } = require('./middleware');
const { ROLES } = require('./auth');

const router = express.Router();

const SUBTITULOS = {
  ciudadano: 'Consulta información de tu ciudad, reporta incidentes y participa en las decisiones.',
  empresa: 'Coordina tus operaciones, gestiona sensores y valida el resultado de las alertas de tu servicio.',
  autoridad: 'Supervisa los servicios, gestiona incidentes, registra consumos, toma decisiones justificadas y genera reportes.',
  organizacion: 'Verifica el cumplimiento de estándares y normativas internacionales en la plataforma.'
};

router.get('/', requireLogin, async (req, res) => {
  const u = req.session.usuario;

  try {
    let data = {};

    if (u.rol === 'ciudadano') {
      const [resumen] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM alertas a JOIN zonas z ON a.zona_id = z.id
            WHERE z.ciudad_id = ? AND a.estado IN ('abierta', 'en_proceso')) AS alertasCiudad,
          (SELECT COUNT(*) FROM sensores s JOIN zonas z ON s.zona_id = z.id
            WHERE z.ciudad_id = ? AND s.estado = 'activo') AS sensoresCiudad,
          (SELECT COUNT(*) FROM participaciones WHERE usuario_id = ?) AS misParticipaciones,
          (SELECT COUNT(*) FROM incidentes WHERE usuario_id = ?) AS misIncidentes
      `, [u.ciudad_id, u.ciudad_id, u.id, u.id]);

      const [alertas] = await pool.query(`
        SELECT a.id, DATE_FORMAT(a.fecha, '%d/%m/%Y %H:%i') AS fecha, a.nivel, a.estado,
               a.descripcion, z.nombre AS zona, s.nombre AS servicio,
               c.nombre AS ciudad, u.nombre AS responsable
        FROM alertas a
        INNER JOIN zonas z ON a.zona_id = z.id
        INNER JOIN servicios s ON a.servicio_id = s.id
        INNER JOIN ciudades c ON z.ciudad_id = c.id
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE z.ciudad_id = ?
        ORDER BY a.fecha DESC LIMIT 10
      `, [u.ciudad_id]);

      const [zonas] = await pool.query('SELECT id, nombre FROM zonas WHERE ciudad_id = ? ORDER BY nombre', [u.ciudad_id]);

      const [misParticipaciones] = await pool.query(`
        SELECT p.id, DATE_FORMAT(p.fecha, '%d/%m/%Y') AS fecha, p.categoria, p.comentario, z.nombre AS zona
        FROM participaciones p INNER JOIN zonas z ON p.zona_id = z.id
        WHERE p.usuario_id = ? ORDER BY p.fecha DESC
      `, [u.id]);

      const [misIncidentes] = await pool.query(`
        SELECT id, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha, tipo, ubicacion, estado
        FROM incidentes WHERE usuario_id = ? ORDER BY fecha DESC
      `, [u.id]);

      data = { resumen: resumen[0], alertas, zonas, misParticipaciones, misIncidentes };
    }

    if (u.rol === 'autoridad') {
      const [resumen] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM alertas WHERE estado IN ('abierta', 'en_proceso')) AS alertasAbiertas,
          (SELECT COUNT(*) FROM sensores WHERE estado = 'activo') AS sensoresActivos,
          (SELECT COUNT(*) FROM incidentes WHERE estado IN ('reportado', 'en_revision')) AS incidentesPendientes,
          (SELECT COUNT(*) FROM reportes) AS reportesGenerados
      `);

      const [porNivel] = await pool.query('SELECT nivel, COUNT(*) AS total FROM alertas GROUP BY nivel ORDER BY total DESC');

      const ciudadId = Number(req.query.ciudad_id || 0);
      let sql = `
        SELECT a.id, DATE_FORMAT(a.fecha, '%d/%m/%Y %H:%i') AS fecha, a.nivel, a.estado, a.descripcion,
               c.nombre AS ciudad, z.nombre AS zona, s.nombre AS servicio, u.nombre AS responsable
        FROM alertas a
        INNER JOIN zonas z ON a.zona_id = z.id
        INNER JOIN ciudades c ON z.ciudad_id = c.id
        INNER JOIN servicios s ON a.servicio_id = s.id
        LEFT JOIN usuarios u ON a.usuario_id = u.id
      `;
      const params = [];
      if (ciudadId > 0) { sql += ' WHERE c.id = ?'; params.push(ciudadId); }
      sql += ' ORDER BY a.fecha DESC';
      const [alertas] = await pool.query(sql, params);

      const [ciudades] = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
      const [zonas] = await pool.query('SELECT id, nombre FROM zonas WHERE ciudad_id = ? ORDER BY nombre', [u.ciudad_id]);
      const [servicios] = await pool.query('SELECT id, nombre, consumo_actual, limite_permitido, unidad FROM servicios ORDER BY nombre');

      const [incidentes] = await pool.query(`
        SELECT i.id, DATE_FORMAT(i.fecha, '%d/%m/%Y %H:%i') AS fecha, i.tipo, i.descripcion, i.ubicacion, i.estado,
               u.nombre AS reportado_por
        FROM incidentes i INNER JOIN usuarios u ON i.usuario_id = u.id
        ORDER BY i.fecha DESC
      `);

      const [decisiones] = await pool.query(`
        SELECT d.id, DATE_FORMAT(d.fecha, '%d/%m/%Y') AS fecha, d.titulo, d.justificacion, d.estado, u.nombre AS autor
        FROM decisiones d INNER JOIN usuarios u ON d.usuario_id = u.id
        ORDER BY d.fecha DESC
      `);

      const [reportes] = await pool.query(`
        SELECT r.id, r.titulo, r.tipo, r.descripcion, DATE_FORMAT(r.fecha, '%d/%m/%Y') AS fecha, u.nombre AS autor
        FROM reportes r INNER JOIN usuarios u ON r.usuario_id = u.id
        ORDER BY r.fecha DESC
      `);

      data = { resumen: resumen[0], porNivel, alertas, ciudades, zonas, servicios, incidentes, decisiones, reportes, ciudadFiltro: ciudadId };
    }

    if (u.rol === 'empresa') {
      const [resumen] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM sensores) AS sensoresTotales,
          (SELECT COUNT(*) FROM sensores WHERE estado = 'activo') AS sensoresActivos,
          (SELECT COUNT(*) FROM alertas WHERE servicio_id = ? AND estado IN ('abierta', 'en_proceso')) AS alertasServicio
      `, [u.servicio_id]);

      const [alertas] = await pool.query(`
        SELECT a.id, DATE_FORMAT(a.fecha, '%d/%m/%Y %H:%i') AS fecha, a.nivel, a.estado, a.descripcion,
               c.nombre AS ciudad, z.nombre AS zona, s.nombre AS servicio, u.nombre AS responsable
        FROM alertas a
        INNER JOIN zonas z ON a.zona_id = z.id
        INNER JOIN ciudades c ON z.ciudad_id = c.id
        INNER JOIN servicios s ON a.servicio_id = s.id
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.servicio_id = ?
        ORDER BY a.fecha DESC
      `, [u.servicio_id]);

      const [sensores] = await pool.query(`
        SELECT s.id, s.tipo, s.estado, z.nombre AS zona, c.nombre AS ciudad
        FROM sensores s
        INNER JOIN zonas z ON s.zona_id = z.id
        INNER JOIN ciudades c ON z.ciudad_id = c.id
        ORDER BY c.nombre, z.nombre, s.tipo
      `);

      data = { resumen: resumen[0], alertas, sensores };
    }

    if (u.rol === 'organizacion') {
      const [resumen] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM alertas WHERE estado IN ('abierta', 'en_proceso')) AS alertasAbiertas,
          (SELECT COUNT(*) FROM sensores WHERE estado = 'activo') AS sensoresActivos,
          (SELECT COUNT(*) FROM participaciones) AS participacionesTotales
      `);

      const [sensoresPorEstado] = await pool.query('SELECT estado, COUNT(*) AS total FROM sensores GROUP BY estado');
      const [alertasPorNivel] = await pool.query('SELECT nivel, COUNT(*) AS total FROM alertas GROUP BY nivel');
      const [participacionesPorCategoria] = await pool.query('SELECT categoria, COUNT(*) AS total FROM participaciones GROUP BY categoria ORDER BY total DESC');

      const [normativas] = await pool.query(`
        SELECT n.codigo, n.nombre, n.organismo, c.estado, c.observacion,
               DATE_FORMAT(c.fecha_verificacion, '%d/%m/%Y') AS fecha
        FROM normativas n
        LEFT JOIN cumplimiento_normativo c ON c.normativa_id = n.id
        ORDER BY n.codigo
      `);

      const [reportes] = await pool.query(`
        SELECT r.id, r.titulo, r.tipo, r.descripcion, DATE_FORMAT(r.fecha, '%d/%m/%Y') AS fecha, u.nombre AS autor
        FROM reportes r INNER JOIN usuarios u ON r.usuario_id = u.id
        ORDER BY r.fecha DESC
      `);

      const [alertas] = await pool.query(`
        SELECT a.id, DATE_FORMAT(a.fecha, '%d/%m/%Y %H:%i') AS fecha, a.nivel, a.estado, a.descripcion,
               c.nombre AS ciudad, z.nombre AS zona, s.nombre AS servicio, u.nombre AS responsable
        FROM alertas a
        INNER JOIN zonas z ON a.zona_id = z.id
        INNER JOIN ciudades c ON z.ciudad_id = c.id
        INNER JOIN servicios s ON a.servicio_id = s.id
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        ORDER BY a.fecha DESC LIMIT 15
      `);

      data = { resumen: resumen[0], sensoresPorEstado, alertasPorNivel, participacionesPorCategoria, normativas, reportes, alertas };
    }

    res.render('dashboard', {
      titulo: 'Mi panel',
      usuario: u,
      rolLabel: ROLES[u.rol],
      subtitulo: SUBTITULOS[u.rol],
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', {
      titulo: 'Error',
      error: 'No se pudo cargar el panel. Verifica MySQL y ejecuta npm run migrate.'
    });
  }
});

// Ciudadano: reporta incidentes (caso de uso 1 + diagrama de secuencia)
router.post('/incidentes', requireLogin, requireRol('ciudadano'), async (req, res) => {
  try {
    const { tipo, ubicacion, descripcion } = req.body;

    if (!tipo || !ubicacion || !descripcion || descripcion.trim() === '') {
      return res.render('mensaje', { titulo: 'Error', error: 'Completa tipo, ubicación y descripción del incidente.' });
    }

    await pool.query(
      'INSERT INTO incidentes (usuario_id, tipo, descripcion, ubicacion) VALUES (?, ?, ?, ?)',
      [req.session.usuario.id, tipo.trim(), descripcion.trim(), ubicacion.trim()]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo registrar el incidente.' });
  }
});

// Autoridad: gestiona el estado de los incidentes
router.post('/incidentes/:id/estado', requireLogin, requireRol('autoridad'), async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['reportado', 'en_revision', 'atendido', 'cerrado'];

    if (!estadosValidos.includes(estado)) {
      return res.render('mensaje', { titulo: 'Error', error: 'Estado de incidente no válido.' });
    }

    await pool.query('UPDATE incidentes SET estado = ? WHERE id = ?', [estado, Number(req.params.id)]);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo actualizar el incidente.' });
  }
});

// Ciudadano: participación ciudadana
router.post('/participaciones', requireLogin, requireRol('ciudadano'), async (req, res) => {
  try {
    const { zona_id, categoria, comentario } = req.body;
    const zonaId = Number(zona_id);

    if (!Number.isInteger(zonaId) || zonaId <= 0 || !categoria || !comentario || comentario.trim() === '') {
      return res.render('mensaje', { titulo: 'Error', error: 'La zona, la categoría y el comentario son obligatorios.' });
    }

    await pool.query(
      'INSERT INTO participaciones (usuario_id, zona_id, categoria, comentario) VALUES (?, ?, ?, ?)',
      [req.session.usuario.id, zonaId, categoria, comentario.trim()]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo registrar la participación.' });
  }
});

// Autoridad: crea alertas
router.post('/alertas', requireLogin, requireRol('autoridad'), async (req, res) => {
  try {
    const { zona_id, servicio_id, nivel, descripcion } = req.body;

    if (!zona_id || !servicio_id || !descripcion || descripcion.trim() === '') {
      return res.render('mensaje', { titulo: 'Error', error: 'Completa todos los campos de la alerta.' });
    }

    await pool.query(
      'INSERT INTO alertas (zona_id, servicio_id, usuario_id, nivel, estado, descripcion) VALUES (?, ?, ?, ?, "abierta", ?)',
      [Number(zona_id), Number(servicio_id), req.session.usuario.id, nivel || 'medio', descripcion.trim()]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo crear la alerta.' });
  }
});

// Autoridad / empresa: actualizan estado de alertas (validar resultados)
router.post('/alertas/:id/estado', requireLogin, requireRol('autoridad', 'empresa'), async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['abierta', 'en_proceso', 'cerrada'];

    if (!estadosValidos.includes(estado)) {
      return res.render('mensaje', { titulo: 'Error', error: 'Estado de alerta no válido.' });
    }

    await pool.query('UPDATE alertas SET estado = ? WHERE id = ?', [estado, Number(req.params.id)]);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo actualizar la alerta.' });
  }
});

// Autoridad / empresa: registrarConsumo() + evaluarUmbral() del documento.
// Si el consumo supera el límite, el sistema genera la alerta automáticamente
// (exactamente el diagrama de actividad de tu avance).
router.post('/servicios/:id/consumo', requireLogin, requireRol('autoridad', 'empresa'), async (req, res) => {
  try {
    const nuevoConsumo = Number(req.body.consumo_actual);

    if (!Number.isFinite(nuevoConsumo) || nuevoConsumo < 0) {
      return res.render('mensaje', { titulo: 'Error', error: 'Ingresa un consumo válido.' });
    }

    const [servicios] = await pool.query('SELECT * FROM servicios WHERE id = ?', [Number(req.params.id)]);
    const servicio = servicios[0];

    if (!servicio) {
      return res.render('mensaje', { titulo: 'Error', error: 'Servicio no encontrado.' });
    }

    await pool.query('UPDATE servicios SET consumo_actual = ? WHERE id = ?', [nuevoConsumo, servicio.id]);

    if (nuevoConsumo > servicio.limite_permitido) {
      const [zonas] = await pool.query('SELECT id FROM zonas WHERE ciudad_id = ? LIMIT 1', [req.session.usuario.ciudad_id]);
      const exceso = ((nuevoConsumo - servicio.limite_permitido) / servicio.limite_permitido) * 100;

      await pool.query(
        'INSERT INTO alertas (zona_id, servicio_id, usuario_id, nivel, estado, descripcion) VALUES (?, ?, ?, ?, "abierta", ?)',
        [
          zonas[0].id,
          servicio.id,
          req.session.usuario.id,
          exceso >= 20 ? 'critico' : 'alto',
          `Consumo de ${servicio.nombre} supera el límite en ${exceso.toFixed(1)}% (${nuevoConsumo} ${servicio.unidad} de ${servicio.limite_permitido} permitidos). Se sugieren medidas de regulación.`
        ]
      );
    }

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo registrar el consumo.' });
  }
});

// Autoridad: decisiones CON justificación (transparencia)
router.post('/decisiones', requireLogin, requireRol('autoridad'), async (req, res) => {
  try {
    const { titulo, justificacion, estado } = req.body;

    if (!titulo || titulo.trim() === '' || !justificacion || justificacion.trim() === '') {
      return res.render('mensaje', { titulo: 'Error', error: 'Toda decisión debe tener título y justificación.' });
    }

    await pool.query(
      'INSERT INTO decisiones (usuario_id, titulo, justificacion, estado) VALUES (?, ?, ?, ?)',
      [req.session.usuario.id, titulo.trim(), justificacion.trim(), estado === 'descartada' ? 'descartada' : 'aprobada']
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo registrar la decisión.' });
  }
});

// Autoridad: reportes
router.post('/reportes', requireLogin, requireRol('autoridad'), async (req, res) => {
  try {
    const { titulo, tipo, descripcion } = req.body;

    if (!titulo || titulo.trim() === '' || !tipo) {
      return res.render('mensaje', { titulo: 'Error', error: 'El título y el tipo del reporte son obligatorios.' });
    }

    await pool.query(
      'INSERT INTO reportes (titulo, tipo, descripcion, usuario_id) VALUES (?, ?, ?, ?)',
      [titulo.trim(), tipo, (descripcion || '').trim(), req.session.usuario.id]
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo generar el reporte.' });
  }
});

// Empresa: gestiona sensores
router.post('/sensores/:id/estado', requireLogin, requireRol('empresa'), async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['activo', 'inactivo', 'mantenimiento'];

    if (!estadosValidos.includes(estado)) {
      return res.render('mensaje', { titulo: 'Error', error: 'Estado de sensor no válido.' });
    }

    await pool.query('UPDATE sensores SET estado = ? WHERE id = ?', [estado, Number(req.params.id)]);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('mensaje', { titulo: 'Error', error: 'No se pudo actualizar el sensor.' });
  }
});

module.exports = router;
