// server/db/run-sql.js : runs one or more .sql files against DATABASE_URL
// usage: node db/run-sql.js db/schema.sql db/seed.sql
const fs = require('fs');
const path = require('path');
const pool = require('./index');

(async () => {
  try {
    for (const file of process.argv.slice(2)) {
      const sql = fs.readFileSync(path.resolve(file), 'utf8');
      await pool.query(sql);
      console.log('ran', file);
    }
  } catch (err) {
    console.error('SQL error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
