# GENESIS TALK — Database Compatibility v0.7
- Baseline SQL migrations: **312**
- Aurum SQL migrations: **214**
- Normalizadas idênticas: **203**
- Aurum não idênticas: **1**
- Baseline não idênticas: **99**
- Faixa baseline: **[1, 20260921070000]**; Aurum: **[1, 20260910145420]**
## Decisão
Fresh install usa a cadeia atual. Upgrade de banco Aurum usa bridge baseada no schema real; o ZIP não prova o ledger aplicado em produção.
## Evidência
`docs/genesis/evidence/database-compat-v0.7.json` e `scripts/genesis-db-compat-preflight.sql`.
## Gates
DB inventory: passed. Fresh-install strategy: passed. Aurum bridge: pending schema fingerprint. Restore rehearsal: pending.
