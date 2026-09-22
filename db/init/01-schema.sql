-- ============================================================
-- ParkyFilms — Esquema base (local Docker)
-- Reconstruido desde las queries de backend/src/models/*.js
-- Se aplica solo al crear el volumen (db/init). Idempotente con IF NOT EXISTS.
-- Fecha: 2026-09-22
-- ============================================================

-- ---------- Usuarios y auth ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'cliente',
  avatar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  oauth_provider VARCHAR(50),
  oauth_provider_id VARCHAR(255),
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_oauth ON usuarios (oauth_provider, oauth_provider_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  ip_address VARCHAR(64),
  user_agent TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_uso TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_prt_usuario ON password_reset_tokens (usuario_id);

-- Función usada por PasswordReset.js (limpieza de tokens vencidos)
CREATE OR REPLACE FUNCTION limpiar_tokens_expirados()
RETURNS INTEGER AS $$
DECLARE
  borrados INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < CURRENT_TIMESTAMP OR used = true;
  GET DIAGNOSTICS borrados = ROW_COUNT;
  RETURN borrados;
END;
$$ LANGUAGE plpgsql;

-- ---------- Películas y estrenos ----------
CREATE TABLE IF NOT EXISTS peliculas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  sinopsis TEXT,
  poster TEXT,
  fecha_estreno DATE,
  estudio VARCHAR(255),
  genero VARCHAR(100),
  anio INTEGER,
  duracion INTEGER,
  rating NUMERIC(3,1),
  director VARCHAR(255),
  trailer VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_peliculas_activo ON peliculas (activo);
CREATE INDEX IF NOT EXISTS idx_peliculas_genero ON peliculas (genero);

CREATE TABLE IF NOT EXISTS proximos_estrenos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  sinopsis TEXT,
  poster TEXT,
  fecha_estreno DATE,
  estudio VARCHAR(255),
  genero VARCHAR(100),
  director VARCHAR(255),
  trailer VARCHAR(255),
  duracion INTEGER,
  actores TEXT[],
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_estrenos_fecha ON proximos_estrenos (fecha_estreno);

-- ---------- Funciones, salas y asientos ----------
CREATE TABLE IF NOT EXISTS funciones_cine (
  id SERIAL PRIMARY KEY,
  pelicula_id INTEGER NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  sala VARCHAR(50),
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  asientos_disponibles INTEGER NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_funciones_pelicula ON funciones_cine (pelicula_id);

CREATE TABLE IF NOT EXISTS asientos (
  id SERIAL PRIMARY KEY,
  funcion_id INTEGER NOT NULL REFERENCES funciones_cine(id) ON DELETE CASCADE,
  fila VARCHAR(2) NOT NULL,
  numero INTEGER NOT NULL,
  esta_ocupado BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (funcion_id, fila, numero)
);

CREATE TABLE IF NOT EXISTS favoritas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pelicula_id INTEGER NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, pelicula_id)
);

CREATE TABLE IF NOT EXISTS historial (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pelicula_id INTEGER NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Bar ----------
CREATE TABLE IF NOT EXISTS productos_bar (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  categoria VARCHAR(100),
  imagen TEXT,
  disponible BOOLEAN NOT NULL DEFAULT true,
  es_combo BOOLEAN NOT NULL DEFAULT false,
  descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
  eliminado BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bar_categoria ON productos_bar (categoria);

CREATE TABLE IF NOT EXISTS producto_tamanos (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos_bar(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  precio NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS producto_extras (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos_bar(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  precio NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS combo_items (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos_bar(id) ON DELETE CASCADE,
  item_nombre VARCHAR(255) NOT NULL
);

-- ---------- Puntos y referidos ----------
CREATE TABLE IF NOT EXISTS puntos_usuario (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  puntos_actuales INTEGER NOT NULL DEFAULT 0,
  total_ganados INTEGER NOT NULL DEFAULT 0,
  total_usados INTEGER NOT NULL DEFAULT 0,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transacciones_puntos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  puntos INTEGER NOT NULL,
  concepto TEXT,
  puntos_anteriores INTEGER,
  puntos_nuevos INTEGER,
  metadata JSONB,
  fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trans_usuario ON transacciones_puntos (usuario_id);

CREATE TABLE IF NOT EXISTS codigos_referido (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  usos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS referidos (
  id SERIAL PRIMARY KEY,
  referidor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  referido_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_usado VARCHAR(50),
  puntos_otorgados INTEGER NOT NULL DEFAULT 0,
  fecha_referido TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (referido_id)
);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT INTO configuracion_sistema (clave, valor) VALUES
  ('puntos_por_dolar', '10'),
  ('puntos_bienvenida', '100'),
  ('puntos_referido', '50'),
  ('puntos_nuevo_usuario', '50')
ON CONFLICT (clave) DO NOTHING;

-- ---------- Recompensas y canjes ----------
CREATE TABLE IF NOT EXISTS recompensas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  tipo VARCHAR(50),
  puntos_requeridos INTEGER NOT NULL DEFAULT 0,
  valor NUMERIC(10,2),
  stock INTEGER,
  limite_por_usuario INTEGER NOT NULL DEFAULT 1,
  validez_dias INTEGER NOT NULL DEFAULT 30,
  imagen TEXT,
  terminos JSONB NOT NULL DEFAULT '[]',
  disponible BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canjes_recompensas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  recompensa_id INTEGER NOT NULL REFERENCES recompensas(id) ON DELETE CASCADE,
  codigo_canje VARCHAR(50) NOT NULL UNIQUE,
  puntos_usados INTEGER NOT NULL DEFAULT 0,
  usado BOOLEAN NOT NULL DEFAULT false,
  fecha_canje TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMPTZ,
  fecha_uso TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_canjes_usuario ON canjes_recompensas (usuario_id);

-- ---------- Órdenes ----------
CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  impuestos NUMERIC(10,2) NOT NULL DEFAULT 0,
  cargo_servicio NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(50),
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  nombre_cliente VARCHAR(255),
  email_cliente VARCHAR(255),
  telefono_cliente VARCHAR(50),
  paypal_transaction_id VARCHAR(255),
  paypal_payer_id VARCHAR(255),
  paypal_status VARCHAR(50),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario ON ordenes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes (estado);

CREATE TABLE IF NOT EXISTS orden_items_peliculas (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  funcion_id INTEGER NOT NULL REFERENCES funciones_cine(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  asientos_seleccionados TEXT[],
  tipo_asiento VARCHAR(50) NOT NULL DEFAULT 'estandar'
);

CREATE TABLE IF NOT EXISTS orden_items_bar (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos_bar(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tamano_seleccionado JSONB,
  extras_seleccionados JSONB,
  notas TEXT
);

-- ---------- Comentarios ----------
CREATE TABLE IF NOT EXISTS comentarios (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'general',
  pelicula_id INTEGER REFERENCES peliculas(id) ON DELETE CASCADE,
  titulo VARCHAR(255),
  contenido TEXT NOT NULL,
  puntuacion INTEGER CHECK (puntuacion BETWEEN 1 AND 5),
  estado VARCHAR(50) NOT NULL DEFAULT 'activo',
  es_destacado BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS respuestas_comentarios (
  id SERIAL PRIMARY KEY,
  comentario_id INTEGER NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comentarios_reacciones (
  comentario_id INTEGER NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comentario_id, usuario_id)
);

-- ---------- Vistas de reportes (leídas por Reports.js) ----------
CREATE OR REPLACE VIEW vista_reporte_ventas AS
SELECT
  o.fecha_creacion::date AS fecha,
  COUNT(*)::INTEGER AS total_ordenes,
  COALESCE(SUM(o.total), 0) AS ingresos_total,
  COALESCE(SUM(o.subtotal), 0) AS subtotal_total,
  COALESCE(SUM(o.impuestos), 0) AS impuestos_total,
  COALESCE(AVG(o.total), 0) AS ticket_promedio,
  COUNT(*) FILTER (WHERE o.metodo_pago = 'paypal')::INTEGER AS pagos_paypal,
  COUNT(*) FILTER (WHERE o.metodo_pago = 'tarjeta')::INTEGER AS pagos_tarjeta
FROM ordenes o
WHERE o.estado = 'completada'
GROUP BY o.fecha_creacion::date;

CREATE OR REPLACE VIEW vista_estadisticas_usuarios AS
SELECT
  u.id,
  u.nombre,
  u.email,
  u.fecha_registro,
  COALESCE(p.puntos_actuales, 0) AS puntos_actuales,
  (SELECT COUNT(*)::INTEGER FROM favoritas f WHERE f.usuario_id = u.id) AS total_favoritas,
  (SELECT COUNT(*)::INTEGER FROM historial h WHERE h.usuario_id = u.id) AS total_historial,
  (SELECT COUNT(*)::INTEGER FROM ordenes o WHERE o.usuario_id = u.id AND o.estado = 'completada') AS total_compras,
  (SELECT COALESCE(SUM(o.total), 0) FROM ordenes o WHERE o.usuario_id = u.id AND o.estado = 'completada') AS total_gastado,
  (SELECT COUNT(*)::INTEGER FROM referidos r WHERE r.referidor_id = u.id) AS total_referidos
FROM usuarios u
LEFT JOIN puntos_usuario p ON p.usuario_id = u.id;

CREATE OR REPLACE VIEW vista_actividad_reciente AS
SELECT 'orden' AS tipo,
       ('Orden #' || o.id || ' - ' || o.estado) AS descripcion,
       o.fecha_creacion AS fecha,
       'fa-shopping-cart' AS icono,
       'primary' AS color
FROM ordenes o
UNION ALL
SELECT 'comentario' AS tipo,
       ('Comentario: ' || COALESCE(c.titulo, '')) AS descripcion,
       c.fecha_creacion AS fecha,
       'fa-comment' AS icono,
       'info' AS color
FROM comentarios c
UNION ALL
SELECT 'canje' AS tipo,
       ('Canje ' || cr.codigo_canje) AS descripcion,
       cr.fecha_canje AS fecha,
       'fa-gift' AS icono,
       'success' AS color
FROM canjes_recompensas cr;

CREATE OR REPLACE VIEW vista_peliculas_populares AS
SELECT
  p.*,
  COALESCE(SUM(oip.cantidad), 0)::INTEGER AS total_entradas_vendidas,
  COALESCE(SUM(oip.subtotal), 0) AS ingresos_generados,
  COUNT(DISTINCT o.usuario_id)::INTEGER AS usuarios_unicos,
  COALESCE(AVG(oip.precio_unitario), 0) AS precio_promedio
FROM peliculas p
LEFT JOIN funciones_cine fc ON fc.pelicula_id = p.id
LEFT JOIN orden_items_peliculas oip ON oip.funcion_id = fc.id
LEFT JOIN ordenes o ON o.id = oip.orden_id AND o.estado = 'completada'
GROUP BY p.id;

CREATE OR REPLACE VIEW vista_productos_bar_populares AS
SELECT
  pb.*,
  COUNT(oib.id)::INTEGER AS veces_vendido,
  COALESCE(SUM(oib.cantidad), 0)::INTEGER AS cantidad_total_vendida,
  COALESCE(SUM(oib.subtotal), 0) AS ingresos_generados,
  COALESCE(AVG(oib.precio_unitario), 0) AS precio_promedio_venta
FROM productos_bar pb
LEFT JOIN orden_items_bar oib ON oib.producto_id = pb.id
LEFT JOIN ordenes o ON o.id = oib.orden_id AND o.estado = 'completada'
GROUP BY pb.id;
