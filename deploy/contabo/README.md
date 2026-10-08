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

## Backup, restore e rollback

`hostgator-setup-kit/backup.sh` salva banco comprimido com validação gzip,
sessões WhatsApp e Storage no modo single-server. Um dump íntegro não prova
restauração. Retenção padrão do kit: 14 por tipo; atualizações Genesis usam
subpasta por execução e exigem política de retenção/cópia externa do operador.
Nunca commite backups. Salve `.env`, `.runtime/admin-credentials`, credenciais
Supabase e chaves de cifra em cofre separado: dados cifrados dependem delas.

Restore: use `hostgator-setup-kit/restore.sh` num clone isolado, com banco,
volumes, rede e domínio de teste; confira auth, tenants, anexos e sessões.
Registre tempos observados. O restore do kit altera dados e deve ser executado
somente no destino isolado escolhido. Não há RTO/RPO afirmado nesta entrega.

Rollback do app: `.runtime/contabo/DATA/previous-images` guarda IDs anteriores
e `rollback-DATA` preserva as imagens antes do build. Reaplique cada ID à tag
`genesis-talk-SERVICO:1.77.0` e execute o mesmo compose `up -d --no-build --wait`;
depois rode smoke. Verifique compatibilidade do schema; não faça down migration.

## Evidência e gate final

Smoke sem autenticação prova TCP, health/version, IDs das imagens executadas,
worker/scheduler healthy e login/health HTTPS com TLS válido. Não prova pairing,
mensagem real, Inbox autenticado, tenant isolation ou jornada humana/IA.
E2E autenticado usa seed canônico e os cinco viewports Genesis; a evidência final
está em `docs/genesis/PRODUCTION-READINESS-v1.77.md`. Não declare produção pronta
sem restore/security/runtime realmente provados.
