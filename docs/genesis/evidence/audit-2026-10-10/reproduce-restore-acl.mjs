import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

fs.mkdirSync('.runtime/audit-2026-10-10', { recursive: true });

const task = `genesis-talk-acl-audit-${randomUUID()}`;
const docker = (args, input) => execFileSync('docker', args, {
  input, encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
});
let container;
try {
  container = docker(['run', '--detach', '--pull=never', '--name', task,
    '--label', `genesis.audit=${task}`, '--network=none', '--memory=192m',
    '--tmpfs', '/var/lib/postgresql/data:rw,size=96m',
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']).trim();
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'postgres']); ready = true; break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  if (!ready) throw new Error('Isolated database did not become ready');
  const sql = (db, text) => docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres',
    '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], text);
  sql('postgres', `CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS; CREATE DATABASE audit_source; CREATE DATABASE audit_target;`);
  const defaults = `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;`;
  sql('audit_source', `${defaults}
    CREATE TABLE public.api_audit_log (id integer PRIMARY KEY);
    ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;
    REVOKE UPDATE, DELETE, TRUNCATE ON public.api_audit_log FROM anon, authenticated, service_role;
    CREATE FUNCTION public.audit_service_only() RETURNS text LANGUAGE sql SECURITY DEFINER
    AS 'SELECT ''fictitious-sensitive-result''::text';
    REVOKE ALL ON FUNCTION public.audit_service_only() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.audit_service_only() TO service_role;`);
  const probe = `SELECT json_build_object(
    'anon_executes_restricted_function', has_function_privilege('anon', 'public.audit_service_only()', 'EXECUTE'),
    'service_role_can_delete_audit', has_table_privilege('service_role', 'public.api_audit_log', 'DELETE'));`;
  const before = JSON.parse(sql('audit_source', probe).trim());
  const dump = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'audit_source',
    '--no-owner', '--no-privileges']);
  sql('audit_target', defaults);
  sql('audit_target', dump);
  const after = JSON.parse(sql('audit_target', probe).trim());
  const result = { status: 'REPRODUCED', postgres: '17-alpine',
    scope: 'Minimal isolated PostgreSQL counterexample using the production backup flags; not a full application restore or exploit.',
    before, after,
    grantRevokeCommandsInDump: /^(?:GRANT|REVOKE) /m.test(dump),
    noExistingDatabaseOrVolumeAccessed: true };
  if (before.anon_executes_restricted_function || before.service_role_can_delete_audit ||
      !after.anon_executes_restricted_function || !after.service_role_can_delete_audit)
    throw new Error('Counterexample did not reproduce the predicted privilege change');
  fs.writeFileSync('.runtime/audit-2026-10-10/restore-acl-proof.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (container) {
    const owner = docker(['inspect', '--format', '{{ index .Config.Labels "genesis.audit" }}', container]).trim();
    if (owner !== task) throw new Error('Cleanup refused: container ownership mismatch');
    docker(['rm', '--force', container]);
    console.log('Removed only the isolated container created by this audit.');
  }
}
