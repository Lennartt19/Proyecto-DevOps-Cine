// controllers/movies/recommendationsController.js - CORREGIDO
const Movie = require('../../models/Movie');
const { query } = require('../../config/database');

const recommendationsController = {
  
  /**
   * Obtener recomendaciones para un usuario basadas en sus compras
   */
  async getUserRecommendations(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      console.log(`🎯 Generando recomendaciones para usuario ${userId}`);
      
      // ✅ CORREGIDO: Sin 'this.'
      const purchasedMovies = await getUserPurchasedMovies(userId);
      console.log(`📚 Usuario ha comprado ${purchasedMovies.length} películas`);
      
      let recommendations = [];
      
      if (purchasedMovies.length > 0) {
        // Generar recomendaciones basadas en historial
        recommendations = await generateRecommendations(userId, purchasedMovies);
      } else {
        // Usuario nuevo - mostrar películas populares
        recommendations = await getPopularMovies();
        console.log('🆕 Usuario nuevo - mostrando películas populares');
      }
      
      // 🔧 MEJORA: Si no hay recomendaciones, usar todas las películas activas
      if (recommendations.length === 0) {
        console.log('📽️ No hay recomendaciones específicas, usando todas las películas');
        // ✅ CORREGIDO: Sin 'this.'
        recommendations = await getAllActiveMovies();
      }
      
      // Limitar a 8 recomendaciones para el carrusel
      const finalRecommendations = recommendations.slice(0, 8);
      
      console.log(`✅ ${finalRecommendations.length} recomendaciones generadas`);
      
      res.json({
        success: true,
        data: finalRecommendations,
        meta: {
          userId,
          totalRecommendations: finalRecommendations.length,
          basedOnPurchases: purchasedMovies.length > 0,
          algorithm: purchasedMovies.length > 0 ? 'collaborative_filtering' : 'popularity'
        }
      });
      
    } catch (error) {
      console.error('❌ Error generando recomendaciones:', error);
      
      // 🔧 MEJORA: En caso de error, intentar devolver al menos algunas películas
      try {
        // ✅ CORREGIDO: Sin 'this.'
        const fallbackMovies = await getAllActiveMovies();
        const limitedFallback = fallbackMovies.slice(0, 8);
        
        res.json({
          success: true,
          data: limitedFallback,
          meta: {
            userId: req.user?.id,
            totalRecommendations: limitedFallback.length,
            basedOnPurchases: false,
            algorithm: 'fallback',
            note: 'Usando películas de fallback debido a error en recomendaciones'
          }
        });
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError);
        res.status(500).json({
          success: false,
          message: 'Error al generar recomendaciones',
          data: [],
          error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
      }
    }
  }
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * 🆕 NUEVO: Obtener todas las películas activas como fallback final
 */
async function getAllActiveMovies() {
  try {
    const sql = `
      SELECT DISTINCT
        p.*,
        0 as total_compras,
        p.rating as recommendation_score
      FROM peliculas p
      WHERE p.activo = true
      AND p.rating >= 5.0
      ORDER BY p.rating DESC, p.anio DESC
      LIMIT 8
    `;
    
    const result = await query(sql);
    
    console.log(`🎬 ${result.rows.length} películas activas obtenidas como fallback`);
    return result.rows;
    
  } catch (error) {
    console.error('Error obteniendo películas activas:', error);
    return [];
  }
}

/**
 * Obtener películas compradas por un usuario
 */
async function getUserPurchasedMovies(userId) {
  try {
    const sql = `
      SELECT DISTINCT 
        p.id,
        p.titulo,
        p.genero,
        p.rating,
        p.anio,
        COUNT(*) as veces_comprada,
        MAX(o.fecha_creacion) as ultima_compra
      FROM peliculas p
      INNER JOIN funciones_cine fc ON p.id = fc.pelicula_id
      INNER JOIN orden_items_peliculas oip ON fc.id = oip.funcion_id
      INNER JOIN ordenes o ON oip.orden_id = o.id
      WHERE o.usuario_id = $1 
      AND o.estado = 'completada'
      AND p.activo = true
      GROUP BY p.id, p.titulo, p.genero, p.rating, p.anio
      ORDER BY ultima_compra DESC, veces_comprada DESC
    `;
    
    const result = await query(sql, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo películas compradas:', error);
    return [];
  }
}

/**
 * Generar recomendaciones basadas en el algoritmo de filtrado colaborativo
 */
async function generateRecommendations(userId, purchasedMovies) {
  try {
    const recommendations = [];
    
    // 1. Recomendaciones por género favorito
    const genreRecommendations = await getRecommendationsByGenre(userId, purchasedMovies);
    recommendations.push(...genreRecommendations);
    
    // 2. Recomendaciones por usuarios similares
    const collaborativeRecommendations = await getCollaborativeRecommendations(userId, purchasedMovies);
    recommendations.push(...collaborativeRecommendations);
    
    // 3. Recomendaciones por rating alto
    const highRatedRecommendations = await getHighRatedRecommendations(userId);
    recommendations.push(...highRatedRecommendations);
    
    // Eliminar duplicados y películas ya compradas
    const uniqueRecommendations = removeDuplicatesAndPurchased(recommendations, purchasedMovies);
    
    // Ordenar por score de recomendación
    return uniqueRecommendations.sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
    
  } catch (error) {
    console.error('Error generando recomendaciones:', error);
    return await getPopularMovies();
  }
}

/**
 * Recomendaciones basadas en géneros favoritos del usuario
 */
async function getRecommendationsByGenre(userId, purchasedMovies) {
  try {
    // Obtener géneros más comprados
    const genreStats = {};
    purchasedMovies.forEach(movie => {
      genreStats[movie.genero] = (genreStats[movie.genero] || 0) + parseInt(movie.veces_comprada);
    });
    
    const favoriteGenres = Object.keys(genreStats)
      .sort((a, b) => genreStats[b] - genreStats[a])
      .slice(0, 3); // Top 3 géneros
    
    if (favoriteGenres.length === 0) return [];
    
    const sql = `
      SELECT DISTINCT
        p.*,
        COUNT(oip.id) as popularidad,
        AVG(p.rating) as rating_promedio,
        (p.rating * 0.7 + COUNT(oip.id) * 0.3) as recommendation_score
      FROM peliculas p
      LEFT JOIN funciones_cine fc ON p.id = fc.pelicula_id
      LEFT JOIN orden_items_peliculas oip ON fc.id = oip.funcion_id
      LEFT JOIN ordenes o ON oip.orden_id = o.id AND o.estado = 'completada'
      WHERE p.genero = ANY($1)
      AND p.activo = true
      AND p.id NOT IN (
        SELECT DISTINCT fc2.pelicula_id 
        FROM funciones_cine fc2
        INNER JOIN orden_items_peliculas oip2 ON fc2.id = oip2.funcion_id
        INNER JOIN ordenes o2 ON oip2.orden_id = o2.id
        WHERE o2.usuario_id = $2 AND o2.estado = 'completada'
      )
      GROUP BY p.id
      ORDER BY recommendation_score DESC
      LIMIT 4
    `;
    
    const result = await query(sql, [favoriteGenres, userId]);
    
    console.log(`🎭 ${result.rows.length} recomendaciones por género (${favoriteGenres.join(', ')})`);
    return result.rows;
    
  } catch (error) {
    console.error('Error en recomendaciones por género:', error);
    return [];
  }
}

/**
 * Recomendaciones colaborativas (usuarios con gustos similares)
 */
async function getCollaborativeRecommendations(userId, purchasedMovies) {
  try {
    if (purchasedMovies.length === 0) return [];
    
    const movieIds = purchasedMovies.map(m => m.id);
    
    const sql = `
      WITH usuarios_similares AS (
        SELECT 
          o.usuario_id,
          COUNT(*) as peliculas_en_comun,
          COUNT(*) * 1.0 / (
            SELECT COUNT(DISTINCT fc3.pelicula_id)
            FROM funciones_cine fc3
            INNER JOIN orden_items_peliculas oip3 ON fc3.id = oip3.funcion_id
            INNER JOIN ordenes o3 ON oip3.orden_id = o3.id
            WHERE o3.usuario_id = o.usuario_id AND o3.estado = 'completada'
          ) as similarity_score
        FROM ordenes o
        INNER JOIN orden_items_peliculas oip ON o.id = oip.orden_id
        INNER JOIN funciones_cine fc ON oip.funcion_id = fc.id
        WHERE fc.pelicula_id = ANY($1)
        AND o.estado = 'completada'
        AND o.usuario_id != $2
        GROUP BY o.usuario_id
        HAVING COUNT(*) >= 2
        ORDER BY similarity_score DESC
        LIMIT 10
      )
      SELECT DISTINCT
        p.*,
        COUNT(oip.id) as popularidad_entre_similares,
        AVG(p.rating) as rating_promedio,
        (p.rating * 0.6 + COUNT(oip.id) * 0.4) as recommendation_score
      FROM peliculas p
      INNER JOIN funciones_cine fc ON p.id = fc.pelicula_id
      INNER JOIN orden_items_peliculas oip ON fc.id = oip.funcion_id
      INNER JOIN ordenes o ON oip.orden_id = o.id
      WHERE o.usuario_id IN (SELECT usuario_id FROM usuarios_similares)
      AND o.estado = 'completada'
      AND p.activo = true
      AND p.id NOT IN (
        SELECT DISTINCT fc2.pelicula_id 
        FROM funciones_cine fc2
        INNER JOIN orden_items_peliculas oip2 ON fc2.id = oip2.funcion_id
        INNER JOIN ordenes o2 ON oip2.orden_id = o2.id
        WHERE o2.usuario_id = $2 AND o2.estado = 'completada'
      )
      GROUP BY p.id
      ORDER BY recommendation_score DESC
      LIMIT 3
    `;
    
    const result = await query(sql, [movieIds, userId]);
    
    console.log(`👥 ${result.rows.length} recomendaciones colaborativas`);
    return result.rows;
    
  } catch (error) {
    console.error('Error en recomendaciones colaborativas:', error);
    return [];
  }
}

/**
 * Recomendaciones de películas con rating alto
 */
async function getHighRatedRecommendations(userId) {
  try {
    const sql = `
      SELECT DISTINCT
        p.*,
        COUNT(oip.id) as total_compras,
        (p.rating * 0.8 + COUNT(oip.id) * 0.2) as recommendation_score
      FROM peliculas p
      LEFT JOIN funciones_cine fc ON p.id = fc.pelicula_id
      LEFT JOIN orden_items_peliculas oip ON fc.id = oip.funcion_id
      LEFT JOIN ordenes o ON oip.orden_id = o.id AND o.estado = 'completada'
      WHERE p.rating >= 7.5
      AND p.activo = true
      AND p.id NOT IN (
        SELECT DISTINCT fc2.pelicula_id 
        FROM funciones_cine fc2
        INNER JOIN orden_items_peliculas oip2 ON fc2.id = oip2.funcion_id
        INNER JOIN ordenes o2 ON oip2.orden_id = o2.id
        WHERE o2.usuario_id = $1 AND o2.estado = 'completada'
      )
      GROUP BY p.id
      ORDER BY recommendation_score DESC
      LIMIT 2
    `;
    
    const result = await query(sql, [userId]);
    
    console.log(`⭐ ${result.rows.length} recomendaciones por rating alto`);
    return result.rows;
    
  } catch (error) {
    console.error('Error en recomendaciones por rating:', error);
    return [];
  }
}

/**
 * Obtener películas populares (para usuarios nuevos) - MEJORADO
 */
async function getPopularMovies() {
  try {
    const sql = `
      SELECT DISTINCT
        p.*,
        COALESCE(COUNT(oip.id), 0) as total_compras,
        (p.rating * 0.6 + COALESCE(COUNT(oip.id), 0) * 0.4) as recommendation_score
      FROM peliculas p
      LEFT JOIN funciones_cine fc ON p.id = fc.pelicula_id
      LEFT JOIN orden_items_peliculas oip ON fc.id = oip.funcion_id
      LEFT JOIN ordenes o ON oip.orden_id = o.id AND o.estado = 'completada'
      WHERE p.activo = true
      AND p.rating >= 6.0
      GROUP BY p.id
      ORDER BY recommendation_score DESC
      LIMIT 8
    `;
    
    const result = await query(sql);
    
    console.log(`🔥 ${result.rows.length} películas populares obtenidas`);
    return result.rows;
    
  } catch (error) {
    console.error('Error obteniendo películas populares:', error);
    return [];
  }
}

/**
 * Eliminar duplicados y películas ya compradas
 */
function removeDuplicatesAndPurchased(recommendations, purchasedMovies) {
  const purchasedIds = new Set(purchasedMovies.map(m => m.id));
  const seen = new Set();
  
  return recommendations.filter(movie => {
    if (seen.has(movie.id) || purchasedIds.has(movie.id)) {
      return false;
    }
    seen.add(movie.id);
    return true;
  });
}

module.exports = recommendationsController;