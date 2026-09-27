// Integration tests use an isolated local PostgreSQL cluster and a controllable clock.
// No live database credentials or student accounts are used.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";
import console from "node:console";

const dir = mkdtempSync(join(tmpdir(), "angel-db-"));
const pgdata = join(dir, "pgdata");
const run = (bin, args) =>
  execFileSync(bin, args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
let started = false;
try {
  run("initdb", ["-D", pgdata, "-A", "trust", "--no-locale"]);
  run("pg_ctl", [
    "-D",
    pgdata,
    "-l",
    join(dir, "postgres.log"),
    "-o",
    `-k ${dir} -c listen_addresses=''`,
    "start",
  ]);
  started = true;
  const psql = (args) =>
    run("psql", ["-h", dir, "-d", "postgres", "-v", "ON_ERROR_STOP=1", ...args]);
  psql([
    "-c",
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA extensions; CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE FUNCTION public.investor_test_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('test.now', true), '')::timestamptz, '2026-09-13 12:00 America/New_York'::timestamptz) $$;`,
  ]);
  const schema = readFileSync(
    new URL("../supabase/investor-game.sql", import.meta.url),
    "utf8"
  ).replace(/\bnow\(\)/g, "public.investor_test_now()");
  const schemaFile = join(dir, "schema.sql");
  writeFileSync(schemaFile, schema);
  psql(["-f", schemaFile]);
  // Applying the upgrade twice must preserve data and work without function dependency errors.
  psql(["-f", schemaFile]);
  psql(["-f", fileURLToPath(new URL("../tests/sql/investor-game.sql", import.meta.url))]);
  console.log("Investor game database integration checks passed (isolated PostgreSQL).");
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) run("pg_ctl", ["-D", pgdata, "-m", "immediate", "stop"]);
  rmSync(dir, { recursive: true, force: true });
}
