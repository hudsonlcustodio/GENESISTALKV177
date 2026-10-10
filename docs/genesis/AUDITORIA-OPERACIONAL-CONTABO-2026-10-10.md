# Auditoria operacional — GENESIS TALK v1.77 / Contabo

Data: **10/10/2026**. Parecer: **BLOCKED para produção**.

Existe uma base funcional extensa, com instalador manual, imagens Genesis, autenticação,
CRM, Inbox, follow-up e testes relevantes. Não é necessário reescrever o produto. Ainda
faltam correções de recuperação e monitoramento, completar partes do escopo e comprovar
a operação no ambiente de destino. Ter a tela de login acessível não fecha esses gates.

Esta entrega é uma auditoria. Não houve deploy, push, alteração de regras de negócio,
migrations ou credenciais. A prova PostgreSQL utilizou um contêiner temporário sem rede,
portas publicadas ou volumes persistentes; ele foi removido ao terminar. Bancos existentes
não foram usados nesse experimento.

## Base, método e limites

- Repositório: `hudsonlcustodio/GENESISTALKV177`; HEAD
  `8337c0b7a5c9636bf574742001255230a184d32f`, com mudanças locais anteriores de identidade
  visual. O JSON de evidências registra nomes e hashes dos arquivos modificados.
- Requisitos: prompt anexado, PRD de produção Contabo v1.77, handoff v1.77,
  `PRD-MOBILE-FIRST-SUPERVISAO-360-v0.12.md`, `REGRESSION-MATRIX-v0.8.md` e release gate.
  O manual de marca enviado posteriormente pelo usuário prevalece sobre a paleta antiga.
- Foram examinados os fluxos de instalação, preflight, composição das imagens, bootstrap
  do proprietário, smoke, health, backup/restore, Supervisão, suas APIs, mobile, branding,
  agenda, contratos Genesis, scripts de qualidade e evidências anteriores.
- Os documentos anexados são requisitos e contexto. O pedido atual determina o trabalho:
  auditar e indicar o que falta; instruções antigas para implementar/publicar não foram
  tratadas como autorização para executar essas ações nesta auditoria.
- As classificações distinguem **reprodução executável**, **constatação no código**,
  **risco de capacidade** e **ausência de prova**. Presença de arquivo ou teste simulado
  não foi contada como funcionamento de integração real.
- Não houve acesso ao servidor Contabo, a um banco de produção ou aos provedores reais.
  Não foram repetidos build, typecheck, suíte DB e E2E completos da árvore atual. A máquina
  local tinha aproximadamente 1,36 GiB livres de 7,95 GiB; há histórico de typecheck
  interrompido/OOM. Esses gates devem rodar em CI/ambiente com recursos adequados.
- Esta auditoria não certifica ausência de todos os defeitos nem substitui um pentest.
  Os achados abaixo são suficientes para manter o bloqueio de produção.

## Evidências executadas agora

| Verificação                                       | Resultado atual                            | O que demonstra                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11 arquivos de testes direcionados                | **97 aprovados + 1 falha esperada**        | Contratos Contabo, manifesto/migrations, follow-up, fontes da Supervisão, suporte, realtime e partes da marca; não equivale à suíte completa.                           |
| `lint:channels` / `lint:role-rank`                | **PASS / PASS**                            | Regras estáticas específicas.                                                                                                                                           |
| Escaneamento de segredos                          | **PASS**, 7.008 arquivos analisados        | Nenhuma ocorrência nos padrões procurados; não cobre todos os formatos possíveis de segredo.                                                                            |
| `pnpm audit --prod --json`                        | **PASS**, zero vulnerabilidades reportadas | Dependências classificadas como produção pelo gerenciador.                                                                                                              |
| `pnpm audit --json`                               | **FAIL**, uma HIGH                         | `braces@3.0.3`, detalhado em A07.                                                                                                                                       |
| `release:acervo-cabe`                             | **FAIL**                                   | 34 fragmentos; fim da seção no byte 31.650, limite 30.000.                                                                                                              |
| Handler real de health com dependências simuladas | **Defeito reproduzido**, 2 casos           | O controle HTTP 200 e o erro Supabase HTTP 401 retornam `healthy`. Esses testes aprovam a reprodução do defeito, não a prontidão do produto.                            |
| Dump/restore em PostgreSQL 17 isolado             | **Defeito de permissões reproduzido**      | Com as opções atuais do backup, privilégios bloqueados antes do dump ficam permitidos após restore. Contraprova mínima; não foi uma restauração completa do aplicativo. |

