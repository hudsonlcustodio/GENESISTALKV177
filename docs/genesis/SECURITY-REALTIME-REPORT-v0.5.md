# GENESIS TALK — Security, Support & Realtime Audit v0.5

## Escopo
GEN-013..GEN-023: side-effect safety, idempotência, realtime/auth, refetch,
support read-only, cross-tab support context, RLS e LGPD.

## Resultado

| Invariante | Estado | superfícies relevantes (top 30) |
|---|---|---:|
| GEN-013 provider recheck | Evidência estática encontrada | 30 |
| GEN-014 meet send safety | Evidência estática encontrada | 30 |
| GEN-015 realtime auth | Evidência estática encontrada | 30 |
| GEN-016 refetch clock | Evidência estática encontrada | 30 |
| GEN-017 support readonly unread | Evidência estática encontrada | 30 |
| GEN-018 support reserved queries | Evidência estática encontrada | 30 |
| GEN-019 support cross-tab | Evidência estática encontrada | 30 |
| GEN-020 RLS hardening | Evidência estática encontrada | 30 |
| GEN-021 LGPD hardening | Evidência estática encontrada | 30 |
| GEN-022 AI draft anonymization | Evidência estática encontrada | 30 |
| GEN-023 CRM task anonymization | Evidência estática encontrada | 30 |

## Probes preservados
- `impersonate-button.test.tsx`
- `inbox-consultas-permissao.test.tsx`
- `mark-read-permissao.test.tsx`
- `onboarding-suporte.test.ts`
- `realtime-aguarda-auth.test.tsx`
- `refetch-seguranca-relogio.test.tsx`

## Contrato criado
`tests/genesis-characterization/security-realtime.contract.ts`

## Decisão de integração
Não copiar RLS, auth ou realtime antigos por cima da baseline moderna apenas porque
existiam no Aurum. A implementação atual permanece source-of-truth técnica.
Os invariantes Aurum passam a ser requisitos de regressão Genesis.

Para qualquer invariante sem evidência suficiente, o estado é GAP — não falha.
Para qualquer invariante com ocorrência textual, o estado é evidência estática —
não `passed` em runtime.

## Segurança
Nenhuma migration/RLS foi alterada nesta fase. Alterações de autorização e
anonimização exigem prova de schema/ownership atual antes de patch.

## Gate
- GATE-SECURITY-CONTRACT: passed
- GATE-SECURITY-RUNTIME: pending
- GATE-RLS-MIGRATION: not-started
