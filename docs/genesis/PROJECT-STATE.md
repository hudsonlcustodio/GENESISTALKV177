# GENESIS TALK — PROJECT STATE

Status: FOUNDATION / compatibility discovery
Baseline técnica: snapshot DeskcommCRM fornecido pelo usuário em 2026-09-21.
Fonte de customizações: snapshot Aurum/Imobi Talk fornecido pelo usuário em 2026-09-21.
Marca-pai: GENESIS 360.

## Decisão vigente
O Deskcomm atual é a nova baseline. O código Aurum/Imobi não será usado como base;
será fonte de invariantes, customizações, testes e regras proprietárias.

## Branding
Nome do produto: GENESIS TALK.
Paleta obrigatória herdada de GENESIS 360:
- Verde Lima #7ED321
- Verde Take #00C853
- Azul Profundo #0B3D3A
- Azul Ciano #00B8D9
- Cinza Técnico #6B7280
- Branco #FFFFFF

A imagem de referência está em `docs/genesis/references/GENESIS-360-brand-reference.png`.

## Regra de migração
Não renomear cegamente tabelas, migrations, env vars, buckets, contratos ou
identificadores legados. Branding comercial e identificadores técnicos são
preocupações distintas.

## Gates
- GATE-TRUTH: passed
- GATE-FOUNDATION: in-progress
- GATE-CUSTOMIZATION-INVENTORY: in-progress
- GATE-IMPLEMENT: not-started
- GATE-PROD: blocked


## Compatibility audit v0.2
Command: `pnpm exec vitest run /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/edge-condition-options.test.ts /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/gatilho-falta.handler.test.ts /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/handoff-fernando-fiacao.test.ts /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/impersonate-button.test.tsx /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/inbox-consultas-permissao.test.tsx /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/mark-read-permissao.test.tsx /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/onboarding-suporte.test.ts /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/realtime-aguarda-auth.test.tsx /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/refetch-seguranca-relogio.test.tsx /mnt/data/genesis_talk_phase1/GENESIS-TALK/tests/genesis-compat/silenciar-bot-retomada-humana.test.ts`
Exit code: `999`
Elapsed: `0.0s`
Static unresolved Genesis probe imports: `0`.

Interpretation rule: compile/import failures are compatibility gaps, not behavioral regressions.
A behavioral regression is recorded only when a probe reaches the implementation and an assertion fails.


## Implementation v0.3
- Follow-up editor customizations GEN-007..GEN-011 transplanted over current baseline.
- Undo history limit: 100 snapshots.
- No legacy FlowCanvas overwrite.


## Human handoff audit v0.4
- 1487 code/doc surfaces with handoff/human signals inventoried.
- GEN-001..GEN-006 formalized as Genesis characterization contract.
- No legacy handoff implementation overwritten.
- Runtime gate remains pending; static presence is not treated as behavioral proof.


## Security / realtime audit v0.5
- GEN-013..GEN-023 formalized as characterization contract.
- Existing modern auth/RLS/realtime implementation preserved.
- No destructive migration or authorization rewrite performed.


## Brand identity v0.6
- GENESIS TALK commercial identity applied conservatively to 7 files.
- Genesis 360 palette aliases and SVG wordmark added.
- Technical legacy identifiers intentionally preserved.


## DB compatibility v0.7
Migration chains inventoried; fresh install separated from Aurum upgrade; read-only preflight added.


## Production readiness v0.8
Release gate, regression matrix, CI quality workflow and rollback/restore runbook added. Production-ready remains blocked pending executable evidence.


## Release candidate audit v0.9
Executable gates attempted only when local dependencies were available. RC remains blocked without reproducible execution evidence.


## Executable gates v0.10
dependency_install=FAIL, lint=BLOCKED, typecheck=BLOCKED, test_invariants=BLOCKED, test_unit=BLOCKED, build=BLOCKED.


## Upstream audit v0.11
CI Genesis corrigido para pnpm; política seletiva e helper de diff upstream adicionados. Merge automático proibido; diff real pendente em ambiente Git com rede.


## Scope decision v0.12 — Mobile First + Supervisão 360
Vertical IMOBI deferred. P0 general-product fronts are Mobile First and Supervisão 360. Canonical PRD: docs/genesis/PRD-MOBILE-FIRST-SUPERVISAO-360-v0.12.md.


## v0.13 — current upstream intake
Current Deskcomm ZIP is now the technical baseline. Genesis overlays were selectively reconciled; modern upstream FlowCanvas/branding/mobile work was preserved. Supervisão 360 MVP and mobile viewport regression suite were added. Runtime gates remain pending.

## GENESIS TALK v1.77
Current Deskcomm intake `main1-77` is now the technical baseline. Three-way
reconciliation resolved 10 overlapping files explicitly. Current upstream mobile
AppShell/Inbox/Kanban improvements were preserved; Genesis branding,
GEN-001..023, follow-up Undo/disconnect, Mobile regression and Supervisão 360
remain integrated. Database now carries 464 SQL migrations and the current
baseline. Automatic update remains deferred. Runtime quality/DB/E2E gates remain
pending execution in a complete environment.

## Estado vigente — hardening Contabo v1.77, 2026-10-08

O estado FOUNDATION acima é histórico. A árvore v1.77 e a rota manual Contabo foram
versionadas e enviadas ao repositório Genesis autorizado. Decisão de produção:
**BLOCKED** até a evidência final dos gates e validação no destino. Consulte
`PRODUCTION-READINESS-v1.77.md`, seu JSON de evidências e o handoff pós-Codex.

## Evidência de execução — estado atual

Código revisado: `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9`, branch `main`.
Unitários/cercas: 21.460 aprovados; PostgreSQL 15/17: 3.261 aprovados em cada
major, com baseline install/update e isolamento. E2E: 486 aprovados, incluindo
cinco larguras × oito rotas. Builds de quatro imagens em amd64/arm64 usam
APP_VERSION 1.77.0. Os skips/falha esperada e o SHA de cada prova estão no JSON.

Decisão continua **BLOCKED**: audit completo HIGH `braces@3.0.3` sem patch
publicado, check adicional de acervo excede a tela do updater, e destino
Contabo/smoke/backup/restore não foram disponibilizados/provados. O relatório
de gates é a fonte do resultado de gov:verify/build, sem inferir PASS de pendência.
