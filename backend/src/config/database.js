const { Pool } = require('pg');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  // Priorizar DATABASE_URL si existe (para Railway)
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  
  // Fallback a variables individuales (para desarrollo local)
  ...(!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL && {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'parkyfilms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  }),
  
  // Configuraciones adicionales
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // SSL en producción (Railway/AKS con Postgres gestionado lo exige).
  // Excepción: prod LOCAL sin HTTPS ni certs -> DB_SSL=false en el .env.
  // (El Postgres del compose local no tiene SSL; forzarlo rompería la conexión.)
  ssl: (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false')
    ? { rejectUnauthorized: false }
    : false
});

// Función para conectar a la base de datos
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    
    // Detectar si está usando DATABASE_URL o variables individuales
    if (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL) {
      console.log('🌐 Conectado usando DATABASE_URL (Railway/Cloud)');
    } else {
      console.log(`🏠 Conectado usando variables individuales (Local)`);
      console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`   Database: ${process.env.DB_NAME}`);
    }
    
    // Probar la conexión
    const result = await client.query('SELECT NOW(), current_database()');
    console.log(`📅 Servidor de BD: ${result.rows[0].now}`);
    console.log(`📊 Base de datos activa: ${result.rows[0].current_database}`);
    
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    throw error;
  }
};

// Función para ejecutar queries
const query = async (text, params) => {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Query ejecutado en ${duration}ms:`, text.slice(0, 50) + '...');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error en query:', error.message);
    console.error('Query:', text);
    console.error('Parámetros:', params);
    throw error;
  }
};

// Función para transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Función para cerrar la conexión (útil para tests)
const closeDB = async () => {
  await pool.end();
  console.log('🔒 Conexión a PostgreSQL cerrada');
};

// Event listeners para debugging
pool.on('connect', () => {
  console.log('🔗 Nueva conexión establecida al pool de PostgreSQL');
});

pool.on('error', (err) => {
  console.error('💥 Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

module.exports = {
  pool,
  query,
  connectDB,
  transaction,
  closeDB
};