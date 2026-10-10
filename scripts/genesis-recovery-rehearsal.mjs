/** Isolated PostgreSQL recovery rehearsal; never connects to the installed DB. */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";

const root = resolve(import.meta.dirname, "..");
const runId = randomUUID();
const container = `genesis-recovery-${runId}`;
const directory = join(root, ".runtime", "recovery", runId);
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const kit = join(root, "hostgator-setup-kit");
mkdirSync(directory, { recursive: true, mode: 0o700 });
const results = [];
let created = false;
function command(binary, args, input, expected = 0) {
  const result = spawnSync(binary, args, { input, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error || (expected === 0 ? result.status !== 0 : result.status === 0)) {
    throw new Error(
      `${binary} ${args[0]} did not meet exit contract: ${result.error?.message || result.stderr?.slice(-1600)}`,
    );
  }
  return result.stdout.trim();
}
function sql(database, query, expected = 0) {
  return command(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "--single-transaction",
    ],
    query,
    expected,
  );
}
function verify(dump, expected = 0, extra = []) {
  return command(python, [join(kit, "recovery.py"), "verify", dump, ...extra], undefined, expected);
}
function check(name, fn) {
  const start = performance.now();
  fn();
  results.push({ name, status: "PASS", elapsed_ms: Math.round(performance.now() - start) });
}
function equal(actual, expected) {
  if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
}
try {
  command("docker", [
    "run",
    "-d",
    "--name",
    container,
    "--label",
    `genesis.recovery=${runId}`,
    "--network",
    "none",
    "--memory",
    "384m",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,size=256m",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:17-alpine",
    "-c",
    "shared_buffers=16MB",
    "-c",
    "max_connections=20",
  ]);
  created = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const probe = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], {
      stdio: "ignore",
    });
    if (probe.status === 0) {
      ready = true;
      break;
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  if (!ready) throw new Error("Isolated PostgreSQL did not start");
  sql(
    "postgres",
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  command("docker", ["exec", container, "createdb", "-U", "postgres", "source"]);
  command("docker", ["exec", container, "createdb", "-U", "postgres", "target"]);
  sql(
    "source",
    `
    create schema auth; create schema storage;
    create table auth.users(id int primary key); insert into auth.users values(1);
    create table storage.objects(id int primary key); insert into storage.objects values(1);
    create table public.audit_logs(id int primary key, organization_id int not null, detail text);
    insert into public.audit_logs values (1, 10, 'fixture'), (2, 20, 'fixture');
    alter table public.audit_logs enable row level security;
    create policy tenant on public.audit_logs to authenticated using (organization_id=10);
    grant usage on schema public to anon, authenticated, service_role;
    grant select on public.audit_logs to authenticated, service_role;
    revoke delete on public.audit_logs from service_role;
    create function public.restricted() returns int language sql security definer set search_path=public as 'select 42';
    revoke all on function public.restricted() from public, anon;
    grant execute on function public.restricted() to authenticated;
    create table public.channel_sessions(id int primary key);
    alter default privileges for role postgres in schema public revoke execute on functions from public;
  `,
  );
  const catalogQuery = readFileSync(join(kit, "recovery-catalog.sql"), "utf8");
  const dump = join(directory, "db-fixture.sql.gz");
  let sourceDump;
  check("backup-preserves-owners-and-privileges", () => {
    sourceDump = command("docker", [
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "source",
      "--clean",
      "--if-exists",
    ]);
    writeFileSync(dump, gzipSync(sourceDump), { mode: 0o600 });
    writeFileSync(join(directory, "db-fixture.catalog.json"), sql("source", catalogQuery), {
      mode: 0o600,
    });
    command(python, [join(kit, "recovery.py"), "create", dump]);
    equal(verify(dump), "17");
  });
  const checks = readFileSync(join(directory, "db-fixture.checks.sql"), "utf8");
  check("restore-counts-schema-rls-acl-in-one-transaction", () => {
    sql("target", sourceDump + "\n" + checks);
    equal(sql("target", "select count(*) from public.audit_logs;"), "2");
    equal(
      sql("target", "select has_function_privilege('anon','public.restricted()','execute');"),
      "f",
    );
    equal(
      sql("target", "select has_table_privilege('service_role','public.audit_logs','delete');"),
      "f",
    );
    equal(sql("target", "set role authenticated; select count(*) from public.audit_logs;"), "1");
    equal(sql("target", "select count(*) from auth.users;"), "1");
    equal(sql("target", catalogQuery), sql("source", catalogQuery));
  });
  check("sql-error-rolls-back-the-whole-restore", () => {
    sql("target", "insert into public.audit_logs values(3,10,'keep');");
    sql("target", sourceDump + "\nselect missing_column from public.audit_logs;\n" + checks, 1);
    equal(sql("target", "select count(*) from public.audit_logs;"), "3");
  });
  check("permission-drift-rolls-back", () => {
    sql(
      "target",
      sourceDump + "\ngrant execute on function public.restricted() to anon;\n" + checks,
      1,
    );
    equal(
      sql("target", "select has_function_privilege('anon','public.restricted()','execute');"),
      "f",
    );
    equal(sql("target", "select count(*) from public.audit_logs;"), "3");
  });
  check("missing-row-rolls-back", () => {
    sql("target", sourceDump + "\ndelete from public.audit_logs where id=2;\n" + checks, 1);
    equal(sql("target", "select count(*) from public.audit_logs;"), "3");
  });
  check("missing-storage-rejected-before-database", () =>
    verify(dump, 1, ["--storage-required", "1"]),
  );
  check("postgres-major-mismatch-rejected", () => verify(dump, 1, ["--major", "15"]));
  check("corrupted-archive-rejected", () => {
    const original = readFileSync(dump);
    writeFileSync(dump, Buffer.concat([original, Buffer.from("corruption")]));
    verify(dump, 1);
    writeFileSync(dump, original);
  });
  check("incomplete-channel-backup-rejected", () => {
    command(
      python,
      [join(kit, "recovery.py"), "create", dump, "--sessions-required", "1"],
      undefined,
      1,
    );
  });
  check("legacy-dump-without-manifest-rejected", () => {
    const legacy = join(directory, "db-legacy.sql.gz");
    writeFileSync(legacy, gzipSync(gunzipSync(readFileSync(dump))));
    verify(legacy, 1);
    rmSync(legacy);
  });
  const report = {
    format: 1,
    environment: "isolated-postgres17-network-none",
    fixture: "minimal-security-contract",
    source_sha: command("git", ["rev-parse", "HEAD"]),
    working_tree_dirty: Boolean(command("git", ["status", "--porcelain"])),
    limits:
      "Does not prove production data volume, managed Supabase compatibility, pairing or external Storage restoration.",
    results,
    success: true,
  };
  const output = process.env.RECOVERY_REPORT || join(directory, "result.json");
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
} finally {
  if (created) {
    const owner = command("docker", [
      "inspect",
      "--format",
      '{{index .Config.Labels "genesis.recovery"}}',
      container,
    ]);
    if (owner !== runId) throw new Error("Cleanup refused: container ownership changed");
    command("docker", ["rm", "-f", container]);
  }
}
