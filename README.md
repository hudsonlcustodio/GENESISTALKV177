# GENESIS TALK v1.77

GENESIS TALK é uma plataforma multi-tenant de atendimento, CRM, automação e
agentes de IA, baseada no DeskcommCRM, com identidade Genesis e operação
self-hosted. A versão 1.77 reconcilia o Genesis v0.13 com a base técnica fornecida
em `DeskcommCRM-main1-77.zip`, preservando os contratos de compatibilidade.

## Estado do candidato

**Candidato validado em CI; homologação na Contabo pendente.** Aplicação e imagens
não foram publicadas. A homologação no servidor foi adiada pelo proprietário.

| Referência             | Valor                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tag do código validado | [`genesis-v1.77.0-rc.1`](https://github.com/hudsonlcustodio/GENESISTALKV177/tree/genesis-v1.77.0-rc.1)                                           |
| Commit validado        | [`c390327b3e9f89985c974b314587988587d86724`](https://github.com/hudsonlcustodio/GENESISTALKV177/commit/c390327b3e9f89985c974b314587988587d86724) |
| Revisão da entrega     | [PR #4](https://github.com/hudsonlcustodio/GENESISTALKV177/pull/4)                                                                               |

Os resultados abaixo pertencem a esse SHA. Atualizações posteriores apenas de
documentação não alteram a tag nem ampliam o alcance da validação.

## O que foi concluído

- **Supervisão 360:** 15 populações operacionais de atendimento humano e IA,
  filtros, paginação, detalhamento, custos/tokens e acesso aos registros de origem.
  Organização, permissões de gestor e isolamento RLS são validados no servidor.
- **Experiência mobile e marca:** jornadas de Inbox, CRM, contatos, agenda,
  tarefas e follow-up; verificações em larguras de 360 a 430 px; identidade
  Genesis oficial, preservando configurações existentes de white-label.
- **Agenda e acesso:** compromissos em andamento classificados em Próximos;
  formulários de autenticação aguardam a hidratação antes de liberar preenchimento
  e envio, evitando POST nativo e perda dos campos.
- **Health e recuperação:** checks autenticados de REST/Auth; backup v2 com
  donos, ACL, schema/RLS, contagens e SHA256; restore recusa destinos ocupados,
  arquivos adulterados e bundles incompletos.
- **Operação:** deploy manual registra SHA e imagens; rollback exige prova de
  compatibilidade; monitor verifica serviços e backups, deduplica incidentes e
  sinaliza recuperação. Cron e alertas estão preparados para configuração no host.

Os contratos GEN-001..023 continuam orientando regressões de handoff, realtime,
suporte, LGPD e segurança de efeitos externos. A vertical imobiliária IMOBI
permanece fora desta entrega do produto geral.

## Validação do código

Os cinco workflows passaram no commit `c390327`:

| Gate                                                                                       | Evidência                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Tipagem, lint, unitários, shell e DB/RLS PostgreSQL 15/17, incluindo atualização com dados | [CI aprovado](https://github.com/hudsonlcustodio/GENESISTALKV177/actions/runs/38099542262)       |
| Governança, build e 11 verificações de recuperação                                         | [Quality aprovado](https://github.com/hudsonlcustodio/GENESISTALKV177/actions/runs/38099542233)  |
| E2E em seis partes e capturas mobile finais                                                | [E2E aprovado](https://github.com/hudsonlcustodio/GENESISTALKV177/actions/runs/38099542241)      |
| Build e tamanho                                                                            | [Build aprovado](https://github.com/hudsonlcustodio/GENESISTALKV177/actions/runs/38099542239)    |
| Imagens e verificações de runtime AMD64/ARM64                                              | [Imagens aprovadas](https://github.com/hudsonlcustodio/GENESISTALKV177/actions/runs/38099542244) |

Os jobs de publicação de imagens foram intencionalmente ignorados. As capturas
finais estão no artefato `evidencia-parte-6` do E2E; capturas versionadas em
`evidence/finalizacao-v177` são históricas e têm a origem indicada.

Uma prova local adicional de Realtime confirmou atualização pelo socket sem
reload, com controle negativo usando token anônimo. A spec original continua
fora do CI; as cinco exclusões e seus motivos estão declarados no
[workflow E2E](.github/workflows/e2e.yml). Dispositivos físicos e métricas de
desempenho mobile ainda não foram medidos.

O restore PostgreSQL sintético levou **394 ms**. Esse valor não representa RTO
de produção; recuperação de volumes reais e rollback completo para imagens
anteriores ainda exigem ensaio no ambiente de homologação.

**Dependência com achado aberto:** `braces@3.0.3` recebe um patch local com oito
reproduções automatizadas, mas o audit continua sinalizando a versão como HIGH.
Veja o [advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Instalação e configuração

A rota de instalação e atualização manual está no
[guia Contabo](deploy/contabo/README.md), com opções de Supabase externo ou
single-server. O guia inclui preflight, deploy, smoke, backup, restore, rollback
e monitoramento. Use os wrappers e o override Genesis descritos nele.

O Supabase segue o fluxo existente do instalador Deskcomm: URL do projeto, chave
pública anon/publishable, chave service-role/secret e conexão PostgreSQL do mesmo
projeto entram na instalação e no `.env` protegido do host. IA e SMTP mantêm as
telas existentes da plataforma. Segredos e credenciais geradas não entram no Git.

Instalações novas usam [supabase/baseline.sql](supabase/baseline.sql). As migrations
mantêm o histórico de evolução. Bancos Aurum/IMOBI existentes precisam de um
fingerprint real do schema antes de qualquer migração de compatibilidade.

**Atualização automática/GHCR: adiada na v1.77.** O código herdado permanece para
compatibilidade, mas o canal de publicação Genesis ainda exige validação.
Instalação e atualização desta entrega seguem a rota manual Contabo; não execute
diretamente o instalador, `update.sh` ou `agent.sh` herdados.

## Pendências antes da publicação

1. Homologar a instalação na VPS Contabo e configurar domínio, DNS, TLS e redirects
   de autenticação.
2. Conectar Supabase/Auth/SMTP e provedores reais; parear e validar os canais.
3. Configurar armazenamento externo criptografado, receptor de alertas e cron no
   servidor de homologação.
4. Ensaiar restore com dados, objetos e volumes reais; testar rollback completo e
   medir RTO/RPO nesse ambiente.

## Documentação

- [Finalização operacional: definições, implementação e limites](docs/genesis/FINALIZACAO-v1.77.md).
- [Instalação e operação Contabo](deploy/contabo/README.md).
- [Estado do projeto](docs/genesis/PROJECT-STATE.md).
- [Reconciliação com a base Deskcomm](docs/genesis/UPSTREAM-RECONCILIATION-v1.77.md).
- [Escopo mobile e Supervisão 360](docs/genesis/PRD-MOBILE-FIRST-SUPERVISAO-360-v0.12.md).
- [Gate de release](docs/genesis/RELEASE-GATE-v0.8.md).
- [Decisão sobre atualização automática](docs/genesis/AUTO-UPDATE-DEFERRED-v1.77.md).
- [Índice técnico](docs/index.md) e [contrato de contribuição](AGENTS.md).

## Origem e licença

GENESIS TALK deriva do [DeskcommCRM](https://github.com/melgarafael/DeskcommCRM)
e preserva a licença original e os contratos técnicos de compatibilidade. O
[README upstream recebido](docs/upstream/DESKCOMM-README-at-intake-v1.77.md)
permanece arquivado. Cookies legados, headers de webhook e nomes de migrations
mantêm seus identificadores quando necessários à compatibilidade.

## Guias de desenvolvimento

Os guias herdados `deskcomm-*` orientam contribuição e manutenção da base técnica.
No Codex, a forma explícita de chamar um deles é `$deskcomm-instalar`; para o
deploy Genesis, use o guia Contabo acima, com o override Genesis.
Quem desenvolve os guias pode ligá-los ao clone revisado:

```bash
bash scripts/instalar-guias.sh --fonte .
```

Guias copiados **não** se atualizam sozinhos: execute a instalação novamente
após revisar a fonte. Um link criado com `--fonte` acompanha essa árvore.
No Claude Code, o guia global instalado vale mais que o do clone aberto;
quem edita a fonte deve usar o link para o clone revisado ou remover a instalação
global. Para desfazer somente os guias que o script registrou:

```bash
bash -s -- --remover < scripts/instalar-guias.sh
```
