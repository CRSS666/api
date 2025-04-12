import fs from 'node:fs';
import path from 'node:path';

import { Client, types } from 'pg';

const sql = fs.readFileSync(
  path.join(__dirname, '..', 'db', 'initial.sql'),
  'utf-8'
);

types.setTypeParser(types.builtins.INT8, (value: string) => {
  return BigInt(value);
});

(async () => {
  const client = new Client({
    user: process.env.DB_USER!,
    host: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    password: process.env.DB_PASS!,
    port: parseInt(process.env.DB_PORT!)
  });
  await client.connect();
  await client.query(sql);
  await client.end();
})();
