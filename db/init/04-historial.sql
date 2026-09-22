-- ============================================================
-- ParkyFilms — Ajustes 04: columnas reales de `historial`
-- El controlador (historyController.js) usa tipo_accion ('vista'|'comprada')
-- y fecha_vista; el esquema 01 solo traía fecha_creacion -> todo el
-- historial (ver, comprar, stats) devolvía 500. Idempotente.
-- ============================================================

ALTER TABLE historial
  ADD COLUMN IF NOT EXISTS tipo_accion VARCHAR(20) NOT NULL DEFAULT 'vista',
  ADD COLUMN IF NOT EXISTS fecha_vista TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Las filas viejas (si las hay) quedan como 'vista' con su fecha de creación.
UPDATE historial
SET fecha_vista = fecha_creacion
WHERE fecha_vista IS NULL;

CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial (usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_pelicula ON historial (pelicula_id);
