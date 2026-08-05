require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'smartcity_app',
  password: process.env.DB_PASSWORD || 'SmartCity2026*',
  name: process.env.DB_NAME || 'ciudad_inteligente'
};

function escapar(valor) {
  return String(valor).replace(/'/g, "''");
}

async function conectar(opcionesExtra) {
  return mysql.createConnection({
    host: DB.host, port: DB.port,
    user: DB.user, password: DB.password,
    multipleStatements: true,
    ...opcionesExtra
  });
}

async function crearUsuarioSiHaceFalta() {
  try {
    const conexion = await conectar();
    await conexion.query('SELECT 1');
    await conexion.end();
    console.log('✓ El usuario "' + DB.user + '" ya puede conectarse.');
    return;
  } catch (error) {
    console.log('El usuario "' + DB.user + '" no existe aún. Creándolo con root...');
  }

  const root = {
    user: process.env.DB_ROOT_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD || ''
  };

  const conexion = await conectar(root);
  await conexion.query("CREATE USER IF NOT EXISTS '" + escapar(DB.user) + "'@'localhost' IDENTIFIED BY '" + escapar(DB.password) + "'");
  await conexion.query("GRANT ALL PRIVILEGES ON *.* TO '" + escapar(DB.user) + "'@'localhost'");
  await conexion.query('FLUSH PRIVILEGES');
  await conexion.end();
  console.log('✓ Usuario "' + DB.user + '" creado correctamente.');
}

async function main() {
  await crearUsuarioSiHaceFalta();

  const conexion = await conectar();
  await conexion.query('CREATE DATABASE IF NOT EXISTS `' + escapar(DB.name) + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conexion.query('USE `' + escapar(DB.name) + '`');

  let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  schema = schema.replace(/ciudad_inteligente/g, DB.name);
  await conexion.query(schema);

  const password = await bcrypt.hash('12344321', 10);

  await conexion.query(
    'INSERT INTO usuarios (nombre, correo, contraseña, rol, ciudad_id, servicio_id, activo) VALUES ?',
    [[
      ['Carlos Prada', 'ciudadano@gmail.com', password, 'ciudadano', 1, null, 1],
      ['Operador Metrolínea', 'empresa@gmail.com', password, 'empresa', 1, 1, 1],
      ['Gloria Mantilla', 'autoridad@gmail.com', password, 'autoridad', 1, null, 1],
      ['PNUD Colombia', 'organizacion@gmail.com', password, 'organizacion', 1, null, 1]
    ]]
  );

  await conexion.query(
    'INSERT INTO sensores (zona_id, tipo, estado) VALUES ?',
    [[
      [1, 'Sensor de tráfico', 'activo'], [1, 'Cámara de seguridad', 'activo'],
      [2, 'Consumo energético', 'activo'], [2, 'Ruido ambiental', 'activo'],
      [3, 'Calidad del aire', 'mantenimiento'], [4, 'Sensor de tráfico', 'activo'],
      [5, 'Cámara de seguridad', 'activo'], [6, 'Caudal de agua', 'inactivo'],
      [7, 'Iluminación pública', 'activo'], [8, 'Calidad del aire', 'activo'],
      [9, 'Consumo energético', 'activo'], [1, 'Cámara de tránsito', 'activo']
    ]]
  );

  const horasAtras = (horas) => new Date(Date.now() - horas * 3600 * 1000);

  await conexion.query(
    'INSERT INTO alertas (zona_id, servicio_id, usuario_id, nivel, estado, descripcion, fecha) VALUES ?',
    [[
      [1, 1, 3, 'alto', 'abierta', 'Congestión vehicular recurrente en el centro de Bucaramanga en horas pico.', horasAtras(2)],
      [2, 2, 3, 'medio', 'en_proceso', 'Consumo energético 18% superior al promedio en Cabecera del Llano.', horasAtras(8)],
      [5, 4, 3, 'bajo', 'abierta', 'Retraso en la recolección de residuos en Chapinero, Bogotá.', horasAtras(24)],
      [7, 4, 2, 'medio', 'abierta', 'Acumulación de residuos en el Centro Histórico de Barranquilla.', horasAtras(24)],
      [4, 5, 3, 'critico', 'abierta', 'Hurto en parque público del centro de Bogotá durante la noche.', horasAtras(48)],
      [8, 3, 2, 'alto', 'en_proceso', 'Fuga de agua detectada en El Prado, Barranquilla.', horasAtras(72)],
      [3, 6, 1, 'bajo', 'cerrada', 'Campaña de vacunación exitosa en Real de Minas.', horasAtras(96)],
      [6, 7, 3, 'medio', 'abierta', 'Aforo al 95% en la biblioteca de Usaquén, Bogotá.', horasAtras(120)]
    ]]
  );

  // NUEVO: incidentes (clase Incidente del documento)
  await conexion.query(
    'INSERT INTO incidentes (usuario_id, tipo, descripcion, ubicacion, estado, fecha) VALUES ?',
    [[
      [1, 'Congestión vehicular', 'Congestión recurrente en horas pico, se sugiere revisar semaforización.', 'Centro, Bucaramanga', 'en_revision', horasAtras(5)],
      [1, 'Alumbrado público', 'Luminaria encendida durante el día.', 'Cabecera del Llano, Bucaramanga', 'reportado', horasAtras(30)],
      [1, 'Fuga de agua', 'Fuga en tubería principal frente al parque.', 'Chapinero, Bogotá', 'atendido', horasAtras(50)],
      [2, 'Seguridad', 'Zona con percepción de inseguridad en la noche.', 'Centro Histórico, Barranquilla', 'cerrado', horasAtras(80)]
    ]]
  );

  await conexion.query(
    'INSERT INTO participaciones (usuario_id, zona_id, categoria, comentario, fecha) VALUES ?',
    [[
      [1, 2, 'Movilidad', 'Sugiero ampliar las ciclorrutas de Cabecera del Llano.', horasAtras(24)],
      [1, 5, 'Residuos', 'Pido más puntos de reciclaje en Chapinero.', horasAtras(48)],
      [1, 3, 'Agua', 'Reporto desperdicio de agua en una obra abandonada.', horasAtras(72)],
      [2, 1, 'Movilidad', 'Propongo ampliar horarios de Metrolínea en el centro.', horasAtras(96)]
    ]]
  );

  await conexion.query(
    'INSERT INTO reportes (titulo, tipo, descripcion, fecha, usuario_id) VALUES ?',
    [[
      ['Informe mensual de movilidad', 'Informe', 'Análisis de congestión vehicular y propuestas de ajuste.', horasAtras(72), 3],
      ['Estado de los servicios públicos', 'Indicadores', 'Resumen del consumo energético y de agua.', horasAtras(24), 3],
      ['Informe de huella ecológica', 'Ambiental', 'Reducción del 8% en consumo energético tras regular alumbrado.', horasAtras(12), 3]
    ]]
  );

  // NUEVO: decisiones con justificación (transparencia, caso de uso 2)
  await conexion.query(
    'INSERT INTO decisiones (usuario_id, titulo, justificacion, estado, fecha) VALUES ?',
    [[
      [3, 'Ampliar rutas de transporte en el centro', 'Congestión vehicular recurrente según alertas e incidentes reportados.', 'aprobada', horasAtras(40)],
      [3, 'Regular horarios de alumbrado público', 'Consumo de energía por encima del límite permitido en Cabecera.', 'aprobada', horasAtras(20)],
      [3, 'Cierre temporal de la calle 45', 'Descartada por impacto comercial en la zona centro.', 'descartada', horasAtras(10)]
    ]]
  );

  // NUEVO: cumplimiento normativo (caso de uso 9)
  const diasAtras = (d) => new Date(Date.now() - d * 86400000);
  await conexion.query(
    'INSERT INTO cumplimiento_normativo (normativa_id, estado, observacion, fecha_verificacion) VALUES ?',
    [[
      [1, 'cumple', 'Se reportan indicadores de movilidad y servicios urbanos.', diasAtras(4)],
      [2, 'parcial', 'Falta fortalecer control de accesos y auditoría.', diasAtras(3)],
      [3, 'cumple', 'Acciones orientadas a sostenibilidad urbana.', diasAtras(2)]
    ]]
  );

  console.log('');
  console.log('Base de datos "' + DB.name + '" creada correctamente.');
  console.log('Tablas: ciudades, zonas, servicios, usuarios, sensores, alertas, incidentes, participaciones, reportes, decisiones, normativas, cumplimiento_normativo.');
  console.log('Usuarios (contraseña 12344321): ciudadano@gmail.com / empresa@gmail.com / autoridad@gmail.com / organizacion@gmail.com');

  await conexion.end();
}

main().catch((error) => {
  console.error('Error al ejecutar la migración:', error.message);
  process.exit(1);
}); 
