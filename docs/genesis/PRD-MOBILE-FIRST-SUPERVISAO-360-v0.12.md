# GENESIS TALK — PRD v0.12
## Mobile First + Supervisão 360

Status: aprovado para implementação
Escopo: produto geral
Fora desta versão: verticalização imobiliária/IMOBI

## 1. Problema

O core atual possui capacidades maduras de atendimento, CRM e IA, mas a experiência
mobile ainda não pode ser tratada como mobile-first. O upstream possui evidência de
overflow global em viewport de 390px causado pelo shell desktop.

Ao mesmo tempo, gestores possuem dados espalhados entre desempenho, execução de IA,
auditoria, filas e atendimento. Falta uma visão operacional única que responda
"o que está acontecendo agora, quem precisa de atenção e onde há risco".

## 2. Objetivos

### O1 — Mobile First
Permitir que atendentes operem os fluxos críticos sem depender de desktop.

### O2 — Supervisão 360
Permitir que gerente/diretor acompanhe humanos + IA, priorize exceções e faça drill-down
até a conversa/lead responsável pelo indicador.

### O3 — Generalidade
Nenhuma decisão desta versão deve depender do vertical imobiliário. IMOBI será um
pack posterior sobre este core.

## 3. Não objetivos

- aplicativo nativo iOS/Android nesta fase;
- refazer todo o design system;
- criar data warehouse/BI separado sem necessidade;
- substituir RBAC/RLS por permissões client-side;
- verticalização imobiliária;
- microfrontend dedicado ao mobile.

## 4. Personas

ATENDENTE — trabalha majoritariamente no celular.
GERENTE — acompanha fila, SLAs, handoffs e produtividade.
DIRETOR — acompanha operação consolidada, tendência e risco.
ADMIN — configura acesso e visualiza operação conforme RBAC/tenant.

## 5. Requisitos funcionais — Mobile First

MBL-001 — Shell responsivo sem overflow horizontal em 360/375/390/412/430px.
MBL-002 — Navegação mobile dedicada; sidebar desktop não pode reservar largura no mobile.
MBL-003 — Inbox mobile em fluxo lista → conversa → detalhes, sem três colunas simultâneas.
MBL-004 — Composer permanece utilizável com teclado virtual aberto.
MBL-005 — Contatos: buscar, abrir, editar campos essenciais e iniciar atendimento.
MBL-006 — Leads/Kanban: consultar, mover etapa e alterar responsável via interação touch.
MBL-007 — Agenda: visualizar dia/semana adequada ao mobile, criar/remarcar/cancelar evento.
MBL-008 — Follow-up: consultar estado e executar ações operacionais; edição complexa de grafo
          pode degradar para modo simplificado no mobile, desde que não bloqueie operação.
MBL-009 — Tarefas: listar, priorizar, concluir/reabrir e navegar para lead/conversa.
MBL-010 — Handoff humano/IA deve ser visível e acionável no mobile.
MBL-011 — Estados loading/empty/error/offline/retry em todos os fluxos P0.
MBL-012 — Ações destrutivas exigem confirmação proporcional ao impacto.
MBL-013 — Touch targets e foco/teclado devem atender WCAG 2.2 AA quando aplicável.
MBL-014 — Deep links internos devem abrir a tela mobile correta.
MBL-015 — RBAC/RLS permanecem server-side; esconder botão não conta como autorização.

## 6. Requisitos funcionais — Supervisão 360

SUP-001 — Visão "agora": atendimentos ativos, IA, humanos, filas e aguardando resposta.
SUP-002 — Mostrar handoffs IA→humano e seu estado.
SUP-003 — Mostrar conversas fora de SLA/tempo-alvo configurado.
SUP-004 — Mostrar atendimentos sem responsável e filas saturadas.
SUP-005 — Performance por atendente com drill-down para conversas/leads.
SUP-006 — Performance por agente de IA com drill-down para execuções/conversas.
SUP-007 — Taxa e motivo de handoff da IA.
SUP-008 — Falhas operacionais: mensagens não enviadas, providers degradados, jobs relevantes.
SUP-009 — Follow-ups pendentes/atrasados e leads esfriando.
SUP-010 — Visão de custo/uso de IA quando a telemetria já existir.
SUP-011 — Filtros por período, equipe, atendente, agente IA, canal e pipeline quando disponíveis.
SUP-012 — Todo KPI operacional deve apontar para a população que o compõe.
SUP-013 — Dados devem respeitar tenant, role e modo de suporte read-only.
SUP-014 — Atualização near-real-time para métricas operacionais; analíticas podem ter atraso explícito.
SUP-015 — Dashboard responsivo em 360–430px, sem depender de hover ou tabelas largas.
SUP-016 — Estados de dado atrasado/indisponível devem ser visíveis.
SUP-017 — Nenhuma métrica deve inferir "bom/ruim" sem threshold configurado.
SUP-018 — Audit trail para ações administrativas que alterem atendimento/ownership.

