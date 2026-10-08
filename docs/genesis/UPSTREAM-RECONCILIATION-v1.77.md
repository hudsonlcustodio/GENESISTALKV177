# GENESIS TALK v1.77 — Upstream Reconciliation Report

## 1. Estado real

A v1.77 foi construída por **three-way reconciliation** entre:

- baseline Deskcomm anterior: `DeskcommCRM-main1-64.zip`;
- upstream Deskcomm atual fornecido: `DeskcommCRM-main1-77.zip`;
- GENESIS TALK anterior: `v0.13`.

O upstream atual mudou **2113 caminhos**
desde a baseline anterior. O Genesis tinha **76**
deltas próprios contra aquela baseline. Apenas **10**
arquivos exigiram reconciliação manual — todos classificados e resolvidos sem merge cego.

## 2. Banco

- migrations SQL atuais: **464**
- migrations novas por nome desde o Genesis v0.13: **64**
- fresh install: `supabase/baseline.sql`
- migrations históricas: ledger de evolução
- upgrade de banco Aurum/IMOBI existente: continua exigindo fingerprint real

Entre as evoluções novas incorporadas estão hardening de LGPD/anonymization,
janela de resposta, debounce configurável, atraso humano por conexão, isolamento
de suporte read-only, auditoria append-only, dedupe atômico de mídia/jobs,
gate de envio, conversão Meta por etapa, índices de caminho quente, uso de IA
agregado, retenção de tabelas de IA, relatório por canal, cobrança/planos,
credenciais cifradas e escopo de push por visibilidade da conversa.

## 3. Toolchain atual absorvido

- Node: `>=22`
- pnpm: `pnpm@9.15.9`
- Next: `^16.3.8`
- React: `^19.3.0`
- Supabase JS: `^2.117.1`
- AI SDK: `^7.0.112`
- OpenAI SDK: `^4.0.73`
- MCP SDK: `^1.31.0`
- Sentry: `^11`
- ESLint: `^10.11.0`
- jsdom: `^30.1.1`

`package.json` e `pnpm-lock.yaml` atuais do upstream são a fonte técnica.
O Genesis altera apenas identidade/versionamento do pacote.

## 4. Conflitos manuais resolvidos

| Arquivo | Decisão |
|---|---|
| README | Genesis é canônico; README upstream atual foi arquivado |
| FlowCanvas | upstream atual + Undo/Desconectar Genesis reaplicados |
| Contatos | upstream atual + espaçamento mobile-first |
| globals.css | upstream atual + anchors/rampa GENESIS 360 |
| KanbanBoard | **upstream atual vence**: implementação mobile é mais nova |
| StageColumn | **upstream atual vence**: `85vw` + snap mobile mantidos |
| branding.ts | motor white-label atual + `GENESIS TALK` como default |
| catálogo de navegação | catálogo atual + Supervisão 360 |
| package.json | dependências/scripts atuais + `genesis-talk@1.77.0` |
| branding.test.ts | suíte atual + expectativas Genesis |

## 5. Mobile First

A v1.77 mantém os avanços mobile novos do Deskcomm em vez de restaurar patches
mais antigos do Genesis:

- `AppShell` usa `dvh`, `min-w-0`, sidebar apenas a partir de `md` e barra
  inferior dedicada ao celular;
- Inbox tem estado explícito lista ↔ conversa no celular;
- CRM/ficha do contato usa Sheet no mobile;
- Kanban usa coluna `85vw`, `max-w-80` e snap;
- Contatos mantém os ajustes upstream e recebe espaçamento externo mobile-first;
- a regressão Genesis continua medindo 360/375/390/412/430px nas rotas P0.

## 6. Supervisão 360

A superfície Genesis `/app/supervisao` foi preservada sobre a base atual e
continua `manager+`, reutilizando fontes já autorizadas para:

- fila humana/automática;
- presença e plantão;
- carga da equipe;
- performance por atendente;
- sinais operacionais dos agentes de IA.

As novas métricas upstream (canais, funil, auditoria e outras) ficam disponíveis
para a próxima expansão do cockpit, sem inventar um segundo source-of-truth.

## 7. Handoff / Follow-up / Security

O código atual do upstream passa a ser a implementação-base. Os contratos
`GEN-001..023` continuam como firewall de regressão.

No Follow-up, a v1.77 preserva os recursos novos do editor atual e reaplica:
- Undo local limitado a 100 snapshots;
- snapshot incluindo settings;
- snapshot no início de drag;
- desconectar box sem apagar o nó.

Não foi transplantada implementação antiga de Aurum por similaridade nominal.

## 8. Atualização automática

**DEFERRED.**

O código upstream de updater/release/image publishing permanece na árvore para
não criar um fork prematuro desse subsistema, mas não é considerado um canal de
release Genesis aprovado. Consulte
`docs/genesis/AUTO-UPDATE-DEFERRED-v1.77.md`.

## 9. Evidência estática

- merge markers: **0**
- imports selecionados Genesis não resolvidos: **0**
- checks estáticos verdadeiros: **32/32**

## 10. Gates ainda pendentes

A v1.77 **não é declarada production-ready** sem execução em ambiente completo:

- `pnpm install --frozen-lockfile`
- `pnpm run gov:verify`
- `pnpm run build`
- DB/RLS
- E2E mobile e jornadas críticas
- restore/rollback quando aplicável

## Decisão

**GENESIS TALK v1.77 usa o Deskcomm atual fornecido como nova baseline técnica,
preserva os avanços upstream e reaplica seletivamente apenas os contratos e
diferenciais Genesis.**

## Validação Codex — 2026-10-08

A suíte herdada continha imports e expectativas de APIs removidas. As probes foram
reconciliadas com o runtime atual, sem restaurar módulos antigos. Corrigidas duas
regressões funcionais (onboarding em suporte e adiamento do refetch por render) e
alinhada a marcação automática de lido ao piso agent da API. A contagem do catálogo
mantém 15 itens: Supervisão ocupa a porta diária e Meta Ads permanece no hub de
Análise e na busca. O gate de dobra em 900px e os cinco viewports continuam ativos.

O check de isolamento do kit usa releases vendor somente para calibrar as regras
SQL contra a baseline local. Refs `refs/genesis/vendor-check/*` não habilitam
releases, imagens públicas ou atualização Genesis. Banco/migrations não foram
reescritos. Modos executáveis Linux são versionados após extração do ZIP Windows.

## Consentimento — STOP em pausa manual

`lib/followup/reactivity.ts` inclui `paused_manual` somente nos estados alcançados
por hard stop (STOP/opt-out/contato pessoal). Mensagem comum e handoff continuam
sem acordar essa pausa. A regressão Postgres antes marcada `it.fails` agora exige
cancelamento, outcome, motivo e idempotência; seu adapter honra os estados
passados pelo código de produção. Os três novos controles unitários preservam
as fronteiras da pausa manual. Nenhuma tabela ou migration foi alterada.
