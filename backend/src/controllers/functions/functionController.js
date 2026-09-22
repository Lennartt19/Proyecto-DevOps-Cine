// backend/src/controllers/functions/functionController.js - VERSIÓN CORREGIDA
const { query } = require('../../config/database');
const { generateSeatsData } = require('./seatController'); // 🔧 IMPORTAR FUNCIÓN PURA

// Obtener todas las funciones
const getAllFunctions = async (req, res) => {
  try {
    console.log('📡 Obteniendo todas las funciones de cine');
    
    const sql = `
      SELECT 
        f.id,
        f.pelicula_id,
        f.fecha,
        f.hora,
        f.sala,
        f.precio,
        f.asientos_disponibles,
        f.formato,
        f.activo,
        f.fecha_creacion,
        p.titulo as pelicula_titulo,
        p.poster as pelicula_poster,
        p.genero as pelicula_genero,
        p.rating as pelicula_rating,
        p.duracion as pelicula_duracion
      FROM funciones_cine f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.activo = true AND p.activo = true
      ORDER BY f.fecha ASC, f.hora ASC
    `;
    
    const result = await query(sql);
    
    console.log(`✅ ${result.rows.length} funciones encontradas`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error al obtener funciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener funciones por película
const getFunctionsByMovie = async (req, res) => {
  try {
    const { peliculaId } = req.params;
    
    // Validar ID
    if (!peliculaId || isNaN(peliculaId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de película inválido'
      });
    }
    
    console.log(`📡 Obteniendo funciones para película ID: ${peliculaId}`);
    
    const sql = `
      SELECT 
        f.id,
        f.pelicula_id,
        f.fecha,
        f.hora,
        f.sala,
        f.precio,
        f.asientos_disponibles,
        f.formato,
        f.activo,
        f.fecha_creacion,
        p.titulo as pelicula_titulo,
        p.poster as pelicula_poster,
        p.duracion as pelicula_duracion
      FROM funciones_cine f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.pelicula_id = $1 
        AND f.activo = true 
        AND p.activo = true
        AND f.fecha >= CURRENT_DATE
      ORDER BY f.fecha ASC, f.hora ASC
    `;
    
    const result = await query(sql, [peliculaId]);
    
    console.log(`✅ ${result.rows.length} funciones encontradas para película ${peliculaId}`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error al obtener funciones por película:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener función por ID
const getFunctionById = async (req, res) => {
  try {
    const { funcionId } = req.params;
    
    console.log(`📡 Obteniendo función ID: ${funcionId}`);
    
    const sql = `
      SELECT 
        f.id,
        f.pelicula_id,
        f.fecha,
        f.hora,
        f.sala,
        f.precio,
        f.asientos_disponibles,
        f.formato,
        f.activo,
        f.fecha_creacion,
        p.titulo as pelicula_titulo,
        p.poster as pelicula_poster,
        p.genero as pelicula_genero,
        p.rating as pelicula_rating,
        p.duracion as pelicula_duracion,
        p.director as pelicula_director,
        p.sinopsis as pelicula_sinopsis
      FROM funciones_cine f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.id = $1 AND f.activo = true AND p.activo = true
    `;
    
    const result = await query(sql, [funcionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Función no encontrada'
      });
    }
    
    console.log(`✅ Función encontrada: ${result.rows[0].pelicula_titulo}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al obtener función:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// 🔧 CREAR FUNCIÓN CORREGIDA
const createFunction = async (req, res) => {
  try {
    const { peliculaId, fecha, hora, sala, precio, formato = '2D', asientosDisponibles = 50 } = req.body;
    
    // Validar datos requeridos
    if (!peliculaId || !fecha || !hora || !sala || !precio) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos: peliculaId, fecha, hora, sala, precio'
      });
    }
    
    // Validar que la película existe
    const peliculaExists = await query(
      'SELECT id, titulo FROM peliculas WHERE id = $1 AND activo = true',
      [peliculaId]
    );
    
    if (peliculaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Película no encontrada'
      });
    }
    
    // Verificar que no existe otra función en la misma sala, fecha y hora
    const conflicto = await query(
      'SELECT id FROM funciones_cine WHERE sala = $1 AND fecha = $2 AND hora = $3 AND activo = true',
      [sala, fecha, hora]
    );
    
    if (conflicto.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una función programada en esa sala, fecha y hora'
      });
    }
    
    console.log(`📡 Creando función para película: ${peliculaExists.rows[0].titulo}`);
    
    const insertSql = `
      INSERT INTO funciones_cine 
      (pelicula_id, fecha, hora, sala, precio, formato, asientos_disponibles)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, pelicula_id, fecha, hora, sala, precio, formato, asientos_disponibles, fecha_creacion
    `;
    
    const result = await query(insertSql, [
      peliculaId, fecha, hora, sala, precio, formato, asientosDisponibles
    ]);
    
    const funcionId = result.rows[0].id;
    console.log(`✅ Función creada con ID: ${funcionId}`);
    
    // 🔧 GENERACIÓN AUTOMÁTICA DE ASIENTOS CORREGIDA
    console.log('🪑 Generando asientos automáticamente...');
    
    try {
      // 🔧 USAR LA FUNCIÓN PURA DIRECTAMENTE
      const asientosResult = await generateSeatsData(funcionId);
      
      console.log('✅ Asientos generados automáticamente:', {
        total: asientosResult.totalAsientos,
        disponibles: asientosResult.asientosDisponibles,
        vip: asientosResult.asientosVip
      });
      
      // Devolver respuesta con información de asientos
      res.status(201).json({
        success: true,
        message: 'Función creada exitosamente con asientos generados',
        data: {
          funcion: result.rows[0],
          asientos: {
            total: asientosResult.totalAsientos,
            disponibles: asientosResult.asientosDisponibles,
            vip: asientosResult.asientosVip,
            configuracion: asientosResult.configuracion
          }
        }
      });
      
    } catch (seatError) {
      console.error('⚠️ Error al generar asientos automáticamente:', seatError);
      
      // 🔧 DEVOLVER FUNCIÓN CREADA PERO SIN ASIENTOS
      console.log('⚠️ Función creada sin asientos - se pueden generar manualmente después');
      
      res.status(201).json({
        success: true,
        message: 'Función creada exitosamente (asientos pendientes de generar)',
        data: {
          funcion: result.rows[0],
          asientos: {
            generados: false,
            error: seatError.message
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error al crear función:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar función (solo admin)
const updateFunction = async (req, res) => {
  try {
    const { funcionId } = req.params;
    const { fecha, hora, sala, precio, formato, asientosDisponibles, activo } = req.body;
    
    console.log(`📡 Actualizando función ID: ${funcionId}`);
    console.log('📝 Datos recibidos:', req.body);
    
    // Verificar que la función existe
    const funcionExists = await query(
      'SELECT id FROM funciones_cine WHERE id = $1',
      [funcionId]
    );
    
    if (funcionExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Función no encontrada'
      });
    }
    
    // Si se cambia sala, fecha u hora, verificar conflictos
    if (sala && fecha && hora) {
      const conflicto = await query(
        'SELECT id FROM funciones_cine WHERE sala = $1 AND fecha = $2 AND hora = $3 AND id != $4 AND activo = true',
        [sala, fecha, hora, funcionId]
      );
      
      if (conflicto.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe otra función en esa sala, fecha y hora'
        });
      }
    }
    
    // 🔧 CONSTRUIR QUERY DE ACTUALIZACIÓN DINÁMICAMENTE (CORREGIDO)
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (fecha !== undefined) {
      updates.push(`fecha = $${paramCount++}`);
      values.push(fecha);
    }
    if (hora !== undefined) {
      updates.push(`hora = $${paramCount++}`);
      values.push(hora);
    }
    if (sala !== undefined) {
      updates.push(`sala = $${paramCount++}`); // 🔧 CORREGIDO: era `sala = ${paramCount++}`
      values.push(sala);
    }
    if (precio !== undefined) {
      updates.push(`precio = $${paramCount++}`); // 🔧 CORREGIDO: era `precio = ${paramCount++}`
      values.push(precio);
    }
    if (formato !== undefined) {
      updates.push(`formato = $${paramCount++}`); // 🔧 CORREGIDO: era `formato = ${paramCount++}`
      values.push(formato);
    }
    if (asientosDisponibles !== undefined) {
      updates.push(`asientos_disponibles = $${paramCount++}`); // 🔧 CORREGIDO: era `asientos_disponibles = ${paramCount++}`
      values.push(asientosDisponibles);
    }
    if (activo !== undefined) {
      updates.push(`activo = $${paramCount++}`); // 🔧 CORREGIDO: era `activo = ${paramCount++}`
      values.push(activo);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron campos para actualizar'
      });
    }
    
    values.push(funcionId);
    
    // 🔧 QUERY SQL CORREGIDO
    const updateSql = `
      UPDATE funciones_cine 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, pelicula_id, fecha, hora, sala, precio, formato, asientos_disponibles, activo
    `;
    
    console.log('🔧 Query SQL construido:', updateSql);
    console.log('🔧 Valores:', values);
    
    const result = await query(updateSql, values);
    
    console.log(`✅ Función actualizada: ${funcionId}`);
    
    res.json({
      success: true,
      message: 'Función actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar función:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar función (solo admin)
const deleteFunction = async (req, res) => {
  try {
    const { funcionId } = req.params;
    
    console.log(`📡 Eliminando función ID: ${funcionId}`);
    
    // En lugar de eliminar, marcar como inactiva
    const updateSql = `
      UPDATE funciones_cine 
      SET activo = false
      WHERE id = $1
      RETURNING id, sala, fecha, hora
    `;
    
    const result = await query(updateSql, [funcionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Función no encontrada'
      });
    }
    
    console.log(`✅ Función marcada como inactiva: ${funcionId}`);
    
    res.json({
      success: true,
      message: 'Función eliminada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al eliminar función:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener funciones por fecha
const getFunctionsByDate = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    console.log(`📡 Obteniendo funciones para fecha: ${fecha}`);
    
    const sql = `
      SELECT 
        f.id,
        f.pelicula_id,
        f.fecha,
        f.hora,
        f.sala,
        f.precio,
        f.asientos_disponibles,
        f.formato,
        p.titulo as pelicula_titulo,
        p.poster as pelicula_poster,
        p.genero as pelicula_genero,
        p.duracion as pelicula_duracion
      FROM funciones_cine f
      JOIN peliculas p ON f.pelicula_id = p.id
      WHERE f.fecha = $1 AND f.activo = true AND p.activo = true
      ORDER BY f.hora ASC, f.sala ASC
    `;
    
    const result = await query(sql, [fecha]);
    
    console.log(`✅ ${result.rows.length} funciones encontradas para ${fecha}`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error al obtener funciones por fecha:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAllFunctions,
  getFunctionsByMovie,
  getFunctionById,
  createFunction,
  updateFunction,
  deleteFunction,
  getFunctionsByDate
};