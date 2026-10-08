import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle postgres client', err);
  });
}

export const query = (text, params) => {
  if (!pool) {
    throw new Error('DATABASE_URL wajib diatur di .env');
  }
  return pool.query(text, params);
};
