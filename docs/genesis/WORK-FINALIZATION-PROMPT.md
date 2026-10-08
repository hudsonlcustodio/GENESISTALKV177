# MISSÃO — FINALIZAR GENESIS TALK NO CHATGPT WORK

Você está assumindo a execução técnica do projeto **GENESIS TALK**. Trabalhe diretamente no repositório e leve-o de handoff técnico até um Release Candidate verificável. Não recomece o projeto, não faça rewrite e não substitua a baseline moderna por código legado sem evidência.

## REPOSITÓRIO DE DESTINO

GitHub: `https://github.com/hudsonlcustodio/GENESISTALKV141`

O repositório foi criado vazio. Use o conteúdo deste handoff como working tree inicial e publique nele preservando o histórico que você criar a partir daqui.

## IDENTIDADE E DIREÇÃO DO PRODUTO

Produto: **GENESIS TALK**
Marca-pai: **GENESIS 360**
Paleta oficial fornecida:
- Verde Lima: `#7ED321`
- Verde Take: `#00C853`
- Azul Profundo: `#0B3D3A`
- Azul Ciano: `#00B8D9`
- Cinza Técnico: `#6B7280`
- Branco: `#FFFFFF`

A referência visual apresenta DIN Next. NÃO baixe/incorpore arquivo de fonte sem licença/asset autorizado. Use fallback até existir fonte corporativa licenciada.

Não faça rename global de identificadores técnicos legados (migrations, tabelas, env vars, buckets, contracts, storage keys etc.) apenas por branding. Identidade comercial deve ser GENESIS TALK; compatibilidade técnica deve ser preservada.

## BASELINE E PROVENIÊNCIA

A baseline escolhida é o DeskcommCRM mais atual que foi fornecido durante o trabalho. O Aurum/Imobi é fonte de customizações proprietárias e invariantes de comportamento, NÃO a baseline a ser atualizada.

Princípio: portar comportamento, não copiar cegamente implementação antiga.

Consulte primeiro:
- `docs/genesis/PROJECT-STATE.md`
- `docs/genesis/DECISIONS.md`
- `docs/genesis/CUSTOMIZATIONS.md`
- `docs/genesis/BRAND.md`
- todos os relatórios `docs/genesis/*v0.*.md`
- `docs/genesis/evidence/*`
- `tests/genesis-compat/*`
- `tests/genesis-characterization/*`

## O QUE JÁ FOI FEITO

1. Foundation Genesis sobre a baseline moderna.
2. Inventário das diferenças Aurum vs Deskcomm.
3. Probes Aurum preservados em `tests/genesis-compat`.
4. Contratos de caracterização para handoff humano e security/realtime.
5. Follow-up editor recebeu customizações Genesis:
   - Undo local de até 100 snapshots;
   - Desconectar box preservando nó;
   - exclusão segura/remoção de conexão integrada à implementação moderna;
   - histórico para operações relevantes.
6. Branding GENESIS TALK e tokens da GENESIS 360.
7. Estratégia de banco separada:
   - fresh install = migrations atuais;
   - cliente Aurum existente = bridge baseada no schema REAL.
8. `scripts/genesis-db-compat-preflight.sql` read-only.
9. Release gate, regression matrix e rollback/restore runbook.
10. Workflow `.github/workflows/genesis-quality.yml`.
11. Tentativa local de quality gates bloqueada porque o ambiente anterior não tinha acesso ao npm registry. Isso NÃO é evidência de falha do código.

## REGRAS DE EXECUÇÃO

- Inspecione antes de alterar.
- Preserve a arquitetura moderna quando ela já satisfizer o comportamento.
- Não marque teste como PASS sem executá-lo.
- Não declare production-ready por build isolado.
- Não altere RLS/auth sem entender schema, ownership e tenant boundary.
- Não aplique migration destrutiva em banco real.
- Side effects precisam de idempotência/deduplicação/compensação conforme aplicável.
- Corrija causa raiz; não desabilite testes, lint, typecheck ou security checks para obter verde.
- Não remova funcionalidade moderna para fazer teste legado passar; adapte o probe ao contrato atual quando necessário.
- Cada correção material deve atualizar `docs/genesis/PROJECT-STATE.md` e evidência correspondente.

## FASE 1 — BOOTSTRAP DO REPOSITÓRIO

1. Abra o repositório `hudsonlcustodio/GENESISTALKV141`.
2. Se estiver vazio, copie todo o working tree deste handoff para a raiz.
3. Garanta `.gitignore` adequado; NÃO versione `.env*`, secrets, `node_modules`, `.next`, dumps ou credenciais.
4. Confirme `pnpm-lock.yaml`.
5. Configure Node compatível com `package.json` (>=22) e Corepack/pnpm da versão esperada pelo lock/packageManager.
6. Faça commit inicial de handoff com mensagem clara.
7. Configure `origin` para o repositório acima e faça push para `main`, se a sessão estiver autorizada a fazê-lo.

Antes do push, execute secret scan disponível e revise arquivos suspeitos. Se encontrar segredo, NÃO publique; remova do Git, registre o risco e solicite rotação quando aplicável.

## FASE 2 — FECHAR QUALITY GATES

