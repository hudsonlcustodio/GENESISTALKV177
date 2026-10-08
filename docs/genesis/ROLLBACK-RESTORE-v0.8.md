# GENESIS TALK — Rollback & Restore Runbook v0.8

## Release rollback
1. Stop further rollout.
2. Preserve logs, release SHA/image and migration ledger.
3. Determine whether DB changes are backward-compatible.
4. Roll application back only if previous version can safely read current schema.
5. If not, use the migration-specific recovery plan; never improvise destructive down migrations.
6. Smoke critical paths and tenant isolation after rollback.

## Data recovery
1. Identify recovery point and business impact.
2. Restore backup into an isolated environment first.
3. Validate integrity, tenant ownership, auth references and critical row counts.
4. Measure actual restore time and data-loss window.
5. Promote only through an approved recovery procedure.

RTO/RPO are intentionally not invented here; business impact must define them.
