# GENESIS TALK — Release Gate v0.8

A release is eligible for production only when all applicable gates have evidence.

| Gate | Required evidence | Current state |
|---|---|---|
| Source integrity | clean/reproducible build inputs + lockfile | PENDING EXECUTION |
| Lint/typecheck | lint + typecheck successful | PENDING EXECUTION |
| Unit/regression | unit + Genesis characterization probes | PENDING EXECUTION |
| DB | DB tests + migration collision/check + fresh-install migration | PENDING EXECUTION |
| Tenant/RLS | isolation tests against representative schema | PENDING EXECUTION |
| Integration | critical provider/integration tests | PENDING EXECUTION |
| E2E/smoke | critical user journeys | PENDING EXECUTION |
| Build | production build succeeds | PENDING EXECUTION |
| Security | dependency/secrets/static checks + auth/RLS regression | PENDING EXECUTION |
| Capacity | workload/SLO-derived test where required | NOT YET DEFINED |
| Recovery | backup restore rehearsal + measured RTO/RPO evidence | PENDING |
| Rollback | release rollback rehearsal | PENDING |
| Observability | health/readiness/logging/alerts verified | PENDING |
| Ownership | runbook + release/incident owner | PENDING |

`Production-ready` MUST NOT be asserted while any mandatory gate is pending.
