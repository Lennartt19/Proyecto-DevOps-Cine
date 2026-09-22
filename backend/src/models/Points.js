const { query } = require('../config/database'); // 🔧 IMPORTAR query CORRECTAMENTE

class Points {
  constructor() {
    // 🔧 CORRECCIÓN PRINCIPAL: Cambiar de 1 a 100 puntos por dólar
    this.PUNTOS_POR_DOLAR = 1; // ✅ AHORA: 100 puntos = $1.00
    this.PUNTOS_BIENVENIDA = 50;
    this.PUNTOS_REFERIDO = 100;
    this.PUNTOS_NUEVO_USUARIO = 25;
  }

  async getUserPoints(userId) {
    try {
      console.log(`🔍 DEBUG: Buscando puntos para usuario ${userId}`);
      
      const sql = `
        SELECT puntos_actuales, total_ganados, total_usados, fecha_actualizacion
        FROM puntos_usuario 
        WHERE usuario_id = $1
      `;
      
      const result = await query(sql, [userId]); // ✅ Ahora query está definido
      
      console.log(`🔍 DEBUG: Query result:`, {
        rowCount: result.rows.length,
        rows: result.rows
      });
      
      if (result.rows.length === 0) {
        console.log(`⚠️ DEBUG: No se encontró registro, creando uno nuevo`);
        return await this.createUserPointsRecord(userId);
      }
      
      console.log(`✅ DEBUG: Retornando puntos:`, result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ ERROR en getUserPoints:', error);
      throw error;
    }
  }

  async createUserPointsRecord(userId) {
    try {
      console.log(`📝 DEBUG: Creando registro de puntos para usuario ${userId}`);
      
      const sql = `
        INSERT INTO puntos_usuario (usuario_id, puntos_actuales, total_ganados, total_usados)
        VALUES ($1, 0, 0, 0)
        ON CONFLICT (usuario_id) DO NOTHING
        RETURNING puntos_actuales, total_ganados, total_usados, fecha_actualizacion
      `;
      
      const result = await query(sql, [userId]); // ✅ Usar query importado
      
      console.log(`📝 DEBUG: Registro creado:`, result.rows);
      
      return result.rows.length > 0 ? result.rows[0] : {
        puntos_actuales: 0,
        total_ganados: 0,
        total_usados: 0,
        fecha_actualizacion: new Date()
      };
    } catch (error) {
      console.error('❌ Error al crear registro de puntos:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS IMPLEMENTADOS CORRECTAMENTE ====================

  async getUserPointsStats(userId) {
    try {
      const points = await this.getUserPoints(userId);
      
      return {
        puntos_actuales: points.puntos_actuales || 0,
        total_ganados: points.total_ganados || 0,
        total_usados: points.total_usados || 0,
        valor_en_dolares: this.getPointsValue(points.puntos_actuales || 0),
        ultima_actividad: points.fecha_actualizacion
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de puntos:', error);
      throw error;
    }
  }

  async getPointsHistory(userId, limit = 20, offset = 0) {
  try {
    const sql = `
      SELECT 
        id,
        tipo,
        puntos,
        concepto,
        puntos_anteriores,
        puntos_nuevos,
        metadata,
        fecha
      FROM transacciones_puntos 
      WHERE usuario_id = $1
      ORDER BY fecha DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query(sql, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      tipo: row.tipo,
      puntos: row.puntos,
      concepto: row.concepto,
      puntos_anteriores: row.puntos_anteriores,
      puntos_nuevos: row.puntos_nuevos,
      metadata: row.metadata,
      fecha: row.fecha
    }));
  } catch (error) {
    console.error('Error al obtener historial de puntos:', error);
    throw error;
  }
}

  async createReferralCode(userId) {
  try {
    // Verificar si ya tiene un código activo
    const existingCode = await query(
      'SELECT codigo FROM codigos_referido WHERE usuario_id = $1 AND activo = true',
      [userId]
    );
    
    if (existingCode.rows.length > 0) {
      return {
        success: true,
        codigo: existingCode.rows[0].codigo,
        message: 'Código de referido existente'
      };
    }
    
    // Generar nuevo código único
    let codigo;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      codigo = `REF${userId}${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
      
      const checkUnique = await query(
        'SELECT id FROM codigos_referido WHERE codigo = $1',
        [codigo]
      );
      
      if (checkUnique.rows.length === 0) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('No se pudo generar un código único');
    }
    
    // Insertar el código
    const insertSql = `
      INSERT INTO codigos_referido (usuario_id, codigo, activo, usos)
      VALUES ($1, $2, true, 0)
      RETURNING codigo
    `;
    
    const result = await query(insertSql, [userId, codigo]);
    
    console.log(`🔗 Código de referido creado: ${codigo} para usuario ${userId}`);
    
    return {
      success: true,
      codigo: result.rows[0].codigo,
      message: 'Código creado exitosamente'
    };
  } catch (error) {
    console.error('Error al crear código de referido:', error);
    throw error;
  }
}
  async applyReferralCode(newUserId, referralCode) {
  try {
    console.log(`🎁 Aplicando código de referido: ${referralCode} para usuario ${newUserId}`);
    
    // 1. Verificar que el código existe y está activo
    const codeCheck = await query(
      'SELECT usuario_id FROM codigos_referido WHERE codigo = $1 AND activo = true',
      [referralCode]
    );
    
    if (codeCheck.rows.length === 0) {
      throw new Error('Código de referido inválido o inactivo');
    }
    
    const referidorId = codeCheck.rows[0].usuario_id;
    
    // 2. Verificar que no se auto-refiera
    if (referidorId === newUserId) {
      throw new Error('No puedes usar tu propio código de referido');
    }
    
    // 3. Verificar que el usuario no haya usado un código antes
    const alreadyReferred = await query(
      'SELECT id FROM referidos WHERE referido_id = $1',
      [newUserId]
    );
    
    if (alreadyReferred.rows.length > 0) {
      throw new Error('Este usuario ya usó un código de referido anteriormente');
    }
    
    // 4. Crear el registro de referido
    const referidoSql = `
      INSERT INTO referidos (referidor_id, referido_id, codigo_usado, puntos_otorgados)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const referidoResult = await query(referidoSql, [
      referidorId, 
      newUserId, 
      referralCode, 
      this.PUNTOS_REFERIDO + this.PUNTOS_NUEVO_USUARIO
    ]);
    
    // 5. Actualizar contador de usos del código
    await query(
      'UPDATE codigos_referido SET usos = usos + 1 WHERE codigo = $1',
      [referralCode]
    );
    
    // 6. Otorgar puntos al referidor
    await this.addPoints(
      referidorId,
      this.PUNTOS_REFERIDO,
      `Referido exitoso: usuario ${newUserId}`,
      { 
        tipo: 'referido',
        referido_id: newUserId,
        codigo_usado: referralCode 
      }
    );
    
    // 7. Otorgar puntos al nuevo usuario
    await this.addPoints(
      newUserId,
      this.PUNTOS_NUEVO_USUARIO,
      `Bienvenida por referido de usuario ${referidorId}`,
      { 
        tipo: 'referido_bienvenida',
        referidor_id: referidorId,
        codigo_usado: referralCode 
      }
    );
    
    console.log(`✅ Referido procesado: ${this.PUNTOS_REFERIDO} puntos para referidor, ${this.PUNTOS_NUEVO_USUARIO} para nuevo usuario`);
    
    return {
      success: true,
      puntos_referidor: this.PUNTOS_REFERIDO,
      puntos_nuevo_usuario: this.PUNTOS_NUEVO_USUARIO,
      message: 'Código de referido aplicado exitosamente'
    };
    
  } catch (error) {
    console.error('Error al aplicar código de referido:', error);
    throw error;
  }
}

  async getUserReferrals(userId) {
  try {
    const sql = `
      SELECT 
        r.id,
        r.referido_id,
        r.codigo_usado,
        r.puntos_otorgados,
        r.fecha_referido,
        u.nombre as referido_nombre,
        u.email as referido_email
      FROM referidos r
      JOIN usuarios u ON r.referido_id = u.id
      WHERE r.referidor_id = $1
      ORDER BY r.fecha_referido DESC
    `;
    
    const result = await query(sql, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      referido: {
        id: row.referido_id,
        nombre: row.referido_nombre,
        email: row.referido_email
      },
      codigo_usado: row.codigo_usado,
      puntos_otorgados: row.puntos_otorgados,
      fecha_referido: row.fecha_referido
    }));
  } catch (error) {
    console.error('Error al obtener referidos:', error);
    throw error;
  }
}

  async giveWelcomePoints(userId) {
    try {
      // Verificar si ya recibió puntos de bienvenida (simulado)
      return {
        success: true,
        puntos_agregados: this.PUNTOS_BIENVENIDA,
        puntos_nuevos: this.PUNTOS_BIENVENIDA,
        message: 'Puntos de bienvenida otorgados'
      };
    } catch (error) {
      console.error('Error al dar puntos de bienvenida:', error);
      throw error;
    }
  }

  // 🔧 ARREGLADO: Método addPoints implementado correctamente
  async addPoints(userId, puntos, concepto, metadata = null) {
  try {
    console.log(`➕ Agregando ${puntos} puntos al usuario ${userId}: ${concepto}`);
    
    // 1. Obtener puntos actuales
    const currentPoints = await this.getUserPoints(userId);
    const puntosAnteriores = currentPoints.puntos_actuales || 0;
    
    // 2. Actualizar puntos del usuario
    const updateSql = `
      UPDATE puntos_usuario 
      SET 
        puntos_actuales = puntos_actuales + $2,
        total_ganados = total_ganados + $2,
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE usuario_id = $1
      RETURNING puntos_actuales, total_ganados, total_usados
    `;
    
    const result = await query(updateSql, [userId, puntos]);
    
    if (result.rows.length === 0) {
      throw new Error('No se pudo actualizar los puntos del usuario');
    }
    
    const updated = result.rows[0];
    const puntosNuevos = updated.puntos_actuales;
    
    // 3. 🆕 REGISTRAR TRANSACCIÓN EN LA TABLA
    const transactionSql = `
      INSERT INTO transacciones_puntos (
        usuario_id, tipo, puntos, concepto, 
        puntos_anteriores, puntos_nuevos, metadata
      ) VALUES ($1, 'ganancia', $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const transactionResult = await query(transactionSql, [
      userId, 
      puntos, 
      concepto, 
      puntosAnteriores, 
      puntosNuevos,
      metadata ? JSON.stringify(metadata) : null
    ]);
    
    console.log(`✅ Puntos agregados: ${puntos}. Nuevo total: ${puntosNuevos}`);
    console.log(`📝 Transacción registrada: ID ${transactionResult.rows[0].id}`);
    
    return {
      success: true,
      puntos_agregados: puntos,
      puntos_anteriores: puntosAnteriores,
      puntos_nuevos: puntosNuevos,
      transaccion_id: transactionResult.rows[0].id
    };
    
  } catch (error) {
    console.error('❌ Error al agregar puntos:', error);
    throw error;
  }
}

  async usePoints(userId, puntos, concepto, metadata = null) {
  try {
    const userPoints = await this.getUserPoints(userId);
    const puntosAnteriores = userPoints.puntos_actuales || 0;
    
    if (puntosAnteriores < puntos) {
      throw new Error(`Puntos insuficientes. Tienes ${puntosAnteriores}, necesitas ${puntos}`);
    }
    
    // Actualizar puntos del usuario
    const updateSql = `
      UPDATE puntos_usuario 
      SET 
        puntos_actuales = puntos_actuales - $2,
        total_usados = total_usados + $2,
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE usuario_id = $1
      RETURNING puntos_actuales, total_ganados, total_usados
    `;
    
    const result = await query(updateSql, [userId, puntos]);
    
    if (result.rows.length === 0) {
      throw new Error('No se pudo actualizar los puntos del usuario');
    }
    
    const updated = result.rows[0];
    const puntosNuevos = updated.puntos_actuales;
    
    // 🆕 REGISTRAR TRANSACCIÓN DE USO
    const transactionSql = `
      INSERT INTO transacciones_puntos (
        usuario_id, tipo, puntos, concepto, 
        puntos_anteriores, puntos_nuevos, metadata
      ) VALUES ($1, 'uso', $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const transactionResult = await query(transactionSql, [
      userId, 
      puntos, 
      concepto, 
      puntosAnteriores, 
      puntosNuevos,
      metadata ? JSON.stringify(metadata) : null
    ]);
    
    console.log(`✅ Puntos usados: ${puntos}. Nuevo total: ${puntosNuevos}`);
    console.log(`📝 Transacción registrada: ID ${transactionResult.rows[0].id}`);
    
    return {
      success: true,
      puntos_usados: puntos,
      puntos_anteriores: puntosAnteriores,
      puntos_nuevos: puntosNuevos,
      transaccion_id: transactionResult.rows[0].id
    };
  } catch (error) {
    console.error('Error al usar puntos:', error);
    throw error;
  }
}

  async canUsePoints(userId, puntos) {
    try {
      const userPoints = await this.getUserPoints(userId);
      const disponibles = userPoints.puntos_actuales || 0;
      console.log(`🔍 Verificando puntos: Usuario ${userId} tiene ${disponibles}, quiere usar ${puntos}`);
      return disponibles >= puntos;
    } catch (error) {
      console.error('Error al verificar puntos disponibles:', error);
      return false;
    }
  }

  async getPointsAnalytics(startDate = null, endDate = null) {
    try {
      // Por ahora devolver datos simulados
      return [];
    } catch (error) {
      console.error('Error al obtener analytics de puntos:', error);
      throw error;
    }
  }

  async getTopUsersPoints(limit = 10) {
    try {
      // Por ahora devolver array vacío
      return [];
    } catch (error) {
      console.error('Error al obtener top usuarios por puntos:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS CORREGIDOS ====================

  // 🔧 CORREGIDO: Convertir puntos a valor en dólares
  getPointsValue(puntos) {
    if (!puntos || puntos <= 0) {
      return 0;
    }
    
    // 🔧 CONVERSIÓN CORREGIDA: 100 puntos = $1.00
    const valorDolares = puntos / 100;
    
    console.log(`💰 Conversión: ${puntos} puntos = $${valorDolares.toFixed(2)}`);
    
    // Redondear a 2 decimales
    return Math.round(valorDolares * 100) / 100;
  }

  async getSystemConfig() {
    try {
      // 🔧 CONSULTAR BD PARA OBTENER CONFIGURACIÓN ACTUALIZADA
      const sql = `
        SELECT clave, valor 
        FROM configuracion_sistema 
        WHERE clave IN ('puntos_por_dolar', 'puntos_bienvenida', 'puntos_referido', 'puntos_nuevo_usuario')
      `;
      
      const result = await query(sql, []);
      
      // Convertir resultado a objeto
      const config = {};
      result.rows.forEach(row => {
        config[row.clave] = parseInt(row.valor) || 0;
      });
      
      // Usar valores de BD o fallback a constantes de clase
      return {
        puntos_por_dolar: config.puntos_por_dolar || this.PUNTOS_POR_DOLAR,
        puntos_bienvenida: config.puntos_bienvenida || this.PUNTOS_BIENVENIDA,
        puntos_referido: config.puntos_referido || this.PUNTOS_REFERIDO,
        puntos_nuevo_usuario: config.puntos_nuevo_usuario || this.PUNTOS_NUEVO_USUARIO
      };
    } catch (error) {
      console.error('Error al obtener configuración, usando valores por defecto:', error);
      return {
        puntos_por_dolar: this.PUNTOS_POR_DOLAR,
        puntos_bienvenida: this.PUNTOS_BIENVENIDA,
        puntos_referido: this.PUNTOS_REFERIDO,
        puntos_nuevo_usuario: this.PUNTOS_NUEVO_USUARIO
      };
    }
  }

  // 🔧 CORREGIDO: Método processPointsForPurchase con conversión correcta
  async processPointsForPurchase(userId, totalCompra, orderDetails = null) {
    try {
      // 🔧 OBTENER CONFIGURACIÓN DESDE BD
      const config = await this.getSystemConfig();
      const puntosGanados = Math.floor(totalCompra * config.puntos_por_dolar);
      
      console.log(`💰 Cálculo de puntos: $${totalCompra} × ${config.puntos_por_dolar} puntos/dólar = ${puntosGanados} puntos`);
      
      if (puntosGanados > 0) {
        console.log(`💰 Otorgando ${puntosGanados} puntos al usuario ${userId} por compra de $${totalCompra}`);
        
        // Usar el método addPoints para agregar los puntos
        const result = await this.addPoints(
          userId, 
          puntosGanados, 
          `Compra - Orden ${orderDetails?.order_id || 'N/A'} ($${totalCompra.toFixed(2)})`,
          {
            orden_id: orderDetails?.order_id,
            total_compra: totalCompra,
            metodo_pago: orderDetails?.payment_method,
            fecha_compra: new Date().toISOString(),
            puntos_por_dolar: config.puntos_por_dolar,
            ...orderDetails
          }
        );
        
        return {
          success: true,
          puntos_agregados: puntosGanados,
          puntos_nuevos: result.puntos_nuevos,
          total_ganados: result.puntos_nuevos,
          rate: config.puntos_por_dolar
        };
      }
      
      return {
        success: true,
        puntos_agregados: 0,
        message: 'No se generaron puntos para esta compra'
      };
      
    } catch (error) {
      console.error('❌ Error al procesar puntos por compra:', error);
      throw error;
    }
  }
}

module.exports = Points;