// server/db/index.js : shared pg connection pool (works with Neon and local Postgres)
require('dotenv').config();
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is missing. Add it to server/.env');

// Neon needs SSL. Local Postgres usually doesn't.
const useSsl = /sslmode=require|neon\.tech/.test(url);

const pool = new Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

module.exports = pool;
