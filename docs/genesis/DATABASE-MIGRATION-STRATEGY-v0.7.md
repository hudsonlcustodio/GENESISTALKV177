# Database Migration Strategy v0.7
## Fresh install
Use somente a cadeia de migrations da baseline GENESIS atual. Não reaplique o histórico Aurum.
## Upgrade Aurum existente
Backup imutável → fingerprint do schema/ledger → clone descartável → bridge aditiva → backfill/validação → testes RLS/tenant e invariantes → restore rehearsal → rollout.
Não marque migration upstream como aplicada sem provar pós-condição. Prefira additive migration e janela de compatibilidade antes de remover/renomear legado.


## SUPERSEDED FOR FRESH SELF-HOST BY v0.13
The current upstream MANIFEST establishes `supabase/baseline.sql` as the supported fresh-install schema path. Historical migrations remain the evolution ledger. Aurum upgrades still require a real-schema bridge.
