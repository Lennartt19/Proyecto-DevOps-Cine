-- ============================================================
-- ParkyFilms — Datos demo 03
-- 4 películas que coinciden con las "destacadas" del home (ids 1-4),
-- 2 funciones y 2 productos de bar para probar el flujo completo.
-- Idempotente (ON CONFLICT DO NOTHING). Solo para entornos local/demo.
-- ============================================================

INSERT INTO peliculas (id, titulo, sinopsis, poster, fecha_estreno, estudio, genero, anio, duracion, rating, director, trailer, activo)
VALUES
  (1, 'Avatar: El Camino del Agua', 'Jake Sully y Neytiri protegen a su familia de una antigua amenaza en Pandora.', 'assets/movies/avatar.png', '2022-12-16', '20th Century Studios', 'Aventura', 2022, 192, 8.1, 'James Cameron', 'd9MyW72ELq0', true),
  (2, 'Top Gun: Maverick', 'Maverick entrena a una nueva generación de pilotos para una misión imposible.', 'assets/movies/topgun.png', '2022-05-27', 'Paramount Pictures', 'Acción', 2022, 131, 8.3, 'Joseph Kosinski', 'giXco2jaZ_4', true),
  (3, 'Black Panther: Wakanda Forever', 'Wakanda lucha por proteger su nación tras la muerte del rey T''Challa.', 'assets/movies/blackpanter2.png', '2022-11-11', 'Marvel Studios', 'Acción', 2022, 161, 7.8, 'Ryan Cooglar', '_Z3QKkl1WyM', true),
  (4, 'The Batman', 'Batman sigue el rastro del Acertijo en una Gotham corrupta.', 'assets/movies/batman.png', '2022-03-04', 'Warner Bros.', 'Acción', 2022, 176, 7.9, 'Matt Reeves', 'mqqft2x_Aa4', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval('peliculas_id_seq', (SELECT MAX(id) FROM peliculas));

INSERT INTO funciones_cine (pelicula_id, fecha, hora, sala, precio, formato, asientos_disponibles, activo)
SELECT 1, CURRENT_DATE + 1, '18:00', 'Sala 1 - IMAX', 12.50, 'IMAX 3D', 96, true
WHERE NOT EXISTS (SELECT 1 FROM funciones_cine WHERE pelicula_id = 1);
INSERT INTO funciones_cine (pelicula_id, fecha, hora, sala, precio, formato, asientos_disponibles, activo)
SELECT 2, CURRENT_DATE + 1, '20:30', 'Sala 2', 8.50, '2D', 60, true
WHERE NOT EXISTS (SELECT 1 FROM funciones_cine WHERE pelicula_id = 2);

INSERT INTO productos_bar (nombre, descripcion, precio, categoria, disponible, es_combo, eliminado)
SELECT 'Cancha grande + 2 gaseosas', 'Combo clásico para compartir.', 18.00, 'Combos', true, true, false
WHERE NOT EXISTS (SELECT 1 FROM productos_bar WHERE nombre = 'Cancha grande + 2 gaseosas');
INSERT INTO productos_bar (nombre, descripcion, precio, categoria, disponible, es_combo, eliminado)
SELECT 'Hot dog especial', 'Pan artesanal, salchicha premium y cremas.', 9.50, 'Snacks', true, false, false
WHERE NOT EXISTS (SELECT 1 FROM productos_bar WHERE nombre = 'Hot dog especial');
