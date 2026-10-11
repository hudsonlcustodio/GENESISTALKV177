# Finalização operacional — GENESIS TALK 1.77.0

Status: candidato em validação. Não publicado e não homologado na Contabo.

O dono autorizou as correções, os ensaios locais e o versionamento. A homologação
no servidor foi adiada expressamente; IP/SSH, domínio/TLS e credenciais reais
não estão disponíveis. O Supabase mantém o fluxo de instalação Deskcomm.

## Entrega do candidato

- Health exige sucesso de REST com chave do servidor e Auth com chave pública;
  respostas 401/403 não significam readiness. Detalhes públicos não expõem segredos.
- Backup v2 preserva donos/ACL, vincula snapshots ao dump com SHA256, exige os
  componentes locais necessários, conserva bundles completos e suporta cópia externa.
- Restore recusa destinos ocupados, versões incompatíveis, volumes ocupados,
  serviços consumidores ativos e arquivos adulterados. SQL, contagens e contrato
  de schema/RLS/ACL são conferidos na mesma transação.
- Supervisão inclui filtros, réguas explícitas de análise, 15 populações operacionais,
  paginação, custos/tokens, primeira resposta humana, passagens pendentes, canais
  indisponíveis, motivos de passagem e links para os registros.
- A disponibilidade enriquece nomes do roster em lote. As métricas do executor
  usam uma consulta agregada, substituindo seis contagens individuais.
- Agenda mantém compromissos em andamento em Próximos; marca e template Contabo
  seguem a arte/paleta oficial. As credenciais de white-label existentes prevalecem.
- Workers instalam somente dependências de produção; `tsx` é runtime explícito.
  `braces` recebe proteção local para profundidade/AST, com reprodução automatizada.
- Deploy aplica o delta 0613 em transação. Rollback valida imagens e contrato de
  compatibilidade; monitor e cron estão disponíveis para ativação no host Linux.

## Definições de Supervisão

`fn_genesis_supervisao` usa sessão/RLS e exige gestor da organização ou administrador
de plataforma. A rota aceita apenas filtros conhecidos e usa a organização ativa
validada, sem aceitar `organization_id` do navegador. O client administrativo não
é usado para os agregados.

Fila, comando automático/humano, espera, leads sem atividade e follow-ups vencidos
são fotografias do estado atual. Falhas, passagens, chamadas de IA e negócios
ganhos/perdidos usam o intervalo UTC `[de, até)`, com máximo de 90 dias. A data final
da tela é inclusiva e convertida para a meia-noite UTC seguinte. Réguas vazias
mostram ausência, sem inferir SLA padrão ou alterar o roteamento.

Conversas pessoais e canais desativados não entram no recorte operacional. Os
filtros de responsável e funil representam o vínculo atual do contato/conversa;
não reconstituem a equipe histórica de cada execução. Equipe corresponde aos
atendentes existentes; o produto não possui departamentos cadastráveis.

Passagens usam `passagens_de_atendimento`, que cobre os motores engine e CRM.
Eventos legados `ai.handoff_triggered` completam lacunas sem duplicar o fato da mesma
conversa em uma janela de cinco segundos. O orquestrador passa a preservar o agente
antes de limpar o atendimento automático. Quando não há executor identificado,
a passagem entra no total e fica fora do filtro por agente; essa ausência aparece
na tela. A taxa usa conversas únicas com passagem / conversas com mensagem ou
passagem no período. Atividade de IA não é tratada como resolução.

Falhas incluem jobs mortos, mensagens não enviadas e erros registrados de IA.
Custos são os valores conhecidos da telemetria, em USD; chamadas sem preço são
contadas separadamente e não viram custo zero. Cada indicador consulta a mesma
população do detalhamento; a paginação de 50 linhas não limita o agregado.

## Validação e evidências

A auditoria original permanece em `AUDITORIA-OPERACIONAL-CONTABO-2026-10-10.md`;
suas falhas são evidência histórica anterior às correções. Não devem ser
confundidas com os testes do candidato final.

Verificações locais já executadas durante a implementação:

- baseline integral instalada e reaplicada em PostgreSQL 17 descartável;
- invariantes focados de Supervisão: agregado com 1.205 chamadas, custos ausentes,
  paginação, falhas, passagens dos dois motores, filtros, privilégios e isolamento;
- ensaio real de recuperação PostgreSQL com preservação de ACL e rollback diante
  de erro SQL, perda de registros e mudança de privilégios;
- testes de arquivos/HTTP para retenção, cópia externa, snapshots inválidos,
  alertas deduplicados, recuperação e repetição após falha no receptor;
- testes Linux de backup, permissões, snapshots e restore;
- regressões focadas de agenda, health, fontes, roster, operador e proteção `braces`.

Esses resultados antecedem o SHA final. O gate final deve registrar SHA, comando,
ambiente, resultado e limitações. Os workflows fazem checkout explícito do HEAD
do candidato para build, DB/RLS, regressões, E2E e imagens. Nenhum resultado
histórico de outro SHA aprova esta entrega.

## Living System Checklist — Supervisão e recuperação

