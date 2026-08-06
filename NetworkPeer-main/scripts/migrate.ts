import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { config } from "../src/config.js";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

async function runMigrations() {
  const client = new pg.Client({ connectionString: config.DATABASE_URL });
  await client.connect();
  await client.query(`SELECT pg_advisory_lock(hashtext('networkpeer:migrations'))`);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query(`SELECT filename FROM schema_migrations`);
    const applied = new Set(rows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      // Accept a UTF-8 BOM or whitespace before the marker so concurrent index
      // migrations cannot accidentally be wrapped in BEGIN/COMMIT.
      const nonTransactional = /^[\uFEFF \t\r\n]*-- @nontransactional(?:\r?\n|$)/.test(sql);
      // PostgreSQL requires each CREATE/DROP INDEX CONCURRENTLY command to be
      // its own query. Nontransactional migrations may opt into explicit
      // boundaries without trying to parse semicolons inside PL/pgSQL bodies.
      const statements = nonTransactional
        ? sql.split(/^-- @statement[ \t]*\r?$/m).filter((statement) => statement.trim())
        : [sql];
      // eslint-disable-next-line no-console
      console.log(`[migrate] applying ${file}`);
      if (!nonTransactional) await client.query("BEGIN");
      try {
        for (const statement of statements) {
          await client.query(statement);
        }
        await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
        if (!nonTransactional) await client.query("COMMIT");
      } catch (err) {
        if (!nonTransactional) await client.query("ROLLBACK");
        throw new Error(`Migration failed: ${file}`, { cause: err });
      }
    }

    // eslint-disable-next-line no-console
    console.log("[migrate] done");
  } finally {
    await client.query(`SELECT pg_advisory_unlock(hashtext('networkpeer:migrations'))`);
    await client.end();
  }
}

runMigrations().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[migrate] error", err);
  process.exit(1);
});