## 7. Informação prioritária do dashboard

Camada A — Operação agora
- ativos agora
- em IA
- em humano
- aguardando humano
- aguardando cliente
- sem responsável
- acima do SLA
- falhas de envio / canal degradado

Camada B — Qualidade e fluxo
- handoffs IA→humano
- tempo de primeira resposta
- tempo até assumir handoff
- backlog por atendente/equipe
- follow-up atrasado
- leads esfriando

Camada C — Resultado e eficiência
- conversões por atendente/agente quando os dados de conversão forem confiáveis
- uso/custo de IA
- taxa de resolução por IA
- motivos de handoff
- falhas recorrentes de tools/agentes

## 8. Arquitetura proposta

### 8.1 Mobile
Manter uma única aplicação responsiva. O shell deve operar por breakpoint e estado de
navegação, não por margem desktop fixa. Componentes críticos devem ter layouts móveis
próprios, sem duplicar regras de domínio.

### 8.2 Supervisão
Criar uma camada de leitura operacional com contratos próprios. Evitar consultas N+1 ou
agregações pesadas no client. Reutilizar dados existentes quando confiáveis e criar
read-model/queries materializadas apenas quando volume/latência justificarem.

### 8.3 Realtime
Realtime deve servir sinais operacionais, não substituir reconciliação. A UI precisa
tolerar perda/reconexão e fazer refetch seguro.

### 8.4 Segurança
Todas as agregações precisam carregar tenant scoping e RBAC server-side. Drill-down deve
revalidar autorização no destino.

## 9. RNFs

RNF-001 — sem overflow horizontal estrutural em viewports alvo.
RNF-002 — interação crítica deve ser utilizável por toque.
RNF-003 — LCP/INP medidos em dispositivo móvel representativo antes do gate de release.
RNF-004 — dashboard deve sinalizar freshness dos dados.
RNF-005 — falha de telemetria não pode bloquear atendimento.
RNF-006 — consultas de supervisão não podem degradar inbox/worker.
RNF-007 — métricas e contagens precisam de definição e source-of-truth documentados.
RNF-008 — acessibilidade WCAG 2.2 AA nas superfícies P0.
RNF-009 — sem PII desnecessária em logs/telemetria.
RNF-010 — comportamento mobile deve ter regressão automatizada por viewport.

## 10. Failure modes mínimos

- teclado virtual cobre composer;
- sidebar/margem desktop volta a causar overflow;
- realtime desconecta e KPI congela sem indicação;
- KPI agrega outro tenant por erro de filtro;
- gerente abre drill-down e vê dado sem autorização;
- agregação pesada satura Postgres;
- presença/estado de atendimento fica stale;
- ação de handoff duplica em retry;
- dashboard mostra "0" quando fonte está indisponível;
- gráfico/tabela desktop quebra navegação mobile.

## 11. Fases de implementação

W1 — Foundation mobile
- AppShell/navigation/breakpoints
- primitives responsive
- viewport regression suite

W2 — Operação mobile P0
- Inbox
- contatos
- lead/kanban
- agenda
- tarefas
- follow-up operacional

W3 — Supervisão 360 data contracts
- métricas
- filtros
- freshness
- drill-down
- RBAC/RLS
- performance budget

W4 — Supervisão 360 UI
- desktop
- mobile
- estados de erro/stale
- realtime/reconciliation

W5 — Hardening
- accessibility
- performance mobile
- security/tenant isolation
- E2E
- load das queries
- observability
- release evidence

## 12. Gates

MOBILE-G1 — 360/375/390/412/430 sem overflow estrutural.
MOBILE-G2 — Inbox/contato/lead/agenda/tarefa operáveis via touch.
MOBILE-G3 — handoff humano/IA operável e compreensível.
MOBILE-G4 — WCAG/performance medidos.

SUP-G1 — definições das métricas aprovadas.
SUP-G2 — tenant/RBAC/RLS provados.
SUP-G3 — drill-down em todos KPIs acionáveis.
SUP-G4 — freshness/realtime/recovery provados.
SUP-G5 — carga das queries não degrada atendimento.
SUP-G6 — dashboard mobile aprovado nos viewports alvo.

## 13. Decisão

A vertical IMOBI fica fora do v0.12. O core Mobile First e Supervisão 360 será geral,
reutilizável por qualquer organização. A versão imobiliária futura será uma camada de
configuração/jornadas sobre esse núcleo, não um fork.
