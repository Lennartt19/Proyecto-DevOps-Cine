const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Crear un nuevo usuario (tradicional)
  static async create(userData) {
    const {
      nombre,
      email,
      password,
      avatar,
      role = 'cliente'
    } = userData;

    // Encriptar la contraseña
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const sql = `
      INSERT INTO usuarios (
        nombre, email, password_hash, role, avatar, is_active
      ) 
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, nombre, email, role, avatar, is_active, fecha_registro
    `;

    const values = [nombre, email, password_hash, role, avatar];

    const result = await query(sql, values);
    return result.rows[0];
  }

  // 🆕 Crear usuario OAuth (sin contraseña)
  static async createOAuth(userData) {
    const {
      nombre,
      email,
      avatar,
      provider,
      providerId,
      role = 'cliente'
    } = userData;

    const sql = `
      INSERT INTO usuarios (
        nombre, email, role, avatar, is_active, oauth_provider, oauth_provider_id
      ) 
      VALUES ($1, $2, $3, $4, true, $5, $6)
      RETURNING id, nombre, email, role, avatar, is_active, fecha_registro, oauth_provider
    `;

    const values = [nombre, email, role, avatar, provider, providerId];

    const result = await query(sql, values);
    return result.rows[0];
  }

  // 🆕 Buscar usuario por OAuth provider
  static async findByOAuth(provider, providerId) {
    const sql = `
      SELECT id, nombre, email, role, avatar, is_active, fecha_registro, oauth_provider, oauth_provider_id
      FROM usuarios 
      WHERE oauth_provider = $1 AND oauth_provider_id = $2 AND is_active = true
    `;

    const result = await query(sql, [provider, providerId]);
    return result.rows[0];
  }

  // 🆕 Buscar usuario por email (incluyendo OAuth)
  static async findByEmailAll(email) {
    const sql = `
      SELECT id, nombre, email, password_hash, role, avatar, is_active, fecha_registro, oauth_provider, oauth_provider_id
      FROM usuarios 
      WHERE email = $1 AND is_active = true
    `;

    const result = await query(sql, [email]);
    return result.rows[0];
  }

  // Obtener todos los usuarios activos
  static async findAll() {
    const sql = `
      SELECT id, nombre, email, role, avatar, is_active, fecha_registro, fecha_actualizacion, oauth_provider
      FROM usuarios 
      WHERE is_active = true
      ORDER BY fecha_registro DESC
    `;

    const result = await query(sql);
    return result.rows;
  }

  // Buscar usuario por email (para login tradicional)
  static async findByEmail(email) {
    const sql = `
      SELECT id, nombre, email, password_hash, role, avatar, is_active, fecha_registro
      FROM usuarios 
      WHERE email = $1 AND is_active = true AND oauth_provider IS NULL
    `;

    const result = await query(sql, [email]);
    return result.rows[0];
  }

  // Buscar usuario por ID
  static async findById(id) {
    const sql = `
      SELECT id, nombre, email, role, avatar, is_active, fecha_registro, fecha_actualizacion, oauth_provider
      FROM usuarios 
      WHERE id = $1 AND is_active = true
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Verificar contraseña
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Actualizar usuario
  static async update(id, userData) {
    const {
      nombre,
      email,
      avatar,
      role
    } = userData;

    const sql = `
      UPDATE usuarios 
      SET nombre = $1, email = $2, avatar = $3, role = $4,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $5 AND is_active = true
      RETURNING id, nombre, email, role, avatar, is_active, fecha_registro, fecha_actualizacion, oauth_provider
    `;

    const values = [nombre, email, avatar, role, id];

    const result = await query(sql, values);
    return result.rows[0];
  }

  // Cambiar contraseña
  static async updatePassword(id, newPassword) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const sql = `
      UPDATE usuarios 
      SET password_hash = $1, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING id
    `;

    const result = await query(sql, [password_hash, id]);
    return result.rows[0];
  }

  // Desactivar usuario (soft delete)
  static async delete(id) {
    const sql = `
      UPDATE usuarios 
      SET is_active = false, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING id, nombre, email
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Verificar si email ya existe
  static async emailExists(email, excludeId = null) {
    let sql = 'SELECT id FROM usuarios WHERE email = $1 AND is_active = true';
    let values = [email];

    if (excludeId) {
      sql += ' AND id != $2';
      values.push(excludeId);
    }

    const result = await query(sql, values);
    return result.rows.length > 0;
  }

  // Obtener estadísticas de usuarios
  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_usuarios,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN role = 'cliente' THEN 1 END) as total_clientes,
        COUNT(CASE WHEN is_active = true THEN 1 END) as usuarios_activos,
        COUNT(CASE WHEN is_active = false THEN 1 END) as usuarios_inactivos,
        COUNT(CASE WHEN oauth_provider IS NOT NULL THEN 1 END) as usuarios_oauth,
        COUNT(CASE WHEN oauth_provider IS NULL THEN 1 END) as usuarios_tradicionales
      FROM usuarios
    `;

    const result = await query(sql);
    return result.rows[0];
  }

  // Cambiar solo el estado del usuario
  static async updateStatus(id, isActive) {
    const sql = `
      UPDATE usuarios 
      SET is_active = $1, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active IS NOT NULL
      RETURNING id, nombre, email, role, avatar, is_active, fecha_registro, fecha_actualizacion, oauth_provider
    `;

    const result = await query(sql, [isActive, id]);
    return result.rows[0];
  }

  // Búsqueda de usuarios
  static async search(searchTerm) {
    const sql = `
      SELECT id, nombre, email, role, avatar, is_active, fecha_registro, oauth_provider
      FROM usuarios   
      WHERE is_active = true 
      AND (nombre ILIKE $1 OR email ILIKE $1)
      ORDER BY nombre
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await query(sql, [searchPattern]);
    return result.rows;
  }
}

module.exports = User; 