// backend/src/models/ComingSoon.js
const { query } = require('../config/database');

class ComingSoon {
  
  // ==================== CREAR PRÓXIMO ESTRENO ====================
  static async create(estrenoData) {
    try {
      console.log('📡 Creando próximo estreno:', estrenoData.titulo);
      
      // ✅ SOPORTAR AMBOS FORMATOS: camelCase Y snake_case
      const {
        titulo,
        sinopsis,
        poster,
        estudio,
        genero,
        director,
        trailer,
        duracion,
        actores = []
      } = estrenoData;

      // ✅ MANEJAR FECHA EN AMBOS FORMATOS
      const fechaEstreno = estrenoData.fechaEstreno || estrenoData.fecha_estreno;
      
      const sql = `
        INSERT INTO proximos_estrenos (
          titulo, sinopsis, poster, fecha_estreno, estudio, genero, 
          director, trailer, duracion, actores, activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *
      `;
      
      const result = await query(sql, [
        titulo,
        sinopsis,
        poster,
        fechaEstreno,
        estudio,
        genero,
        director,
        trailer,
        duracion,
        actores
      ]);
      
      console.log('✅ Próximo estreno creado:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error al crear próximo estreno:', error);
      throw error;
    }
  }

  // ==================== OBTENER TODOS LOS PRÓXIMOS ESTRENOS ====================
  static async findAll() {
    try {
      console.log('📡 Obteniendo todos los próximos estrenos');
      
      const sql = `
        SELECT 
          id,
          titulo,
          sinopsis,
          poster,
          fecha_estreno,
          estudio,
          genero,
          director,
          trailer,
          duracion,
          actores,
          activo,
          fecha_creacion
        FROM proximos_estrenos
        WHERE activo = true
        ORDER BY fecha_estreno ASC
      `;
      
      const result = await query(sql);
      
      console.log(`✅ ${result.rows.length} próximos estrenos encontrados`);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error al obtener próximos estrenos:', error);
      throw error;
    }
  }

