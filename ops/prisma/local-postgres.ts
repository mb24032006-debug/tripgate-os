// Zero-Docker local Postgres for dev and testing — mirrors production's engine exactly (see
// prisma/schema.prisma's datasource) without requiring a Docker install or a cloud account just to
// run `npm run dev`. Real Postgres binaries (via the `embedded-postgres` package), not a mock/shim.
//
// Run `npm run pg:local:start` in its own terminal and leave it running (like `npm run dev`
// itself) — the underlying Postgres process is a child of THIS script and stops when this script
// does. Data persists in .pgdata/ (gitignored) across restarts; delete that folder for a clean slate.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, readFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".pgdata");
const PORT = 5433; // deliberately not 5432 — avoids colliding with any Postgres already installed/running on this machine
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "tripgate";

export const LOCAL_DATABASE_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}`;

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  port: PORT,
  user: USER,
  password: PASSWORD,
  persistent: true,
  // Without an explicit encoding, initdb on Windows derives it from the OS codepage (e.g. WIN1252)
  // instead of UTF-8 — the seed data's French text and "★" ratings then fail to insert at all.
  // "C" locale + UTF8 encoding is the standard portable combination (avoids depending on a specific
  // locale being installed on the machine running this).
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

async function start() {
  const alreadyInitialised = existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (!alreadyInitialised) {
    console.log(`Initialising Postgres data directory at ${DATA_DIR} ...`);
    await pg.initialise();
  }
  await pg.start();
  if (!alreadyInitialised) {
    await pg.createDatabase(DATABASE);
    console.log(`Created database "${DATABASE}".`);
  }
  console.log(`\nLocal Postgres is ready:\n  ${LOCAL_DATABASE_URL}\n`);
  console.log("Leave this running. Ctrl+C to stop it cleanly.");
  await new Promise(() => {}); // keep this process (and its Postgres child) alive until interrupted
}

// A fresh invocation of this script has no in-memory handle on an already-running instance's child
// process (that handle only exists inside the original `start` script) — so this reads the PID
// Postgres itself records on disk (the same file `pg_ctl stop` reads) rather than depending on
// embedded-postgres's own in-process state.
function stop() {
  const pidFile = path.join(DATA_DIR, "postmaster.pid");
  if (!existsSync(pidFile)) {
    console.log("No running local Postgres found (no postmaster.pid).");
    return;
  }
  const pid = Number(readFileSync(pidFile, "utf-8").split("\n")[0].trim());
  if (!pid) {
    console.error("Could not read a PID from postmaster.pid.");
    process.exitCode = 1;
    return;
  }
  console.log(`Stopping local Postgres (pid ${pid}) ...`);
  process.kill(pid, "SIGINT");
}

const cmd = process.argv[2];
if (cmd === "start") {
  start().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (cmd === "stop") {
  stop();
} else {
  console.error("Usage: tsx prisma/local-postgres.ts <start|stop>");
  process.exit(1);
}
