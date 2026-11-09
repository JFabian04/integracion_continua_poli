import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tareas_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL] Error inesperado en el cliente inactivo del pool:', err);
});

/**
 * Ejecuta una consulta SQL en la base de datos a través del pool
 * @param {string} text - Consulta SQL parametrizada
 * @param {Array} params - Parámetros de la consulta
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Registro opcional en depuración
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.log('[PostgreSQL Query]', { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}

/**
 * Consulta de verificación de estado y versión exacta de PostgreSQL
 */
export async function checkHealth(dbPool = pool) {
  const result = await dbPool.query('SELECT current_database() AS nombre_bd, version() AS version_postgresql;');
  return result.rows[0];
}