  // ==================== OBTENER POR ID ====================
  static async findById(id) {
    try {
      console.log('📡 Buscando próximo estreno por ID:', id);
      
      const sql = `
        SELECT 
          id,
          titulo,
          sinopsis,
          poster,
          fecha_estreno,
          estudio,
          genero,
          director,
          trailer,
          duracion,
          actores,
          activo,
          fecha_creacion
        FROM proximos_estrenos
        WHERE id = $1 AND activo = true
      `;
      
      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        console.log('⚠️ Próximo estreno no encontrado:', id);
        return null;
      }
      
      console.log('✅ Próximo estreno encontrado:', result.rows[0].titulo);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error al buscar próximo estreno:', error);
      throw error;
    }
  }

  // ==================== ACTUALIZAR PRÓXIMO ESTRENO ====================
  static async update(id, estrenoData) {
    try {
      console.log('📡 Actualizando próximo estreno ID:', id);
      
      // Construir query dinámicamente
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      // ✅ MAPEO DE CAMPOS PARA SOPORTAR AMBOS FORMATOS
      const fieldMapping = {
        'titulo': 'titulo',
        'sinopsis': 'sinopsis', 
        'poster': 'poster',
        'fechaEstreno': 'fecha_estreno',
        'fecha_estreno': 'fecha_estreno',
        'estudio': 'estudio',
        'genero': 'genero',
        'director': 'director',
        'trailer': 'trailer',
        'duracion': 'duracion',
        'actores': 'actores'
      };
      
      Object.keys(estrenoData).forEach(field => {
        if (fieldMapping[field] && estrenoData[field] !== undefined) {
          const dbField = fieldMapping[field];
          updates.push(`${dbField} = $${paramCount++}`);
          values.push(estrenoData[field]);
        }
      });
      
      if (updates.length === 0) {
        throw new Error('No hay campos para actualizar');
      }
      
      values.push(id); // Para el WHERE
      
      const sql = `
        UPDATE proximos_estrenos 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND activo = true
        RETURNING *
      `;
      
      const result = await query(sql, values);
      
      if (result.rows.length === 0) {
        console.log('⚠️ Próximo estreno no encontrado para actualizar:', id);
        return null;
      }
      
      console.log('✅ Próximo estreno actualizado:', result.rows[0].titulo);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error al actualizar próximo estreno:', error);
      throw error;
    }
  }

  // ==================== ELIMINAR (SOFT DELETE) ====================
  static async delete(id) {
    try {
      console.log('📡 Eliminando próximo estreno ID:', id);
      
      const sql = `
        UPDATE proximos_estrenos 
        SET activo = false
        WHERE id = $1 AND activo = true
        RETURNING id, titulo
      `;
      
      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        console.log('⚠️ Próximo estreno no encontrado para eliminar:', id);
        return null;
      }
      
      console.log('✅ Próximo estreno eliminado:', result.rows[0].titulo);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error al eliminar próximo estreno:', error);
      throw error;
    }
  }

  // ==================== BUSCAR POR TEXTO ====================
  static async search(searchTerm) {
    try {
      console.log('🔍 Buscando próximos estrenos:', searchTerm);
      
      const sql = `
        SELECT 
          id,
          titulo,
          sinopsis,
          poster,
          fecha_estreno,
          estudio,
          genero,
          director,
          trailer,
          duracion,
          actores,
          activo
        FROM proximos_estrenos
        WHERE activo = true
          AND (
            LOWER(titulo) LIKE LOWER($1) OR
            LOWER(director) LIKE LOWER($1) OR
            LOWER(genero) LIKE LOWER($1) OR
            LOWER(sinopsis) LIKE LOWER($1)
          )
        ORDER BY fecha_estreno ASC
      `;
      
      const result = await query(sql, [`%${searchTerm}%`]);
      
      console.log(`✅ ${result.rows.length} próximos estrenos encontrados en búsqueda`);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error en búsqueda de próximos estrenos:', error);
      throw error;
    }
  }

  // ==================== OBTENER POR GÉNERO ====================
  static async findByGenero(genero) {
    try {
      const sql = `
        SELECT *
        FROM proximos_estrenos
        WHERE genero = $1 AND activo = true
        ORDER BY fecha_estreno ASC
      `;
      
      const result = await query(sql, [genero]);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error al buscar por género:', error);
      throw error;
    }
  }

  // ==================== OBTENER PRÓXIMOS N DÍAS ====================
  static async getUpcoming(days = 30) {
    try {
      const sql = `
        SELECT *
        FROM proximos_estrenos
        WHERE activo = true 
          AND fecha_estreno BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        ORDER BY fecha_estreno ASC
      `;
      
      const result = await query(sql);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error al obtener próximos estrenos:', error);
      throw error;
    }
  }

  // ==================== ESTADÍSTICAS ====================
  static async getStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_estrenos,
          COUNT(DISTINCT genero) as generos_diferentes,
          COUNT(DISTINCT director) as directores_diferentes,
          MIN(fecha_estreno) as proximo_estreno,
          MAX(fecha_estreno) as estreno_mas_lejano,
          EXTRACT(YEAR FROM MIN(fecha_estreno)) as anio_proximo,
          EXTRACT(YEAR FROM MAX(fecha_estreno)) as anio_mas_lejano
        FROM proximos_estrenos
        WHERE activo = true AND fecha_estreno >= CURRENT_DATE
      `;
      
      const result = await query(sql);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw error;
    }
  }
static validateFechaEstreno(fechaEstreno, errors) {
  const fechaEstrenoDate = new Date(fechaEstreno);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (isNaN(fechaEstrenoDate.getTime())) {
    errors.push('La fecha de estreno tiene un formato inválido (use YYYY-MM-DD)');
  } else if (fechaEstrenoDate < hoy) {
    errors.push('La fecha de estreno debe ser futura');
  }
}
  // ==================== VALIDACIONES ARREGLADAS ====================
  static validateData(estrenoData, isUpdate = false) {
  const errors = [];
  
  // ✅ PARA CREACIÓN: Todos los campos son obligatorios
  // ✅ PARA ACTUALIZACIÓN: Solo validar campos que se envían
  
  if (!isUpdate) {
    // VALIDACIONES PARA CREACIÓN (POST)
    if (!estrenoData.titulo?.trim()) {
      errors.push('El título es obligatorio');
    }
    
    if (!estrenoData.sinopsis?.trim()) {
      errors.push('La sinopsis es obligatoria');
    }
    
    if (!estrenoData.director?.trim()) {
      errors.push('El director es obligatorio');
    }
    
    if (!estrenoData.genero?.trim()) {
      errors.push('El género es obligatorio');
    }
    
    // Fecha obligatoria en creación
    const fechaEstreno = estrenoData.fechaEstreno || estrenoData.fecha_estreno;
    if (!fechaEstreno) {
      errors.push('La fecha de estreno es obligatoria');
    } else {
      this.validateFechaEstreno(fechaEstreno, errors);
    }
  } else {
    // VALIDACIONES PARA ACTUALIZACIÓN (PUT)
    // Solo validar campos que se están enviando
    
    if (estrenoData.titulo !== undefined && !estrenoData.titulo?.trim()) {
      errors.push('El título no puede estar vacío');
    }
    
    if (estrenoData.sinopsis !== undefined && !estrenoData.sinopsis?.trim()) {
      errors.push('La sinopsis no puede estar vacía');
    }
    
    if (estrenoData.director !== undefined && !estrenoData.director?.trim()) {
      errors.push('El director no puede estar vacío');
    }
    
    if (estrenoData.genero !== undefined && !estrenoData.genero?.trim()) {
      errors.push('El género no puede estar vacío');
    }
    
    // Solo validar fecha si se está enviando
    const fechaEstreno = estrenoData.fechaEstreno || estrenoData.fecha_estreno;
    if (fechaEstreno !== undefined) {
      if (!fechaEstreno) {
        errors.push('La fecha de estreno no puede estar vacía');
      } else {
        this.validateFechaEstreno(fechaEstreno, errors);
      }
    }
  }
  
  // VALIDACIONES OPCIONALES (para ambos casos)
  
  // Validar URL del poster si se envía
  if (estrenoData.poster && !this.isValidUrl(estrenoData.poster) && !this.isValidAssetPath(estrenoData.poster)) {
    errors.push('El poster debe ser una URL válida o una ruta de assets válida');
  }
  
  // Validar trailer de YouTube si se envía
  if (estrenoData.trailer && !this.isValidYouTubeId(estrenoData.trailer)) {
    errors.push('El trailer debe ser un ID válido de YouTube (11 caracteres)');
  }
  
  // Validar array de actores si se envía
  if (estrenoData.actores !== undefined && !Array.isArray(estrenoData.actores)) {
    errors.push('Los actores deben ser un array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
  
  // ==================== MÉTODOS DE VALIDACIÓN AUXILIARES ====================
  static isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  
  static isValidAssetPath(path) {
    return typeof path === 'string' && 
           path.startsWith('assets/') && 
           (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg') || path.endsWith('.webp'));
  }
  
  static isValidYouTubeId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);
  }
}

module.exports = ComingSoon;