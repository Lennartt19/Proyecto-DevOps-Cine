-- ============================================================
-- ParkyFilms — Ajustes 02: columnas usadas en controladores
-- (funciones/asientos) que faltaron en 01-schema.sql
-- Idempotente: seguro re-ejecutar.
-- ============================================================

ALTER TABLE funciones_cine
  ADD COLUMN IF NOT EXISTS formato VARCHAR(20) NOT NULL DEFAULT '2D',
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE asientos
  ADD COLUMN IF NOT EXISTS es_vip BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esta_deshabilitado BOOLEAN NOT NULL DEFAULT false;