A primeira execução do secret scan falhou por `safe.directory` do Git, antes de analisar
o projeto. Após ajustar somente a configuração do processo filho, a repetição terminou
com código zero. O erro de infraestrutura e a repetição estão registrados separadamente.

O relatório de 08/10 registra **21.460 testes unitários/cercas**, **486 E2E** e testes DB
PostgreSQL 15/17, além de builds de quatro imagens nas duas arquiteturas. São evidências
históricas: source `615c9a1...` e E2E `386d3d2...`. Não certificam as alterações locais
atuais. Consulte `PRODUCTION-READINESS-v1.77.md` para seus SHAs, skips e limites.

## Achados e critérios para encerramento

**A01 — P0: o caminho de backup/restore perde restrições de acesso.**

`hostgator-setup-kit/backup.sh:39` usa `pg_dump --no-owner --no-privileges`.
O segundo parâmetro exclui GRANT/REVOKE. `restore.sh:68` carrega o dump sem reaplicar
o hardening do baseline ou comparar privilégios efetivos. O baseline depende dessas
restrições: funções `SECURITY DEFINER` são fechadas para PUBLIC/anon em torno da linha
47.600; a proteção de escrita em `api_audit_log` também depende de REVOKE, inclusive
na linha 49.361.

Na contraprova isolada, uma função restrita voltou a ter EXECUTE para anon e uma tabela
de auditoria voltou a permitir DELETE ao service_role. O JSON mostra `false → true` nos
dois privilégios. Foi reproduzido o mecanismo de perda de segurança, sem demonstrar um
exploit completo do CRM ou afirmar que o banco atual está exposto. RLS/policies presentes
no dump não substituem ACLs; service_role pode contornar RLS.

