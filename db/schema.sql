CREATE DATABASE IF NOT EXISTS ciudad_inteligente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ciudad_inteligente;

DROP TABLE IF EXISTS cumplimiento_normativo;
DROP TABLE IF EXISTS normativas;
DROP TABLE IF EXISTS decisiones;
DROP TABLE IF EXISTS incidentes;
DROP TABLE IF EXISTS reportes;
DROP TABLE IF EXISTS participaciones;
DROP TABLE IF EXISTS alertas;
DROP TABLE IF EXISTS sensores;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS servicios;
DROP TABLE IF EXISTS zonas;
DROP TABLE IF EXISTS ciudades;

CREATE TABLE ciudades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE zonas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ciudad_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  FOREIGN KEY (ciudad_id) REFERENCES ciudades(id)
);

-- Clase Servicio_Urbano del documento: consumo_actual + limite_permitido
CREATE TABLE servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  consumo_actual DECIMAL(10,2) NOT NULL DEFAULT 0,
  limite_permitido DECIMAL(10,2) NOT NULL DEFAULT 100,
  unidad VARCHAR(30) NOT NULL DEFAULT 'unidad'
);

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  contraseña VARCHAR(255) NOT NULL,
  rol ENUM('ciudadano', 'empresa', 'autoridad', 'organizacion') NOT NULL,
  ciudad_id INT NOT NULL,
  servicio_id INT NULL,
  activo BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  FOREIGN KEY (servicio_id) REFERENCES servicios(id)
);

CREATE TABLE sensores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zona_id INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  estado ENUM('activo', 'inactivo', 'mantenimiento') DEFAULT 'activo',
  FOREIGN KEY (zona_id) REFERENCES zonas(id)
);

-- Clase Alerta del documento
CREATE TABLE alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zona_id INT NOT NULL,
  servicio_id INT NOT NULL,
  usuario_id INT NULL,
  nivel ENUM('bajo', 'medio', 'alto', 'critico') DEFAULT 'medio',
  estado ENUM('abierta', 'en_proceso', 'cerrada') DEFAULT 'abierta',
  descripcion TEXT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id),
  FOREIGN KEY (servicio_id) REFERENCES servicios(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Clase Incidente del documento (antes faltaba)
CREATE TABLE incidentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  ubicacion VARCHAR(150) NOT NULL,
  estado ENUM('reportado', 'en_revision', 'atendido', 'cerrado') DEFAULT 'reportado',
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE participaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  zona_id INT NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  comentario TEXT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (zona_id) REFERENCES zonas(id)
);

CREATE TABLE reportes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Caso de uso 2: decisión registrada CON justificación (transparencia)
CREATE TABLE decisiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  justificacion TEXT NOT NULL,
  estado ENUM('aprobada', 'descartada') DEFAULT 'aprobada',
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Caso de uso 9: verificación de cumplimiento normativo
CREATE TABLE normativas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  organismo VARCHAR(80) NOT NULL
);

CREATE TABLE cumplimiento_normativo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  normativa_id INT NOT NULL,
  estado ENUM('cumple', 'parcial', 'no_cumple') NOT NULL,
  observacion TEXT,
  fecha_verificacion DATE NOT NULL,
  FOREIGN KEY (normativa_id) REFERENCES normativas(id)
);

INSERT INTO ciudades (nombre) VALUES
('Bucaramanga'), ('Bogotá'), ('Barranquilla');

INSERT INTO zonas (ciudad_id, nombre) VALUES
(1, 'Centro'), (1, 'Cabecera del Llano'), (1, 'Real de Minas'),
(2, 'Centro'), (2, 'Chapinero'), (2, 'Usaquén'),
(3, 'Centro Histórico'), (3, 'El Prado'), (3, 'Ciudad Jardín');

INSERT INTO servicios (nombre, consumo_actual, limite_permitido, unidad) VALUES
('Movilidad', 820.00, 700.00, 'veh/h'),
('Energía', 1250.50, 1000.00, 'kWh'),
('Agua', 320.00, 300.00, 'm3/h'),
('Residuos', 68.00, 80.00, '% llenado'),
('Seguridad', 12.00, 10.00, 'incidentes/día'),
('Salud', 25.00, 20.00, 'casos/día'),
('Educación', 88.00, 90.00, '% conectividad');

INSERT INTO normativas (codigo, nombre, organismo) VALUES
('ISO 37120', 'Indicadores de servicios urbanos', 'ISO'),
('ISO/IEC 27001', 'Seguridad de la información', 'ISO/IEC'),
('ODS 11', 'Ciudades y comunidades sostenibles', 'ONU'); 
