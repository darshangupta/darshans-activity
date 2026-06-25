import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const schema = readFileSync(join(process.cwd(), 'lib/schema.sql'), 'utf-8');
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log('Schema applied.');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
