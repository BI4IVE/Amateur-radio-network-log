// 列出本库所有表及列，便于与正式站对比
const fs = require('fs');
const path = require('path');
const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const m = envText.match(/DATABASE_URL=([^\r\n]+)/);
if (!m) { console.error('NO DATABASE_URL'); process.exit(1); }
const url = m[1];
const { Pool } = require('pg');
const pool = new Pool({ connectionString: url });
(async () => {
  const res = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
  const tables = res.rows.map(r => r.table_name);
  const out = {};
  for (const t of tables) {
    const c = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    out[t] = c.rows.map(r => r.column_name + ':' + r.data_type);
  }
  console.log(JSON.stringify(out, null, 2));
  await pool.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
