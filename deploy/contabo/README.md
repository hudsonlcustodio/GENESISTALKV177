# GENESIS TALK 1.77.0 — Contabo

Release manual do source em `https://github.com/hudsonlcustodio/GENESISTALKV177`.
Não use `docker-compose.prod.yml` sozinho: seus defaults ainda são Deskcomm.
Não execute `update.sh`, `agent.sh` ou o instalador herdado diretamente nesta
release Genesis. Auto-update/GHCR Genesis permanecem **DEFERRED**.

## Pré-requisitos

VPS Linux amd64/arm64; Docker/Compose; git, curl, openssl, jq, ss, getent,
gzip, tar, flock e utilitários GNU. Aproximadamente 4 GB RAM é piso do kit;
8 GB são recomendados. Build local pode exigir swap. O preflight exige 20 GiB
livres para imagens/backups (guardrail, não capacidade medida). DNS A direto
para a VPS, 80/443 livres. Esta rota usa Caddy; proxy já existente precisa de
integração própria validada. Não interrompa o proxy existente para liberar portas.

Clone o repo e faça checkout do commit revisado, mantendo a árvore limpa.
Os scripts exportam `REPO_URL` Genesis e não invocam o clonador Deskcomm.
O override precisa ser usado por último; seus paths são relativos ao PRIMEIRO
compose, que fica na raiz, conforme semântica do Compose.

## A — Supabase externo (gerenciado ou self-hosted em outro servidor)

Prepare um Supabase com `public` vazio. Configure Auth Site URL e redirect
`https://SEU_DOMINIO/auth/confirm`. Preencha `.env` na raiz a partir do template
Contabo; o template contém somente valores fictícios e campos vazios.

```bash
git clone https://github.com/hudsonlcustodio/GENESISTALKV177.git genesis-talk
cd genesis-talk
cp deploy/contabo/.env.example .env
chmod 600 .env
# Preencher credenciais/domínio no servidor; nunca enviar segredos ao Git.
bash deploy/contabo/install.sh --external
```

O wrapper aplica `supabase/baseline.sql` somente se o schema `public` estiver
vazio e cria o primeiro dono com `scripts/bootstrap-owner.ts`. Migrations são
ledger, não instalador histórico. `SUPABASE_DB_ADMIN_URL` é a conexão de schema
e backup; a conexão do app pode ter menos privilégios. A conexão admin é zerada
no ambiente dos processos de app/worker pelo compose herdado.

`OWNER_PASSWORD` é segredo de uso inicial: remova depois do bootstrap.
IA/SMTP são opcionais; recuperação de senha precisa de SMTP configurado no Auth.
Nenhum segredo entra em `NEXT_PUBLIC_*`; anon key é pública por contrato Supabase.

## B — single-server

Instalação nova, sem `.env` nem `.runtime/supabase` existentes:

```bash
git clone https://github.com/hudsonlcustodio/GENESISTALKV177.git genesis-talk
cd genesis-talk
bash deploy/contabo/install.sh --single-server --domain crm.SEU_DOMINIO.com.br
```

Reutiliza `hostgator-setup-kit/install-single-server.sh --prepare-only`: mesma
ref/hash de Supabase, segredos, rede por instalação e Caddyfile single-server.
`--prepare-only` termina antes de chamar o instalador Deskcomm; o wrapper
completa os segredos do app e faz build/deploy Genesis. A senha inicial fica em
`.runtime/admin-credentials`, protegida; não é exibida pelo wrapper.

Se a preparação falhar, inspecione os logs protegidos e o estado criado antes
de retomar. Não apague volumes ou credenciais para recomeçar. Atualizações
usam `deploy.sh`, sem repetir o bootstrap e sem rollback automático de schema.

## Operação e atualização

```bash
bash deploy/contabo/preflight.sh
bash deploy/contabo/deploy.sh
bash deploy/contabo/smoke.sh
```

`deploy.sh` faz backup mesmo se o app estiver parado/ausente, quando não é
fresh install. Usa o kit para dump/WhatsApp/Storage e registra checksums.
Build, subida e smoke ficam em `.runtime/contabo/DATA_UTC/` (permissões privadas).
Não publica imagens. Não aplica migrações novas durante atualização: mudança de
schema exige procedimento específico após backup e clone isolado. As tags locais
são `genesis-talk-{app,worker,scheduler}:1.77.0`; telefonia é explícita via profile
`telefonia`, com `genesis-talk-voice-agent:1.77.0`. Serviços terceiros preservados.
Para `voz`, configure as credenciais do WaCalls antes de ativar o profile.

Comando compose equivalente (manter o override em TODA operação):

```bash
docker compose --env-file .env -f docker-compose.prod.yml -f deploy/contabo/docker-compose.genesis.yml ps
```

No single-server acrescente `-f docker-compose.single-server.yml` ANTES do
override Genesis. Se usa CA própria Supabase, inclua o overlay CA como faz o
wrapper. Nunca execute `config` sem redirecionamento privado: contém secrets.

## Configuração do Supabase

