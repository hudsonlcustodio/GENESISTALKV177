# GENESIS TALK — Human Handoff Audit v0.4

## Objetivo
Auditar GEN-001..GEN-006 contra a baseline moderna antes de copiar implementação antiga.

## Resultado estático
Foram encontrados **1487 arquivos** com sinais relacionados a atendimento/handoff/humano.

| Evidência | Estado |
|---|---|
| modern_escalation_module | EVIDÊNCIA ENCONTRADA |
| force_human_referenced | EVIDÊNCIA ENCONTRADA |
| human_handoff_referenced | EVIDÊNCIA ENCONTRADA |
| followup_human_blocking_referenced | EVIDÊNCIA ENCONTRADA |
| worker_human_guard_referenced | EVIDÊNCIA ENCONTRADA |

## Superfícies mais relevantes da baseline
- `supabase/baseline.sql` (score 756)
- `lib/i18n/dicionario.ts` (score 348)
- `lib/agent-engine/agent/inbound-turn.ts` (score 345)
- `HANDOFF-ia-360.md` (score 256)
- `CHANGELOG.md` (score 250)
- `lib/agent-engine/agent/human-handoff.ts` (score 210)
- `supabase/migrations/MANIFEST.md` (score 198)
- `docs/specs/15-spec-casos-humanos.md` (score 181)
- `docs/handoffs/HANDOFF-crm-vivo.md` (score 172)
- `docs/handoffs/BRIEFING-crm-vivo.md` (score 164)
- `docs/testing/user-journey-map.md` (score 155)
- `docs/superpowers/plans/2026-07-23-casos-humanos.md` (score 148)
- `lib/ai/handoff/orchestrator.ts` (score 128)
- `tests/unit/escalacao-retomada.test.ts` (score 118)
- `docs/stories/epics/EPIC-06-ai-rag.md` (score 116)
- `docs/prd/05-prd-ai-rag-handoff.md` (score 113)
- `supabase/migrations/20260918110000_0291_passagem_para_humano_tem_registro.sql` (score 107)
- `docs/specs/13-spec-governanca-atendimento.md` (score 105)
- `workers/ai-response-worker.ts` (score 104)
- `tests/unit/handoff-por-orcamento.test.ts` (score 103)
- `docs/specs/05-spec-ai-rag-handoff.md` (score 101)
- `tests/invariants/followup-silence-sweep.test.ts` (score 99)
- `docs/specs/14-contrato-governanca-agentes-externos.md` (score 97)
- `tests/unit/passagem-registro-e-dedup.test.ts` (score 94)
- `lib/escalacao/passagem.ts` (score 94)

## Contrato Genesis criado
`tests/genesis-characterization/human-handoff.contract.ts`

O contrato fixa seis invariantes proprietários sem substituir a arquitetura moderna.

## Decisão
**Não sobrescrever a implementação moderna de handoff com `lib/atendimento` antigo.**
A baseline atual já contém superfícies substanciais de escalada/handoff. O próximo
passo deve instrumentar/ligar os probes aos contratos atuais e implementar apenas
invariantes que falharem em teste executável.

## Limite da evidência
Busca estática confirma presença de mecanismos, não prova comportamento em runtime.
Nenhum item GEN-001..006 é marcado como `passed` apenas por ocorrência textual.

## Gate
- GATE-HANDOFF-CONTRACT: passed
- GATE-HANDOFF-RUNTIME: blocked/pending executable test environment
