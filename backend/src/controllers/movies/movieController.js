const Movie = require('../../models/Movie');

// El panel admin envía la duración como texto ("1h 29min") pero la columna
// peliculas.duracion es INTEGER (minutos). Sin esta conversión Postgres
// fallaba con 22P02 y la API devolvía 500 al crear/editar.
const parseDuracion = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return valor;

  const str = String(valor).trim().toLowerCase();
  // Solo número: "89" o "89min"
  const soloNumero = str.match(/^(\d+)\s*(min)?$/);
  if (soloNumero) {
    const n = parseInt(soloNumero[1], 10);
    return n > 0 ? n : null;
  }
  // Formato horas: "1h 29min", "1h29", "2h", "2h 30min"
  const conHoras = str.match(/^(\d+)\s*h(?:\s*(\d+)\s*min?)?$/);
  if (conHoras) {
    const total = parseInt(conHoras[1], 10) * 60 + (conHoras[2] ? parseInt(conHoras[2], 10) : 0);
    return total > 0 ? total : null;
  }
  return null;
};

// Normaliza tipos que el formulario envía como string (duracion, anio, rating).
// Devuelve { data } o { error }.
const normalizarPelicula = (movieData) => {
  const data = { ...movieData };

  if (data.duracion !== undefined) {
    const min = parseDuracion(data.duracion);
    if (min === null) {
      return { error: "Duración inválida: usa minutos (89) o formato '1h 29min'" };
    }
    data.duracion = min;
  }
  if (data.anio !== undefined && data.anio !== null && data.anio !== '') {
    const anio = parseInt(data.anio, 10);
    if (isNaN(anio)) return { error: 'Año inválido' };
    data.anio = anio;
  }
  if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
    const rating = parseFloat(data.rating);
    if (isNaN(rating)) return { error: 'Rating inválido' };
    data.rating = rating;
  }
  return { data };
};

// Obtener todas las películas
const getAllMovies = async (req, res) => {
  try {
    const { genero, anio, search } = req.query;
    
    let movies;
    if (search) {
      movies = await Movie.search(search);
    } else {
      const filters = {};
      if (genero) filters.genero = genero;
      if (anio) filters.anio = parseInt(anio);
      
      movies = await Movie.findAll(filters);
    }

    res.json({
      success: true,
      data: movies,
      total: movies.length,
      message: movies.length > 0 ? 'Películas encontradas' : 'No hay películas disponibles'
    });
  } catch (error) {
    console.error('Error al obtener películas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las películas'
    });
  }
};

// Obtener película por ID
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const movieId = parseInt(id);
    if (isNaN(movieId) || movieId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }
    
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    console.error('Error al obtener película:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la película'
    });
  }
};

// Crear nueva película
const createMovie = async (req, res) => {
  try {
    const movieData = req.body;
    
    // Validaciones básicas
    if (!movieData.titulo || !movieData.sinopsis || !movieData.director) {
      return res.status(400).json({
        success: false,
        error: 'Título, sinopsis y director son obligatorios'
      });
    }

    const normalizado = normalizarPelicula(movieData);
    if (normalizado.error) {
      return res.status(400).json({ success: false, error: normalizado.error });
    }

    const newMovie = await Movie.create(normalizado.data);
    
    res.status(201).json({
      success: true,
      data: newMovie,
      message: 'Película creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear película:', error);
    
    // Error de duplicado (título ya existe)
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una película con ese título'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear la película'
    });
  }
};

// Actualizar película
const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const movieData = req.body;
    
    const movieId = parseInt(id);
    if (isNaN(movieId) || movieId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }

    const normalizado = normalizarPelicula(movieData);
    if (normalizado.error) {
      return res.status(400).json({ success: false, error: normalizado.error });
    }

    const updatedMovie = await Movie.update(movieId, normalizado.data);
    
    if (!updatedMovie) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: updatedMovie,
      message: 'Película actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar película:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la película'
    });
  }
};

// Eliminar película
const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    
    const movieId = parseInt(id);
    if (isNaN(movieId) || movieId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }
    
    const deletedMovie = await Movie.delete(movieId);
    
    if (!deletedMovie) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: `Película "${deletedMovie.titulo}" eliminada exitosamente`,
      data: deletedMovie
    });
  } catch (error) {
    console.error('Error al eliminar película:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la película'
    });
  }
};

// Obtener géneros disponibles
const getGenres = async (req, res) => {
  try {
    const genres = await Movie.getGenres();
    res.json({
      success: true,
      data: genres
    });
  } catch (error) {
    console.error('Error al obtener géneros:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los géneros'
    });
  }
};

// Obtener películas más populares
const getPopularMovies = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const movies = await Movie.getMostPopular(parseInt(limit));
    res.json({
      success: true,
      data: movies
    });
  } catch (error) {
    console.error('Error al obtener películas populares:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las películas populares'
    });
  }
};

const searchMovies = async (req, res) => {
  try {
    const { q } = req.query;

    // Validar que hay término de búsqueda
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Término de búsqueda requerido'
      });
    }

    const searchTerm = q.trim();
    console.log('🔍 Buscando películas con término:', searchTerm);

    // Buscar en la base de datos
    const movies = await Movie.search(searchTerm);

    console.log('✅ Películas encontradas:', movies.length);

    res.json({
      success: true,
      data: movies,
      total: movies.length,
      searchTerm: searchTerm
    });

  } catch (error) {
    console.error('❌ Error en búsqueda de películas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de una película
const getMovieStats = async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await Movie.getStats(id);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las estadísticas'
    });
  }
};

module.exports = {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getGenres,
  getPopularMovies,
  getMovieStats,
  searchMovies
};