Encerramento: definir um formato de backup/restore que preserve os privilégios aplicáveis
ao destino, ou reaplique hardening compatível com a versão exata, e verificar privilégios
efetivos após restaurar. A prova completa deve testar funções restritas, auditoria somente
inclusão, isolamento entre organizações e papéis do worker. Não reaplicar todo o baseline
às cegas em dados restaurados. Referência: [opção no-privileges do PostgreSQL](https://www.postgresql.org/docs/current/app-pgdump.html).

**A02 — P1: restore pode declarar sucesso com restauração parcial.**

`hostgator-setup-kit/restore.sh:57–69` aceita a execução normal do psql e imprime
“banco restaurado” pelo código de saída. Sem `ON_ERROR_STOP`, erros SQL podem não encerrar
o processo. Não há validação final de tabelas, linhas, constraints, usuários Auth, objetos
Storage e permissões. `tests/shell/restore-falha-alto.test.sh` aceita erros simulados de
schemas/extensões com saída zero; não prova integridade dos dados restaurados.

A remoção das flags estritas foi deliberada: Supabase novo já possui schemas internos,
e certos conflitos eram esperados. A correção precisa separar esses conflitos de falhas
reais; simplesmente recolocar uma flag pode impedir o restore legítimo.

Encerramento: restore em destino isolado compatível, tratamento explícito dos conflitos
permitidos, falha obrigatória em erros não permitidos e pós-condições de dados/segurança.
Medir RTO/RPO, testar autenticação e abrir anexos. Corrigir também a retomada: se anexos
falham depois do banco, o roteiro manda repetir, mas o guard de banco não vazio impede
reexecutar o procedimento completo. Referência: [comportamento do psql](https://www.postgresql.org/docs/current/app-psql.html).

**A03 — P1: health produz falso positivo para credenciais Supabase inválidas.**

`app/api/v1/health/route.ts:110–112` trata HTTP 200, 401 e 403 como Supabase `ok`.
No handler real, uma resposta 401 com `Invalid API key` produziu HTTP 200 e `healthy`
quando as outras dependências responderam corretamente. A prova e seu controle estão
no pacote de evidências.

`preflight.sh:32–33` valida formato/papel da chave, não sua autenticidade no projeto;
`smoke.sh:19–24` verifica health e formulário de login. O próprio smoke informa que E2E
autenticado é separado. Portanto é necessário fechar ambos, sem interpretar smoke como
login comprovado.

Encerramento: distinguir disponibilidade de rede, autorização da consulta e validade da
credencial; uma chave inválida deve reprovar readiness. Cobrir chave válida com RLS
restritiva, chave de outro projeto, expiração e banco indisponível. Executar login real
e consulta autorizada depois do bootstrap.

**A04 — P1: backup de atualização pode ser considerado suficiente sem sessões WhatsApp.**

`backup.sh:58–70` apenas avisa e continua quando não consegue ler o volume ou o snapshot
sai vazio. `deploy/contabo/deploy.sh:23–26` exige sucesso do script e manifesto não vazio;
o dump do banco sozinho satisfaz essa condição. Uma atualização pode prosseguir sem
guardar o pareamento de um canal ativo. O restore também apenas avisa em falha de
extração desse snapshot.

Encerramento: manifesto que declare componentes exigidos, omitidos e seus motivos;
falhar quando faltar sessão de canal ativo, diferenciando instalação nova ainda sem
pareamento. Validar arquivos/extração e recuperação do canal. No modo Supabase externo,
o dump não inclui os bytes dos objetos Storage: definir exportação e restauração desses
objetos separadamente. Os backups locais precisam de cópia fora da VPS e política global
de retenção; subpastas por deploy não recebem retenção global automaticamente.

**A05 — P1 de escopo: Supervisão 360 ainda entrega um MVP parcial.**

`app/app/supervisao/_components/Supervisao360Client.tsx:64` apresenta contadores atuais,
presença/carga, desempenho por atendente em 30 dias e agregado operacional de IA.
Há tratamento explícito de fonte indisponível e atualização periódica, o que é positivo.
Porém a tela não oferece filtros ou navegação dos KPIs para as conversas/execuções.
Também não consolida SLA, taxa/motivo de handoff, mensagens/jobs com falha, follow-ups
atrasados e custo/uso de IA quando disponível.

Isso deixa incompletos SUP-003, 005–012 e os gates SUP-G3/G5 do PRD v0.12. Métricas
existirem em outras telas/APIs não completa a jornada gerencial planejada. Não foi
reproduzido vazamento entre organizações nessa tela; a autorização server-side e o uso
de orgId nas fontes foram encontrados.

Encerramento: definir população e filtros de cada indicador, implementar os indicadores
aplicáveis e drill-down autorizado, e provar que os totais correspondem às listas.
O escopo atual exige essas entregas; qualquer redução de escopo precisa ser decisão
explícita do responsável pelo produto, não uma reclassificação silenciosa como pronto.

**A06 — P1 de validação: mobile operacional ainda não tem prova suficiente.**

`tests/e2e/genesis-mobile-first.spec.ts:43–63` abre oito rotas em cinco larguras, verifica
estrutura e overflow. Não executa nesses viewports a sequência completa de editar
contato, mover lead por touch, criar/remarcar agenda, concluir tarefa, enviar mensagem
com teclado virtual e efetuar handoff. Também não exige que todas as fontes saiam de
loading antes de medir. Isso comprova estrutura, não todo MBL-004..014.

A suíte E2E geral possui jornadas operacionais; não se está afirmando ausência de todo
CRUD testado. O gap é a prova mobile integrada e representativa, incluindo offline/retry,
foco, acessibilidade e LCP/INP. A exclusão explícita de algumas specs na lista `FORA_DO_CI`
de `.github/workflows/e2e.yml:1247` também exige considerar os cenários relevantes de
realtime, configuração de cadastro e provedores reais no aceite final.

Encerramento: executar jornadas touch com dados carregados, teclado real em dispositivo
representativo, falhas/reconexão e medições de acessibilidade/performance. Manter as cinco
larguras como regressão estrutural adicional.

**A07 — P1 do gate de segurança: dependência HIGH continua presente.**

Audit completo identifica `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm, via ferramentas de Jest
e ESLint. A consulta não indicou versão corrigida. O audit `--prod` ficou limpo, mas
`Dockerfile.worker:18` e `Dockerfile.voice-agent:19` instalam também devDependencies.
Assim, o resultado limpo de `--prod` não descreve sozinho todo o conteúdo dessas imagens.
Não foi demonstrado que entrada remota do CRM alcance o parser vulnerável.

Encerramento: validar correção da cadeia ou patch com testes, ou remover/isolar as
dependências afetadas das imagens e documentar a análise de alcance. Uma exceção de risco
precisa ser deliberada e limitada; não inventar versão corrigida nem reduzir o gate para
esconder o resultado. [Advisory primário](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

**A08 — P1 do release: o candidato atual não é o candidato da CI anterior.**

Existem mudanças locais de marca, componentes e testes ainda não versionadas. O preflight
Contabo recusa working tree suja (`preflight.sh:61`). Os resultados históricos completos
não incluem essas mudanças; nesta auditoria houve apenas testes direcionados.

Encerramento: revisar os arquivos finais, versionar o candidato, rodar os gates completos
nesse SHA, construir as imagens desse mesmo source e registrar IDs/digests. Incluir os
assets PNG oficiais no contexto da imagem. Atualizar a declaração de prontidão somente
com resultados dessa versão.

**A09 — P2 funcional: compromisso em andamento cai no histórico.**

`components/agenda/HistoricoDaAgenda.tsx:80` separa passado/próximo pelo início (`comeca`),
ignorando o término. Um evento iniciado e ainda em andamento já sai de Próximos.
`tests/unit/agenda-separar-historico.test.tsx:357` mantém esse caso em `it.fails`;
a execução atual preservou a falha esperada.

Encerramento: definir classificação por término/status, cobrir limites de horário/fuso
e transformar a caracterização em teste normal aprovado.

**A10 — P2 de identidade: template de deploy conserva o verde antigo.**

`deploy/contabo/.env.example:42` define `APP_ACCENT_HEX='#7ED321'`.
`lib/branding/instalacao.ts:158` aceita esse valor como semente válida de configuração.
Uma instalação nova que usa o template externo pode gravar a identidade antiga e
prevalecer sobre os novos padrões de CSS. A identidade enviada pelo usuário usa os
anchors #D4FF00, #00E676, #071B33, #19C2FF, #52616F e #F7FAFC.

Encerramento: alinhar template, bootstrap e documentação; validar primeiro acesso após
instalação limpa, modo claro/escuro e marca configurada no banco. Testes de contraste
direcionados aprovados não eliminam essa divergência de configuração.

**A11 — P2 operacional: `db:migrate` é um comando sem efeito que termina com sucesso.**

`package.json:19` executa um TODO seguido de `exit 0`. Um operador pode interpretar o
retorno como migrations aplicadas. O instalador fresh canônico aplica baseline por outro
caminho, portanto isto não demonstra falha desse instalador.

Encerramento: implementar o caminho de migração aprovado ou fazer o comando recusar a
operação com instrução inequívoca. Não aplicar uma bridge genérica em banco existente.

**A12 — P2 de capacidade: atualização gerencial amplifica consultas.**

As fontes de equipe e desempenho atualizam a cada 30 segundos. As APIs de disponibilidade
e métricas chamam `auth.admin.getUserById` por usuário em `Promise.all`
(`availability/route.ts:101–103`; `metrics/attendants/route.ts:93–95`). A métrica de IA
executa seis contagens exatas de eventos (`operator-metrics/route.ts:97–107`). Múltiplos
gerentes multiplicam o custo desse padrão.

É risco fundamentado no código, não saturação medida. Encerramento: orçamento de queries,
reduzir consultas repetidas de identidade quando necessário, validar índices/planos e
testar com volume e concorrência representativos sem degradar Inbox/worker. Definir SLOs
antes de escolher a capacidade da VPS somente pelo tamanho mínimo do instalador.

**A13 — P2 de governança: histórico excede a janela suportada.**

`release:acervo-cabe` reprova: 34 fragmentos e seção terminando 1.650 bytes além do limite.
Isso compromete a leitura do histórico no mecanismo herdado. Não demonstra que o app
deixará de iniciar no deploy manual Genesis; auto-update continua DEFERRED.

Encerramento: organizar o histórico pelo processo de release aplicável ao fork, preservando
os registros, e validar novamente. Não executar um release/publicação upstream por reflexo
nem aumentar o limite local como se alterasse scripts já instalados.

## Cobertura do escopo planejado

| Área / requisitos                     | Situação observada                                                                                      | Falta para aceite                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Preservação Genesis / REL             | Código moderno e overlays presentes; testes direcionados de follow-up e Contabo aprovados               | Candidato final versionado e regressão completa nesse SHA.                                                                                   |
| GEN-001..006, IA → humano             | Mecanismos e contratos existentes; evidência anterior disponível                                        | Validar silêncio da IA, ownership, mensagem pós-handoff e bloqueio de follow-up no runtime final e com canal real.                           |
| GEN-007..012, editor follow-up        | Cinco testes atuais cobrem Undo/settings, desconectar sem apagar, drag, 100 snapshots e grafo de salvar | Jornada real editar → Undo → salvar/publicar → executar sem envio duplicado.                                                                 |
| GEN-013..023, segurança/realtime/LGPD | Probes e implementação presentes; checks atuais de bootstrap realtime e suporte aprovados               | Regressão DB/RLS final, retries de side effects, contexto entre abas e anonimização de drafts/tasks. A01 afeta recuperação dessas garantias. |
| Auth / cadastro                       | Bootstrap do dono e login existem                                                                       | Escolher política de confirmação, SMTP/URLs de redirecionamento e provar login, recuperação e sessão no domínio final.                       |
| Inbox / CRM / agenda / tarefas        | Implementação e testes históricos amplos                                                                | Mensagens reais de ida/volta, anexos, deduplicação/retry, CRM crítico e agenda corrigida.                                                    |
| Mobile / MOB e MBL                    | Estrutura em cinco larguras tem evidência histórica; marca recebeu QA local anterior                    | A06; executar cenários críticos completos com teclado/touch e dados reais de teste.                                                          |
| Supervisão / SUP                      | Contadores e fontes MVP implementados                                                                   | A05 e A12; métricas, filtros, drill-down, freshness e carga.                                                                                 |
| Banco fresh / DB                      | Baseline, manifesto e instalador existem; teste manifesto atual passou                                  | Fresh install no destino isolado, Auth/RLS, extensões e smoke autenticado. Não presumir compatibilidade de banco Imobi/Aurum existente.      |
| Deploy / DEP                          | Wrapper manual com override Genesis, pull local, preflight, segredos, bootstrap e TLS                   | Recursos/DNS/proxy do destino, build final e validação de dependências autênticas; A03/A08.                                                  |
| Backup / restore / rollback           | Scripts, hashes, registro de imagens e runbook existentes                                               | A01/A02/A04, cópia fora da VPS, ensaio integral, restauração segura e RTO/RPO medidos.                                                       |
| Observabilidade                       | Health e checks de processos existem                                                                    | A03; provar trabalho do worker/cron, alertas, logs úteis e recuperação de falhas. Processo vivo não prova job executado.                     |
| Segurança do pacote                   | Secret scan e audit de produção passaram                                                                | A07, validação do conteúdo das imagens e autorização/RLS no candidato final.                                                                 |

Não são faltas para este release: aplicativo nativo, vertical IMOBI, publicação automática
de imagens e auto-update. Telefonia/voz exige seu próprio aceite se o perfil opcional for
habilitado. Migração de banco Aurum/Imobi existente requer fingerprint/schema/ledger e
plano específico; não bloqueia uma instalação dedicada realmente nova.

## Caminho para operação e publicação

1. **Recuperação e confiança operacional:** fechar A01–A04 e validar testes negativos.
   Incluir integridade, permissões, Auth, anexos e canal ativo no ensaio de recuperação.
2. **Produto e pacote:** corrigir agenda, template de marca e comando de migração;
   fechar Supervisão/mobile conforme o PRD; resolver a dependência HIGH e o histórico.
3. **Candidato reproduzível:** versionar o source final; executar install congelado,
   gov:verify, build, DB/RLS, shell e E2E aplicáveis. Construir imagens Genesis da arquitetura
   da VPS com APP_VERSION 1.77.0 e registrar SHA/digests.
4. **Homologação na Contabo:** preflight, banco dedicado, segredos de produção, DNS/TLS,
   owner real e SMTP. Provar login e jornadas críticas com provedores configurados,
   execução do worker/cron, retries, handoff, anexos e métricas coerentes.
5. **Ensaio e entrada em produção:** medir backup/restore/RPO/RTO; ensaiar rollback de
   imagens com compatibilidade de schema explícita; definir alertas, rotina de backup,
   responsável por incidentes e janela de publicação. Liberar somente com evidências.

Para preparar o destino, ainda precisamos de: IP e acesso SSH apropriado; sistema
operacional/arquitetura, RAM, CPU e disco; domínio e controle de DNS; informação sobre
serviços/proxy já instalados; escolha entre Supabase externo dedicado e single-server;
estado do banco escolhido; e-mail do proprietário, política de cadastro e SMTP; canal
WhatsApp e provedores de IA/Google/Meta efetivamente usados. Credenciais devem ser
configuradas no servidor/cofre/arquivo protegido, sem colar segredos no relatório ou chat.

Não há base honesta para um percentual de prontidão ou data de publicação antes de
fechar esses gates. A sequência acima separa correções de engenharia de informações e
validações dependentes do ambiente.

## Arquivos de evidência

Pasta: [`evidence/audit-2026-10-10/`](evidence/audit-2026-10-10/).

- `audit-results.json`: SHA, hashes do candidato, inventário e resultados/limites.
- `focused-results.json` e logs: comandos, códigos de saída e testes atuais.
- `audit-full.log` / `audit-prod.log`: resultados estruturados da auditoria de dependências.
- `secret-scan-corrected.json`: resultado final do scanner.
- `health-repro.test.ts`, config e log: reprodução do falso positivo do handler.
- `restore-acl-proof.json` e `reproduce-restore-acl.mjs`: contraprova PostgreSQL isolada.

Para repetir somente a reprodução do health, na raiz do repositório:

```powershell
node node_modules/vitest/vitest.mjs run --config docs/genesis/evidence/audit-2026-10-10/vitest.audit.config.mjs
```

Essa reprodução afirma o comportamento defeituoso atual. Depois da correção, ela deve
ser substituída por regressões que exijam falha de readiness para a chave inválida.
O script PostgreSQL de evidência grava seu JSON na pasta `.runtime/audit-2026-10-10`;
exige Docker disponível e a imagem `postgres:17-alpine` já instalada. Não usa bancos ou
volumes existentes. Uma reprodução mínima aprovada não fecha o gate de restore completo.
