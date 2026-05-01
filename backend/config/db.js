const { Pool } = require('pg');
require('dotenv').config();

// Singleton pool — reuse across all requires
if (!global._pgPool) {
  global._pgPool = new Pool(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'agri_marketplace_db',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
        }
  );

  global._pgPool.on('error', (err) => {
    console.error('Unexpected DB pool error', err);
  });
}

module.exports = global._pgPool;