Execute em ambiente com rede:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:invariants
pnpm run build
```

Se algum script falhar:
1. capture erro;
2. classifique: setup/toolchain, incompatibilidade de probe, regressão Genesis, regressão upstream ou configuração;
3. faça a menor correção segura;
4. execute novamente;
5. registre evidência.

NÃO pule para a fase seguinte enquanto lint/typecheck/unit/invariants/build tiverem falhas reais não justificadas.

## FASE 3 — VALIDAR CUSTOMIZAÇÕES GENESIS

### IA → humano — GEN-001..006
Prove em testes executáveis:
- bot permanece silencioso enquanto humano possui a conversa;
- entry points consultam boundary consistente;
- worker legado não ignora `force_human`/ownership;
- mensagem do cliente após handoff não reativa IA silenciosamente;
- elegibilidade é verificada antes da transferência;
- follow-up não envia durante atendimento humano.

Use a implementação moderna de escalation/handoff como source of truth. Só transplante código Aurum se um invariante realmente falhar.

### Follow-up — GEN-007..012
Teste:
- excluir box;
- desconectar box sem excluir;
- remover conexão;
- Undo e limite de 100 snapshots;
- segurança de remoção de nós/arestas;
- idempotência onde houver envio/side effect;
- salvar/publicar após Undo;
- mobile/keyboard se suportados pelo editor.

Revise especialmente `app/app/ai/followups/[id]/_components/FlowCanvas.tsx` para problemas de stale closure, snapshots duplicados, drag gerando histórico excessivo e compatibilidade de `structuredClone`.

### Security / realtime / support — GEN-013..023
Prove:
- recheck imediatamente antes de provider side effect;
- retry não duplica Meet/mensagem;
- realtime só subscreve após contexto autenticado;
- refetch safety clock não reseta por render;
- suporte read-only não altera unread/read;
- suporte read-only não executa operações reservadas;
- mudança de contexto de suporte propaga entre abas com segurança;
- RLS/tenant isolation;
- LGPD/anonymization cobrindo drafts de IA e tasks CRM.

## FASE 4 — BRAND QA

Valide visualmente login, shell/navigation, inbox, CRM, follow-up, settings e estados mobile/dark mode.

A paleta oficial é a lista acima. Tons intermediários adicionados ao ramp são DERIVADOS, não cores oficiais da marca. Ajuste-os se contraste exigir, mantendo as seis cores oficiais como anchors.

Verifique WCAG 2.2 AA onde aplicável. Não presuma que verde sobre branco possui contraste suficiente para texto pequeno: meça.

Elimine branding comercial Deskcomm/Aurum/Imobi das superfícies de usuário, mas preserve identificadores técnicos quando renomeá-los tiver risco de compatibilidade.

## FASE 5 — DATABASE

### Fresh install
Execute a cadeia atual de migrations em banco limpo e prove que conclui.

### Upgrade Aurum
NÃO invente bridge sem schema real. Se houver acesso a uma cópia/clone do banco Aurum:
1. rode `scripts/genesis-db-compat-preflight.sql`;
2. capture schema + migration ledger;
3. compare postconditions com baseline;
4. escreva migration bridge preferencialmente aditiva;
5. valide em clone;
6. valide row counts/FKs/tenant ownership/RLS/auth;
7. teste aplicação;
8. ensaie restore/rollback.

Se não houver banco Aurum real disponível, mantenha este gate explicitamente pendente; não bloqueie fresh installs por isso, mas não declare upgrades existentes suportados.

## FASE 6 — INTEGRAÇÃO / E2E / OPERAÇÃO

Execute o que for aplicável:
- `pnpm run test:db`
- `pnpm run test:e2e`
- smoke dos fluxos críticos;
- health/readiness;
- workers/crons;
- integrações configuradas;
- observabilidade/logs;
- dependency degradation;
- migration tests;
- restore rehearsal;
- rollback rehearsal.

Nunca coloque credenciais reais em fixtures/logs.

## FASE 7 — CI E GITHUB

Revise `.github/workflows/genesis-quality.yml` contra o package manager real. O workflow criado no handoff pode conter `npm` e deve ser corrigido para `pnpm` se necessário.

Faça o CI usar instalação congelada pelo lockfile e os gates reais. Evite duplicar workflows upstream sem necessidade; consolide quando seguro.

No GitHub:
- push para `main` apenas quando o bootstrap estiver seguro;
- para correções subsequentes, prefira branch/PR;
- mantenha commits pequenos e rastreáveis;
- não faça force-push destrutivo;
- não exponha secrets em Actions logs.

## CRITÉRIO DE RELEASE CANDIDATE

Só marque RC quando houver evidência de:
- install reproduzível;
- lint;
- typecheck;
- unit;
- Genesis invariants/compatibility;
- build;
- DB/fresh migration;
- RLS/tenant tests aplicáveis;
- smoke/E2E dos fluxos críticos;
- security checks;
- observability básica;
- rollback definido;
- restore testado quando houver dados persistentes relevantes.

Upgrade de clientes Aurum pode permanecer um capability gate separado se nenhum schema real tiver sido fornecido.

## SAÍDA ESPERADA DO WORK

Trabalhe até o máximo possível, não apenas descreva comandos. Ao final entregue:
1. link/branch/commit ou PR com as alterações;
2. tabela de gates PASS/FAIL/BLOCKED com evidência;
3. lista exata das correções feitas;
4. riscos e gaps remanescentes;
5. migrations aplicadas/criadas;
6. resultados de testes/build;
7. confirmação do estado do branding GENESIS TALK;
8. decisão objetiva: RC elegível ou ainda bloqueado — sem chamar de production-ready sem evidência;
9. `docs/genesis/PROJECT-STATE.md` e `HANDOFF.md` atualizados.

Comece inspecionando o conteúdo deste handoff e o estado real do repositório. Em seguida execute o bootstrap e os gates. Não peça confirmação para passos reversíveis e seguros; peça aprovação antes de ações destrutivas, publicação com impacto material, alteração de dados reais ou rotação de credenciais.