1. Alimentação: conversas/contatos, CRM, `llm_calls`, jobs, mensagens e passagens;
   recuperação recebe `pg_dump`, catálogo de segurança e snapshots locais.
2. Saída: Supervisão aponta para Inbox/lead/Uso de IA/Radar; bundle alimenta restore
   e monitor; incidentes alimentam operador/receptor HTTPS.
3. Registro: fontes preservam eventos/auditoria existentes; monitor grava incidentes
   sanitizados; deploy registra SHA, imagens e provas em `.runtime/contabo`.
4. Tela: `SupervisaoAnalise` mostra origem, réguas, indisponibilidade e registros;
   ações no destino seguem suas timelines e auditorias existentes.
5. Porta: navegação existente → `/app/supervisao`; operação de host → scripts
   documentados em `deploy/contabo/README.md`.
6. Anti-morte: links levam à conversa/lead; fonte indisponível oferece retry;
   recuperação incompleta reprova e informa o componente a reparar.
7. Configuração: filtros/réguas na Supervisão; variáveis de operação no `.env`
   do instalador. Sem receptor há somente log local, explicitamente declarado.
8. Continuidade: passagens dos dois motores apontam para a mesma conversa; retomar
   humano/IA permanece nas rotas existentes com suas regras de elegibilidade.
9. Retorno: falha impede deploy/restore; operador investiga a origem e ajusta o
   atendimento. Recuperação do check encerra o incidente, sem alertas repetidos.
10. Mapa: `docs/architecture/genesis-operacao-v177.architecture.json` descreve os
    ciclos fonte → painel → operação e backup → restore → monitor → pessoa.

## Pendências externas autorizadas para depois

Homologar a instalação Linux real e seu volume de dados; configurar domínio/TLS,
Supabase/Auth/SMTP, canais e provedores pagos; escolher armazenamento externo e
receptor definitivo; ativar os agendamentos e medir recuperação com dados reais.
O ensaio sintético não estabelece RTO/RPO nem comprova pareamento ou restauração
de objetos de um provedor gerenciado. Não publicar antes desses checks.

## Rodada de consolidação do candidato

Na primeira rodada do PR #4, o SHA `67ab9979222191cd5a9593e8e9f450e149bc09eb`
passou em build/tamanho, quatro imagens AMD64/ARM64 e DB/RLS integral em PostgreSQL
15 e 17. As partes E2E 4, 5 e 6 passaram, incluindo Supervisão e criação no CRM
em largura mobile. As falhas de tipagem, seletores de marca, fontes e período
da agenda foram corrigidas para nova rodada completa. Esses resultados não
aprovam automaticamente o próximo SHA.

A consolidação acrescenta Tarefas com ações visíveis sem hover e alvos de 44 px,
com jornada mobile de criação, prioridade, conclusão, reabertura e persistência.
Contatos e follow-ups passam a executar suas jornadas operacionais em 390 px.
A agenda mobile escolhe um dia útil futuro pela própria grade de um dia.
Isso não substitui ensaio em aparelho físico, teclado virtual ou medição de INP/LCP.

O ensaio PostgreSQL isolado executou 11 verificações, incluindo projeção estrita
de compatibilidade do catálogo para rollback. Neste ambiente sintético o restore
levou aproximadamente 2 segundos; o valor não representa RTO da produção.
A reversão do script foi exercitada com doubles de Docker/DB; reversão completa
das imagens anteriores e volumes reais permanece na homologação Linux adiada.

As chaves Supabase seguem o contrato existente do instalador Deskcomm. A plataforma
não ganha um configurador alternativo de banco principal em tempo de execução.

## Dependência com correção local

O scanner de dependências continua identificando `braces@3.0.3` como HIGH
(GHSA-vfj7-8cjw-p6xm), porque avalia a versão publicada. O patch pnpm versionado
limita profundidade, tamanho da AST e ciclos, com oito regressões de reprodução.
Isso é uma mitigação local validada; não é um resultado de audit sem achados nem
uma atualização oficial do pacote. As imagens de worker/voz passam a instalar
apenas dependências de produção. A substituição pela correção oficial deve ser
reavaliada quando publicada.

## Acesso em carregamento lento

A navegação local revelou que um clique anterior à hidratação fazia POST nativo
e voltava ao login sem chamar a action. `useAuthFormReady` mantém o submit dos
sete formulários de acesso desabilitado no HTML inicial e o libera após a
hidratação. Preserva o POST e as regras de autenticação, MFA, erros e rate limit
existentes. O teste renderiza o HTML do servidor, hidrata o login real e verifica
o envio pela action e a mensagem de credenciais inválidas.

Checklist dessa alteração: o HTML alimenta a hidratação, que libera as actions
existentes; o registro de acesso permanece nessas actions; erro aparece no
formulário; a porta é login/cadastro/recuperação/MFA. O envio impossível antes
do handler é seu bloqueio preventivo. Não acrescenta configuração, demanda de
atendimento ou transição IA/humano. O retorno é o erro inline e a nova tentativa;
o mapa inclui HTML → hidratação → action → formulário.
