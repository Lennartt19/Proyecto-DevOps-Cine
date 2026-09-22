-- ParkyFilms DB init (local Docker)
-- Este archivo se ejecuta SOLO la primera vez que se crea el volumen pgdata.
-- La app hoy NO trae migraciones versionadas (backend/package.json -> migrate
-- apunta a un archivo inexistente). Por eso aquí solo dejamos extensiones base.
--
-- PENDIENTE (ver docs/obsidian/04-base-de-datos.md):
-- exportar el esquema real (pg_dump) desde Railway e importarlo con:
--   docker compose exec -T db psql -U postgres -d parkyfilms < schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
