// backend/src/controllers/comingSoon/comingSoonController.js
const ComingSoon = require('../../models/ComingSoon');

// ==================== OBTENER TODOS LOS PRÓXIMOS ESTRENOS ====================
const getAllComingSoon = async (req, res) => {
  try {
    console.log('📡 Obteniendo todos los próximos estrenos');
    
    const estrenos = await ComingSoon.findAll();
    
    res.json({
      success: true,
      data: estrenos,
      total: estrenos.length,
      message: estrenos.length > 0 ? 'Próximos estrenos encontrados' : 'No hay próximos estrenos'
    });

  } catch (error) {
    console.error('❌ Error al obtener próximos estrenos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== OBTENER PRÓXIMO ESTRENO POR ID ====================
const getComingSoonById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de próximo estreno inválido'
      });
    }
    
    console.log(`📡 Obteniendo próximo estreno ID: ${id}`);
    
    const estreno = await ComingSoon.findById(parseInt(id));
    
    if (!estreno) {
      return res.status(404).json({
        success: false,
        error: 'Próximo estreno no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: estreno
    });

  } catch (error) {
    console.error('❌ Error al obtener próximo estreno:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== CREAR NUEVO PRÓXIMO ESTRENO (ADMIN) ====================
const createComingSoon = async (req, res) => {
  try {
    const estrenoData = req.body;
    
    console.log('📡 Creando nuevo próximo estreno:', estrenoData.titulo);
    
    // Validar datos
    const validation = ComingSoon.validateData(estrenoData, false);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Datos de próximo estreno inválidos',
        details: validation.errors
      });
    }
    
    // Crear próximo estreno
    const nuevoEstreno = await ComingSoon.create(estrenoData);
    
    res.status(201).json({
      success: true,
      data: nuevoEstreno,
      message: 'Próximo estreno creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al crear próximo estreno:', error);
    
    // Error de duplicado (título ya existe)
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un próximo estreno con ese título'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== ACTUALIZAR PRÓXIMO ESTRENO (ADMIN) ====================
const updateComingSoon = async (req, res) => {
  try {
    const { id } = req.params;
    const estrenoData = req.body;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de próximo estreno inválido'
      });
    }
    
    console.log(`📡 Actualizando próximo estreno ID: ${id}`);
    
    // Validar datos
    const validation = ComingSoon.validateData(estrenoData, true);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Datos de próximo estreno inválidos',
        details: validation.errors
      });
    }
    
    // Actualizar próximo estreno
    const estrenoActualizado = await ComingSoon.update(parseInt(id), estrenoData);
    
    if (!estrenoActualizado) {
      return res.status(404).json({
        success: false,
        error: 'Próximo estreno no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: estrenoActualizado,
      message: 'Próximo estreno actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar próximo estreno:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== ELIMINAR PRÓXIMO ESTRENO (ADMIN) ====================
const deleteComingSoon = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de próximo estreno inválido'
      });
    }
    
    console.log(`📡 Eliminando próximo estreno ID: ${id}`);
    
    // Eliminar próximo estreno (soft delete)
    const estrenoEliminado = await ComingSoon.delete(parseInt(id));
    
    if (!estrenoEliminado) {
      return res.status(404).json({
        success: false,
        error: 'Próximo estreno no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: `Próximo estreno "${estrenoEliminado.titulo}" eliminado exitosamente`,
      data: estrenoEliminado
    });

  } catch (error) {
    console.error('❌ Error al eliminar próximo estreno:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== BUSCAR PRÓXIMOS ESTRENOS ====================
const searchComingSoon = async (req, res) => {
  try {
    const { q } = req.query;

    // Validar término de búsqueda
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Término de búsqueda requerido'
      });
    }

    const searchTerm = q.trim();
    console.log(`🔍 Buscando próximos estrenos con término: ${searchTerm}`);

    // Buscar en la base de datos
    const estrenos = await ComingSoon.search(searchTerm);

    console.log(`✅ ${estrenos.length} próximos estrenos encontrados`);

    res.json({
      success: true,
      data: estrenos,
      total: estrenos.length,
      searchTerm: searchTerm
    });

  } catch (error) {
    console.error('❌ Error en búsqueda de próximos estrenos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== OBTENER POR GÉNERO ====================
const getComingSoonByGenero = async (req, res) => {
  try {
    const { genero } = req.params;
    
    console.log(`📡 Obteniendo próximos estrenos del género: ${genero}`);
    
    const estrenos = await ComingSoon.findByGenero(genero);
    
    res.json({
      success: true,
      data: estrenos,
      total: estrenos.length,
      genero: genero
    });

  } catch (error) {
    console.error('❌ Error al obtener próximos estrenos por género:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== OBTENER PRÓXIMOS N DÍAS ====================
const getUpcomingDays = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    console.log(`📡 Obteniendo estrenos de los próximos ${days} días`);
    
    const estrenos = await ComingSoon.getUpcoming(parseInt(days));
    
    res.json({
      success: true,
      data: estrenos,
      total: estrenos.length,
      days: parseInt(days)
    });

  } catch (error) {
    console.error('❌ Error al obtener próximos estrenos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== OBTENER ESTADÍSTICAS ====================
const getComingSoonStats = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de próximos estrenos');
    
    const stats = await ComingSoon.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ==================== CAMBIAR ESTADO (ACTIVAR/DESACTIVAR) ====================
const toggleComingSoonStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de próximo estreno inválido'
      });
    }
    
    console.log(`📡 Cambiando estado del próximo estreno ID: ${id}`);
    
    // Obtener estreno actual
    const estrenoActual = await ComingSoon.findById(parseInt(id));
    if (!estrenoActual) {
      return res.status(404).json({
        success: false,
        error: 'Próximo estreno no encontrado'
      });
    }
    
    // Cambiar estado
    const nuevoEstado = !estrenoActual.activo;
    const estrenoActualizado = await ComingSoon.update(parseInt(id), { activo: nuevoEstado });
    
    res.json({
      success: true,
      message: `Próximo estreno ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      data: estrenoActualizado
    });

  } catch (error) {
    console.error('❌ Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAllComingSoon,
  getComingSoonById,
  createComingSoon,
  updateComingSoon,
  deleteComingSoon,
  searchComingSoon,
  getComingSoonByGenero,
  getUpcomingDays,
  getComingSoonStats,
  toggleComingSoonStatus
};