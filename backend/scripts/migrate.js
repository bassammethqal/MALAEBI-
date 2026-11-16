require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const action = process.argv[2] || 'status';
  const ssl = process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' };

  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl
  });

  await c.connect();
  try {
    await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const dir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(dir).filter(x => x.endsWith('.sql')).sort();
    const done = (await c.query('SELECT name FROM schema_migrations')).rows.map(x => x.name);

    if (action === 'status') {
      for (const f of files) console.log(done.includes(f) ? 'APPLIED ' : 'PENDING ', f);
      return;
    }
    if (action !== 'up') throw new Error('Use status or up');

    for (const f of files) {
      if (done.includes(f)) continue;
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      await c.query('BEGIN');
      try {
        await c.query(sql);
        await c.query('INSERT INTO schema_migrations(name) VALUES($1)', [f]);
        await c.query('COMMIT');
        console.log('APPLIED', f);
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await c.end();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
