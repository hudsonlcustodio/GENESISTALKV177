/** Focused DB checks on Windows/Linux, using the canonical harness prelude. */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const id = randomUUID(),
  name = `genesis-db-check-${id}`;
function run(binary, args, input) {
  const r = spawnSync(binary, args, {
    input,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
  });
  if (r.status !== 0)
    throw new Error(r.error?.message || r.stderr?.slice(-2400) || `exit ${r.status}`);
  return r.stdout;
}
let created = false;
try {
  run("docker", [
    "run",
    "-d",
    "--name",
    name,
    "--label",
    `genesis.dbcheck=${id}`,
    "--network",
    "none",
    "--memory",
    "512m",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,size=512m",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "pgvector/pgvector:pg17",
    "-c",
    "shared_buffers=16MB",
    "-c",
    "max_connections=20",
  ]);
  created = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (
      spawnSync(
        "docker",
        ["exec", name, "psql", "-h", "127.0.0.1", "-U", "postgres", "-c", "select 1"],
        { stdio: "ignore" },
      ).status === 0
    ) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("PostgreSQL did not become ready");
  run("docker", ["exec", name, "createdb", "-U", "postgres", "inv_baseline"]);
  const script = readFileSync(resolve(root, "scripts/test-db.sh"), "utf8").replace(/\r\n/g, "\n");
  const prelude = script
    .split('echo "==> prelude:')[1]
    .split("psql_install <<'SQL'\n")[1]
    .split("\nSQL\n")[0];
  const args = [
    "exec",
    "-i",
    name,
    "psql",
    "-U",
    "postgres",
    "-d",
    "inv_baseline",
    "-X",
    "-q",
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    "-",
  ];
  run("docker", args, prelude);
  // Match Linux checkout bytes; dollar-quoted playbooks have content hashes.
  const baseline = readFileSync(resolve(root, "supabase/baseline.sql"), "utf8").replace(
    /\r\n/g,
    "\n",
  );
  run("docker", args, baseline);
  console.log("PASS: baseline install");
  run("docker", args, baseline);
  console.log("PASS: baseline update/idempotence");
  process.env.TEST_DB_CONTAINER = name;
  process.env.TEST_DB_TEMPLATE = "inv_baseline";
  const files = process.argv.slice(2);
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "-c",
      "vitest.db.config.ts",
      ...(files.length ? files : ["tests/invariants/genesis-supervisao-populacao.test.ts"]),
    ],
    { cwd: root, env: process.env, stdio: "inherit" },
  );
  if (result.status !== 0) process.exitCode = 1;
} finally {
  if (created) {
    const owner = run("docker", [
      "inspect",
      "--format",
      '{{index .Config.Labels "genesis.dbcheck"}}',
      name,
    ]).trim();
    if (owner !== id) throw new Error("Cleanup ownership mismatch");
    run("docker", ["rm", "-f", name]);
  }
}
