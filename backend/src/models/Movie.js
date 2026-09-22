const { query } = require('../config/database');

class Movie {
  // Crear una nueva película
  static async create(movieData) {
    const {
      titulo,
      sinopsis,
      poster,
      fecha_estreno,
      estudio,
      genero,
      anio,
      duracion,
      rating,
      director,
      trailer
    } = movieData;

    const sql = `
      INSERT INTO peliculas (
        titulo, sinopsis, poster, fecha_estreno, estudio, 
        genero, anio, duracion, rating, director, trailer, activo
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *
    `;

    const values = [
      titulo, sinopsis, poster, fecha_estreno, estudio,
      genero, anio, duracion, rating, director, trailer
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  // Obtener todas las películas activas
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM peliculas WHERE activo = true';
    const values = [];
    let paramCount = 1;

    // Filtros opcionales
    if (filters.genero) {
      sql += ` AND genero = $${paramCount}`;
      values.push(filters.genero);
      paramCount++;
    }

    if (filters.anio) {
      sql += ` AND anio = $${paramCount}`;
      values.push(filters.anio);
      paramCount++;
    }

    sql += ' ORDER BY fecha_creacion DESC';

    const result = await query(sql, values);
    return result.rows;
  }

  // Obtener película por ID
  static async findById(id) {
    const sql = 'SELECT * FROM peliculas WHERE id = $1 AND activo = true';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Actualizar película
  static async update(id, movieData) {
    const {
      titulo,
      sinopsis,
      poster,
      fecha_estreno,
      estudio,
      genero,
      anio,
      duracion,
      rating,
      director,
      trailer
    } = movieData;

    const sql = `
      UPDATE peliculas 
      SET titulo = $1, sinopsis = $2, poster = $3, fecha_estreno = $4,
          estudio = $5, genero = $6, anio = $7, duracion = $8,
          rating = $9, director = $10, trailer = $11,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $12 AND activo = true
      RETURNING *
    `;

    const values = [
      titulo, sinopsis, poster, fecha_estreno, estudio,
      genero, anio, duracion, rating, director, trailer, id
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

     static async search(searchTerm) {
  const sql = `
    SELECT id, titulo, sinopsis, poster, fecha_estreno, estudio, genero, 
           anio, duracion, rating, director, trailer, activo,
           fecha_creacion, fecha_actualizacion
    FROM peliculas 
    WHERE activo = true 
    AND (
      titulo ILIKE $1 
      OR sinopsis ILIKE $1 
      OR director ILIKE $1 
      OR genero ILIKE $1
    )
    ORDER BY titulo
  `;

  const searchPattern = `%${searchTerm}%`;
  const result = await query(sql, [searchPattern]);
  return result.rows;
}

  // Eliminar película (soft delete)
  static async delete(id) {
    const sql = `
      UPDATE peliculas 
      SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Buscar películas por título
  static async search(searchTerm) {
    const sql = `
      SELECT * FROM peliculas 
      WHERE activo = true 
      AND (titulo ILIKE $1 OR director ILIKE $1 OR genero ILIKE $1)
      ORDER BY titulo
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await query(sql, [searchPattern]);
    return result.rows;
  }

  // Obtener géneros únicos
  static async getGenres() {
    const sql = `
      SELECT DISTINCT genero 
      FROM peliculas 
      WHERE activo = true 
      ORDER BY genero
    `;

    const result = await query(sql);
    return result.rows.map(row => row.genero);
  }

  // Obtener películas más populares (por número de funciones)
  static async getMostPopular(limit = 5) {
    const sql = `
      SELECT p.*, COUNT(fc.id) as total_funciones
      FROM peliculas p
      LEFT JOIN funciones_cine fc ON p.id = fc.pelicula_id
      WHERE p.activo = true
      GROUP BY p.id
      ORDER BY total_funciones DESC, p.rating DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);
    return result.rows;
  }

  // Obtener estadísticas de una película
  static async getStats(id) {
    const sql = `
      SELECT 
        p.*,
        COUNT(fc.id) as total_funciones,
        COUNT(f.id) as total_favoritas,
        COUNT(h.id) as total_vistas
      FROM peliculas p
      LEFT JOIN funciones_cine fc ON p.id = fc.pelicula_id
      LEFT JOIN favoritas f ON p.id = f.pelicula_id
      LEFT JOIN historial h ON p.id = h.pelicula_id
      WHERE p.id = $1 AND p.activo = true
      GROUP BY p.id
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }
}

module.exports = Movie;