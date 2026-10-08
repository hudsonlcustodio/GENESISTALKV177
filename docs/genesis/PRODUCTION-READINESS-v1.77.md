# GENESIS TALK v1.77 — resultado dos gates

Decisão: **BLOCKED**. Registro UTC: 2026-10-08T22:46:23.375591+00:00.
Source executável: **`615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9`**, branch `main`, [repositório](https://github.com/hudsonlcustodio/GENESISTALKV177).
O commit posterior de evidências não altera source executável. O SHA final do push consta no Git e na resposta da sessão.
Nenhuma VPS, domínio/DNS, SSH ou credencial de banco de produção foi fornecida.
Não houve deploy Contabo, release, tag publicada, publicação GHCR Genesis ou ativação de auto-update.

## Gates

| Gate | Resultado | Escopo e limite da prova |
| --- | --- | --- |
| INSTALL | **PASS** | pnpm install --frozen-lockfile; lockfile preservado byte a byte. |
| GOV_VERIFY | **PASS** | Comando completo em Linux: typecheck, lint, canais, papéis e toda a suíte unitária. |
| BUILD | **PASS** | Build Next de produção no CI Linux; sem aprovar tentativas locais interrompidas. |
| UNIT | **PASS** | Três partes da suíte unitária integral; testes focados complementares. |
| INVARIANTS | **PASS** | Invariantes PostgreSQL reais em 15 e 17; STOP manual exige cancelamento e idempotência. |
| DB | **PASS** | Baseline INSTALL/UPDATE e update.sh com dados em bancos isolados efêmeros; não em produção. |
| RLS/TENANT | **PASS** | RLS, isolamento, suporte readonly e governança do banco cobertos pela suíte PostgreSQL. |
| SHELL | **PASS** | Cercas estruturais e suíte completa Bash em Linux. |
| E2E | **PASS** | Seis partes autenticadas com Supabase local, Mailpit e stubs canônicos; integrações externas reais permanecem fora desta prova. |
| MOBILE | **PASS** | Oito rotas em 360/375/390/412/430 px; suíte celular verifica controles, composer, focus, drawer e navegação. |
| DOCKER_BUILD | **PASS** | Quatro Dockerfiles, amd64 e arm64; boot do app, extração PDF e sondas de import/cron no CI. IDs são locais; os quatro builds finais usam APP_VERSION=1.77.0. |
| COMPOSE_CONFIG | **PASS** | Overlays external/single-server resolvidos; quatro tags Genesis, contexto raiz, pull_policy never e voz opcional. |
| SMOKE | **BLOCKED** | VPS, domínio/DNS, TLS e credenciais de produção não fornecidos; smoke Contabo não executado. |
| BACKUP | **BLOCKED** | Procedimento implementado/documentado; nenhum backup do ambiente de destino gerado. |
| RESTORE | **BLOCKED** | Sem banco/volumes/chaves do destino para ensaio isolado de restauração; RTO/RPO não medidos. |
| SECURITY | **FAIL** | Audit completo: braces 3.0.3 HIGH sem patch publicado. Audit --prod e secret scan passaram; não anulam o achado. |
| BRANDING | **PASS** | Régua lime, contraste real, saída/marca configurável, SVG nos dois temas e jornada de signup Genesis. |
| SUPERVISAO | **PASS** | Manager+, organização do servidor, fontes existentes, polling 30 s, freshness/erro explícitos e acesso mobile. Carga real de produção não medida. |

Comandos, exit codes, durações, referências, tentativas antigas e proveniência estão no
[JSON de evidência](evidence/production-readiness-v1.77.json). Pendência não é PASS.
Unitários/cercas: 21.460 testes aprovados, 2.067 arquivos, uma falha esperada e dois skips.
E2E: 486 aprovados, sete skips declarados, zero falhas; cinco larguras × oito rotas.
Resumos e linhas das cinco provas mobile: [ci-results-v1.77.txt](evidence/ci-results-v1.77.txt).
Os resultados PostgreSQL são bancos efêmeros de CI; E2E usa serviços locais e stubs, não credenciais de fornecedores.
DB usa o source final `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9`. E2E usa a prova do commit
`386d3d295438de53f5eb36ad4db41621a794f9f7`: o diff até o source final tem somente
`tests/unit/interface-por-empresa.test.ts` e `.github/workflows/publish-image.yml`. Runtime, specs/seeds E2E, SQL/invariantes
e scripts DB são idênticos; a equivalência e o SHA de cada execução estão no JSON. Não há execução E2E alegada no SHA novo.
As cinco specs que o workflow canônico declara fora do CI mantêm essa limitação explícita.
A suíte unitária mantém uma falha esperada preexistente em `agenda-separar-historico.test.tsx`:
compromisso em andamento ainda é classificado por início, em vez de término. PASS da suíte não afirma correção dessa dívida.

## Correções por arquivo e domínio

- `deploy/contabo/{common,preflight,install,deploy,smoke}.sh`, `.env.example`, `docker-compose.genesis.yml`, `README.md` e `hostgator-setup-kit/install-single-server.sh`: rota manual Genesis, Supabase externo/single-server, `--prepare-only`, validação de host/segredos/DNS/portas, baseline só em schema vazio, bootstrap, backup prévio, imagens/rollback e smoke. Não há replay histórico nem bridge Aurum/IMOBI sem fingerprint.
- `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent`, `.dockerignore` e `.gitignore`: labels Genesis e exclusão de env, caches, chaves, dumps e backups. `pull_policy: never` aplica-se aos quatro serviços próprios no overlay.
- `.github/workflows/{release,publish-image,ci,genesis-quality,e2e}.yml`, `scripts/pr-mexe-na-imagem.sh` e testes de guards: publicação restrita ao vendor, builds/smokes locais e artefatos de IDs em ambas arquiteturas, gate de qualidade completo e inclusão da spec Genesis mobile. O agregador exige sucesso dos builds mesmo quando publicação é pulada.
- `app/app/supervisao/_components/Supervisao360Client.tsx`, `hooks/team/useAttendants.ts`, `hooks/metrics/useAttendantMetrics.ts` e `tests/unit/genesis-supervisao-fontes.test.tsx`: queries por organização, polling 30 s, loading/erro distintos de zero e timestamp por fonte. Mantidos RBAC e scoping server-side existentes.
- `lib/followup/{reactivity,node-handlers,vocabulario}.ts`, `reactivity-dormente.test.ts` e `tests/invariants/followup-reactivity.test.ts`: STOP cancela também pausa manual; mensagem comum/handoff preservam a pausa. O teste SQL antes marcado como falha esperada agora exige cancelamento e idempotência. Adapter de teste respeita os status como o client real. Nenhuma migration foi alterada.
- `app/onboarding/page.tsx`, `hooks/inbox/useMarkAsRead.ts`, `hooks/realtime/useRefetchDeSeguranca.ts`: suporte ativo não inicia onboarding; read-only/permissão impede marcar leitura; query keys equivalentes não reiniciam o timer de segurança. Testes de compatibilidade atualizados para APIs modernas, transição de organização, autenticação realtime e pausa humana unificada de 60 minutos.
- `tests/unit/genesis-followup-history.test.tsx`: cinco testes exercitam o FlowCanvas real, desconexão sem apagar nó, exclusão, movimento, configuração e Undo limitado a 100 estados. O recibo de publicação testado como componente não prova publicação externa real.
- `lib/i18n/dicionario.ts`, `app/globals.css`, `lib/branding/regua-do-produto.ts`, testes de contraste/marca e `tests/fixtures/branding-sage-calibration.css`: 27 traduções espanholas; rampa oficial preservada com seleção/foco/controles de contraste suficiente; fixture vendor preserva 26 canários e a régua Genesis tem provas próprias. Caminhos Windows normalizados no teste de chip.
- `lib/navigation/catalogo.ts`, testes unitários de navegação e `tests/e2e/{navegacao,genesis-mobile-first,signup-journey,logo-moldura-no-tema-escuro}.spec.ts`: Supervisão no menu de uso diário, Meta Ads no hub/busca com RBAC, mesma densidade e gate de dobra 900px; oito rotas em cinco larguras, login com seletor exato e expectativas explícitas GENESIS TALK.
- `tests/e2e/jev-{pedidos,roteador}.spec.ts`: fixtures de provider com nomes explicitamente fictícios. `scripts/genesis-secret-scan.py`: padrões precisos e caminhos proibidos antes dos pushes, com resultados sem valores sensíveis.
- `scripts/conferir-isolamento-do-kit.sh`: conferência separada contra releases históricas do vendor para os testes de banco; isso não aponta o updater Genesis ao vendor.
- `README.md`: guias opcionais de desenvolvimento, instalação/remoção corretas e deploy Genesis canônico. 121 scripts/hooks tiveram o bit executável restaurado no índice Git, necessário no clone Linux. Baseline, lockfile, engines e 464 migrations permaneceram intactos.

O inventário exato de arquivos com conteúdo alterado/adicionado e de exclusões de versionamento está em
[source-changes-v1.77.json](evidence/source-changes-v1.77.json). A comparação byte a byte de baseline/lockfile/migrations está em
[source-integrity-v1.77.json](evidence/source-integrity-v1.77.json).

## Banco

Modo comprovado: PostgreSQL 15 e 17 efêmeros, isolados no CI. Testes verificam baseline INSTALL/UPDATE,
update com dados, RLS/tenant, suporte readonly e invariantes; resumos sanitizados em
[db-results-v1.77.txt](evidence/db-results-v1.77.txt). O SHA e conclusão de cada job constam no JSON.
O resultado histórico com falha esperada de STOP é mantido como histórico; não aprova a correção final.
O banco de destino, fresh/existing e fingerprint real não foram fornecidos; não foi criada bridge.

## Docker

| Nome local | Arquitetura | Image ID | Source SHA |
| --- | --- | --- | --- |
| `genesis-talk-scheduler:1.77.0` | amd64 | `sha256:1679f4531f418323e60e19800e5b90ceba5394a0d432aff7c7be8ad58c66e5c3` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-voice-agent:1.77.0` | amd64 | `sha256:7e135c58679ca40826b350c3d5951ea9e89ce67e009b06a0de36733cabaae96e` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-worker:1.77.0` | amd64 | `sha256:c6aeaadf260519906931b15ad9640ccc214205379b26698467fee74dd36d65d6` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-app:1.77.0` | amd64 | `sha256:39a3ea4759a250cd77d2fa99f3c32f7faf0413f46f40411b21524858504d45e9` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-app:1.77.0` | arm64 | `sha256:ed57dd7387bb51521d0398595da997fb91839ee0b899678a9def058df4bac349` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-scheduler:1.77.0` | arm64 | `sha256:cd22524c0583d4ae874ebbdbec73940cd4e5aea3a66e3859a49d8b16a37ce171` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-voice-agent:1.77.0` | arm64 | `sha256:c9f14111d00b52c22b4715882a3fe52daef90911797325c8b3314f24b6fce9f1` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |
| `genesis-talk-worker:1.77.0` | arm64 | `sha256:d4a1eef7a8a6c20f05f7a1c7ec73d4f70be91c66fd807870204cbc6727ff14ce` | `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9` |

IDs são digests de configuração local, não manifest digests de registry. Não há RepoDigest/publicação.
Os quatro builds finais do CI e o overlay Contabo usam `APP_VERSION=1.77.0`.
As tentativas antigas com metadado dev foram substituídas por evidência final. As imagens listadas provam os Dockerfiles no CI;
o deploy de destino deve reconstruir e registrar seus próprios IDs/config hash.
Hashes Compose locais: external `cd1baff9ea70d3b9c43b2a33e759fbb340fe0e0c4d608411618bfc5cb7e9c3c5`;
single-server `d3c8fc56ef67a6a4804edb70d69fee3982a77c892bc7e1cf8074d774a7f9bafb`. Incluem paths Windows e não devem ser comparados
literalmente ao hash resolvido na VPS Linux. Nenhum env real foi persistido no relatório.

## Instalar após resolver os blockers

Linux novo, DNS direto e 80/443 livres:

```bash
git clone https://github.com/hudsonlcustodio/GENESISTALKV177.git genesis-talk
cd genesis-talk
git checkout 615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9
bash deploy/contabo/install.sh --single-server --domain crm.SEU_DOMINIO.com.br
```

Supabase externo já preparado, após o mesmo clone/checkout:

```bash
cp deploy/contabo/.env.example .env
chmod 600 .env
# Preencher domínio e segredos diretamente no servidor/cofre.
bash deploy/contabo/install.sh --external
```

Runbook completo: [deploy/contabo/README.md](../../deploy/contabo/README.md).
Os comandos estão preparados; não foram executados na Contabo nesta sessão.

## O que bloqueia produção

- Check adicional `RELEASE_ACERVO`: o acervo de 33 fragmentos termina em 31.331 bytes contra o teto de 30.000 do updater herdado. O CI geral permanece vermelho por esse check, mesmo quando os testes unitários passam. Cortar uma nova versão/consumir fragmentos pertence à reconciliação do canal de release adiado; não foi feito para disfarçar a falha.
- Audit completo falha por `braces@3.0.3`, HIGH, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), sem patch publicado na consulta. As duas cadeias são devDependencies na raiz, mas imagens de fundo instalam a árvore completa; exposição de runtime não foi descartada. Audit `--prod` teve zero achados. Sem suppression, versão inventada ou alteração não validada do lockfile.
- Falta destino Contabo/domínio/DNS/acesso e modo/fingerprint de banco. Smoke HTTPS, configuração real, pairing e integrações com credenciais reais não foram provados.
- Nenhum backup de destino, restore isolado de banco/Storage/WhatsApp/chaves ou exercício real de rollback. Não há RTO/RPO medidos.
- Qualquer gate pendente/falho na tabela continua bloqueando até nova evidência vinculada ao source.

No Windows, a suíte integral foi limitada a 1800 s, typecheck esgotou heap/foi interrompido,
Docker perdeu conexão e E2E recusou iniciar sem configuração. Esses fatos permanecem registrados;
sucessos Linux só substituem a prova do respectivo escopo. Não apague volumes para repetir uma tentativa.
