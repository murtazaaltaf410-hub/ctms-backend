import dotenv from 'dotenv';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, 'generated_test_users.sql');

async function run() {
  console.log('Reading SQL file:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql.split(';').filter((s) => s.trim() && !s.trim().startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    try {
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      await pool.query(stmt);
    } catch (e) {
      console.error(`Statement ${i + 1} failed:`, e.message);
    }
  }

  console.log('\n✓ SQL execution complete!');
  console.log('\nNew test credentials:');
  console.log('ADMIN:   test.admin@uoknorth.edu.in  |  Admin@1234');
  console.log('DRIVER:  test.driver@uoknorth.edu.in  |  Driver@1234');
  console.log('STUDENT: test.student@uoknorth.edu.in  |  Student@1234');

  try { await pool.end(); } catch {}
  process.exit(0);
}

run().catch((e) => {
  console.error('Script failed:', e.message);
  process.exit(1);
});
