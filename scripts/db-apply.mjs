// Apply schema to Neon. Usage:
//   node scripts/db-apply.mjs <file.sql> [more.sql ...]
// Runs each file as a single multi-statement query (simple query protocol),
// so DO blocks and $$-quoted functions are preserved. Loads .env.local.
import { readFileSync } from "node:fs";
import pg from "pg";

// Minimal .env.local loader (no extra dep).
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("No SQL files given.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected to Neon.");
for (const f of files) {
  const sql = readFileSync(f, "utf8");
  process.stdout.write(`Applying ${f} ... `);
  await client.query(sql);
  console.log("ok");
}
await client.end();
console.log("Done.");
