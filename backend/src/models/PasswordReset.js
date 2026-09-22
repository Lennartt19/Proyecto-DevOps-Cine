// src/models/PasswordReset.js
const { query } = require('../config/database');
const crypto = require('crypto');

class PasswordReset {
    
    /**
     * Crear un token de recuperación de contraseña
     */
    static async createToken(email, ipAddress = null, userAgent = null) {
        try {
            // Verificar que el usuario existe
            const userResult = await query(
                'SELECT id FROM usuarios WHERE email = $1 AND is_active = true',
                [email]
            );

            if (userResult.rows.length === 0) {
                throw new Error('Usuario no encontrado');
            }

            const usuario_id = userResult.rows[0].id;
            
            // Generar token único
            const token = crypto.randomBytes(32).toString('hex');
            
            // Token expira en 1 hora
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            // Invalidar tokens anteriores del usuario
            await query(
                'UPDATE password_reset_tokens SET used = true WHERE usuario_id = $1 AND used = false',
                [usuario_id]
            );

            // Crear nuevo token
            const result = await query(`
                INSERT INTO password_reset_tokens 
                (usuario_id, token, email, expires_at, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [usuario_id, token, email, expiresAt, ipAddress, userAgent]);

            return result.rows[0];

        } catch (error) {
            console.error('Error creando token de recuperación:', error);
            throw error;
        }
    }

    /**
     * Validar token de recuperación
     */
    static async validateToken(token) {
        try {
            const result = await query(`
                SELECT prt.*, u.email, u.nombre 
                FROM password_reset_tokens prt
                JOIN usuarios u ON prt.usuario_id = u.id
                WHERE prt.token = $1 
                AND prt.used = false 
                AND prt.expires_at > CURRENT_TIMESTAMP
                AND u.is_active = true
            `, [token]);

            return result.rows[0] || null;

        } catch (error) {
            console.error('Error validando token:', error);
            throw error;
        }
    }

    /**
     * Marcar token como usado
     */
    static async markTokenAsUsed(token, ipAddress = null) {
        try {
            const result = await query(`
                UPDATE password_reset_tokens 
                SET used = true, fecha_uso = CURRENT_TIMESTAMP, ip_address = $2
                WHERE token = $1
                RETURNING *
            `, [token, ipAddress]);

            return result.rows[0];

        } catch (error) {
            console.error('Error marcando token como usado:', error);
            throw error;
        }
    }

    /**
     * Limpiar tokens expirados
     */
    static async cleanExpiredTokens() {
        try {
            const result = await query('SELECT limpiar_tokens_expirados()');
            return result.rows[0].limpiar_tokens_expirados;

        } catch (error) {
            console.error('Error limpiando tokens expirados:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de recuperación de contraseñas
     */
    static async getStats() {
        try {
            const result = await query(`
                SELECT 
                    COUNT(*) as total_tokens,
                    COUNT(CASE WHEN used = true THEN 1 END) as tokens_usados,
                    COUNT(CASE WHEN used = false AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as tokens_activos,
                    COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as tokens_expirados
                FROM password_reset_tokens
            `);

            return result.rows[0];

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }
}

module.exports = PasswordReset;