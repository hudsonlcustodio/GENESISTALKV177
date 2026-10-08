# GENESIS TALK — DECISIONS

## ADR-001 — Nova baseline
Status: approved
Decisão: Deskcomm atual é a baseline do GENESIS TALK.
Aurum/Imobi é fonte de customizações e invariantes, não base de merge.

## ADR-002 — Identidade
Status: approved
Produto: GENESIS TALK.
Marca-pai: GENESIS 360.
Paleta: exatamente a família cromática fornecida pela marca-pai.

## ADR-003 — Identificadores técnicos legados
Status: approved
Não executar rename global de `Deskcomm` em contratos, migrations, env vars,
schemas ou identificadores persistidos sem análise de impacto e migration plan.

## ADR-004 — Port por comportamento
Status: approved
Primeiro executar probes/testes proprietários contra a baseline nova.
Somente gaps observados geram implementação Genesis.

## ADR-005 — Human handoff integration
Status: approved
Decision: retain current upstream handoff/escalation architecture and use Aurum
behavior as characterization contracts. Legacy implementation is transplanted only
when an executable regression demonstrates a missing invariant.

## ADR-006 — Security and realtime migration
Status: approved
Decision: current baseline remains technical source-of-truth; Aurum security,
support and realtime behavior becomes Genesis regression contract. RLS/auth
changes require current-schema evidence and executable verification.

## ADR-007 — Upstream intake v1.77
Status: approved
Decisão: `DeskcommCRM-main1-77.zip` é a nova baseline técnica do GENESIS TALK.
A integração é three-way e seletiva; código Genesis antigo não sobrescreve
avanço upstream quando o comportamento já foi superado.

## ADR-008 — Mobile conflict resolution
Status: approved
Decisão: AppShell, Inbox e Kanban mobile atuais do upstream prevalecem sobre
patches Genesis v0.13 mais antigos. Os requisitos Genesis permanecem como gates
e regressões de viewport, não como obrigação de conservar implementação antiga.

## ADR-009 — Automatic update
Status: deferred
Decisão: manter o subsistema upstream em código, mas não tratá-lo como canal de
release Genesis até GHCR/releases/migrations/rollback serem reconciliados.

## 2026-10-08 — release manual Contabo e reconciliação dos gates

Preservar dependências, baseline SQL, engines e contrato multi-tenant upstream.
Build próprio usa nomes `genesis-talk-*:1.77.0`; publicação/auto-update seguem
deferred. Checks que publicam são exclusivos do repo vendor; no Genesis o
agregador exige builds e smoke, com publicação pulada explicitamente. Regras
de contraste usam régua Genesis; fixture Sage continua calibrando os canários
legados. Resultado final depende de testes completos e recuperação real.

## 2026-10-08 — navegação e falhas adicionais de segurança/release

Supervisão 360 permanece no menu de uso diário. Meta Ads é consulta periódica no
hub de Análise e na busca, com o mesmo RBAC; a densidade e o gate de dobra não
mudam. Mensagem STOP cancela pausa manual, enquanto inbound comum e handoff a
preservam. A tipagem inclui esse estado já existente no banco.

O audit completo encontrou `braces@3.0.3` HIGH sem patch publicado; o resultado
`--prod` limpo não encerra esse achado. O check herdado de tamanho do acervo
também falha. Não cortar nova versão, apagar fragmentos vendor ou aumentar o
limite do updater para fabricar um resultado verde nesta release manual v1.77.