Mantemos o contrato do instalador Deskcomm: URL do projeto, chave pública
anon/publishable, chave service-role/secret e conexão PostgreSQL do mesmo projeto.
As chaves entram no processo de instalação e no `.env` protegido do host. Provedores
IA e SMTP continuam nas telas existentes da plataforma; não há troca de banco em
uma sessão do CRM. O modo single-server continua usando o instalador existente.
O template Contabo mapeia as mesmas variáveis; preserve os segredos de cifra
que o instalador gerou. Nunca use `install.sh` vendor para atualizar uma instalação
Genesis: o deploy manual desta pasta constrói as imagens Genesis.

## Backup, restore e rollback

`hostgator-setup-kit/backup.sh` produz um bundle v2: dump com donos/ACLs,
contrato de schema/RLS, verificações de contagens e manifesto SHA256. Sessões de
canais pareados exigem snapshot não vazio; o modo single-server exige os anexos.
Falha em qualquer componente impede a atualização. `BACKUP_KEEP=14` conserva os
14 bundles completos mais recentes, incluindo as subpastas de deploy.

Configure `BACKUP_OFFSITE_DIR` como uma pasta existente, dedicada a esta
instalação, montada de um armazenamento externo criptografado. O script copia e
verifica o bundle inteiro; falha na cópia reprova o backup. A retenção dessa cópia
externa deve ser configurada no provedor. Um diretório em outro ponto do mesmo
disco não protege contra perda da VPS. Storage gerenciado externo exige também
backup/restore dos objetos pelo provedor; o dump cobre metadados, não os blobs.

Guarde `.env`, credenciais Supabase e chaves de cifra em cofre separado: dados
cifrados dependem delas. Não envie bundles ou arquivos de ambiente ao Git.

Em um clone isolado, vazio, com o mesmo major PostgreSQL (15/17), roles,
extensões e versão Supabase compatíveis, execute:

```bash
bash hostgator-setup-kit/restore.sh /caminho/db-INSTANTE.sql.gz
```

O restore verifica os hashes antes de tocar o banco, exige app/workers/canal
parados e volumes vazios. Executa SQL, contagens e contrato de privilégios na
mesma transação com `ON_ERROR_STOP`. Bancos ocupados e dumps legados são
recusados. Falha de volume após o commit é declarada: repare o volume sem repetir
o banco. Depois confira autenticação, tenants, anexos, pareamento e uma jornada
humana/IA. Supabase gerenciado pode impedir recriar schemas internos; valide
compatibilidade em um projeto descartável antes de escolher esse destino.

Rollback de aplicação:

```bash
bash deploy/contabo/rollback.sh .runtime/contabo/AAAAMMDDTHHMMSSZ
```

O comando valida o registro desta instalação, as imagens anteriores e o contrato
de schema/ACL, preserva imagens de resgate e executa smoke após voltar. O delta
0613 é aplicado na atualização, em transação, com os consumidores pausados.
Na primeira aplicação, a compatibilidade aditiva é provada comparando todo o
catálogo sem as três funções novas. Qualquer outra mudança de schema/permissões
impede rollback automático e exige ensaio em clone. Não executamos down migrations.

## Monitor e agendamento

Preencha `GENESIS_ALERT_WEBHOOK` com o receptor HTTPS autorizado para os alertas.
Sem receptor, os incidentes ficam somente no log local privado; não há notificação
externa. Configure `GENESIS_ALERT_AFTER_FAILURES=3` e
`GENESIS_BACKUP_MAX_HOURS=26`. No host Linux homologado:

```bash
bash deploy/contabo/monitor.sh
bash deploy/contabo/schedule.sh
```

O monitor confere health real, estado/healthcheck de app/worker/scheduler e idade
mais integridade do bundle. A integridade é reconferida a cada bundle novo ou
15 minutos; health e contêineres, a cada minuto. Após três falhas consecutivas,
envia um incidente deduplicado e envia recuperação quando os checks voltam.
Falha no receptor é repetida no próximo ciclo. Logs e estado ficam em
`.runtime/contabo/`, com permissões privadas. O cron instala backup às 02:17 no
fuso do host e monitor a cada minuto, preservando os outros agendamentos.

O ensaio automatizado usa PostgreSQL isolado e dados sintéticos. Seus tempos
não são RTO/RPO da produção. O ensaio com volume real e o receptor definitivo
continuam para a homologação futura autorizada pelo dono.

## Evidência e gate final

Smoke sem autenticação prova TCP, health/version, IDs das imagens executadas,
worker/scheduler healthy e login/health HTTPS com TLS válido. Não prova pairing,
mensagem real, Inbox autenticado, tenant isolation ou jornada humana/IA.
E2E autenticado usa seed canônico e os cinco viewports Genesis; a evidência final
está em `docs/genesis/PRODUCTION-READINESS-v1.77.md`. Não declare produção pronta
sem restore/security/runtime realmente provados.

Para o gate de banco nesta árvore sem releases Genesis, execute em Linux:
`CONFERENCIA_KIT_UPSTREAM_REPO=melgarafael/DeskcommCRM pnpm test:db`.
Isso confere as regras do kit local e das releases históricas do vendor contra
a baseline Genesis; usa refs separados e não habilita o updater/publicação.
