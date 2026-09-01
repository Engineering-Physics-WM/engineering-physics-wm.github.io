import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}.`));
    });
  });

const sourceUrl = process.env.SUPABASE_DB_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  console.error("Set SUPABASE_DB_URL and DATABASE_URL in your local .env.local first.");
  process.exit(1);
}

const workDir = await mkdtemp(join(tmpdir(), "ep-supabase-neon-"));
const dumpPath = join(workDir, "public-data.dump");

try {
  console.log("Exporting public data from Supabase...");
  await run("pg_dump", [
    "--format=custom",
    "--data-only",
    "--no-owner",
    "--no-privileges",
    "--schema=public",
    "--file",
    dumpPath,
    "--dbname",
    sourceUrl,
  ]);

  console.log("Restoring public data into Neon...");
  await run("pg_restore", [
    "--data-only",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    targetUrl,
    dumpPath,
  ]);
  console.log("Supabase public data migration completed.");
} finally {
  await rm(workDir, { recursive: true, force: true });
}
