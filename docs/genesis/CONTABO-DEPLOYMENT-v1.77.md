# Contabo — GENESIS TALK v1.77

Runbook canônico: [deploy/contabo/README.md](../../deploy/contabo/README.md).

A rota Genesis constrói source local e fixa `pull_policy: never` em app,
worker, scheduler e voice-agent. O compose upstream continua preservado;
o override Genesis é obrigatório em toda operação. Paths de build são
relativos ao compose de produção na raiz, não à pasta do override.

Supabase externo: `.env` protegido na raiz e `bash deploy/contabo/install.sh --external`.
Single-server: `bash deploy/contabo/install.sh --single-server --domain DOMINIO`.
Atualização: `bash deploy/contabo/deploy.sh`. Sem SSH/domínio/credenciais nesta
sessão, estes comandos são instruções de instalação; não houve deploy Contabo.

O wrapper exporta REPO_URL Genesis. O kit de bootstrap ganhou `--prepare-only`
para reutilizar Supabase oficial/rede/segredos sem executar o instalador Deskcomm.
`deploy.sh` registra commit, config hash, IDs, tags por commit e IDs de rollback.
Não cria release nem publica GHCR. Jobs herdados de escrita em release/GHCR
estão restritos ao repositório upstream; em Genesis ficam inativos.

Fresh install usa baseline, não replay de migrations. Atualização de schema,
restore, acesso real e pairing permanecem gates separados. Sem fingerprint de
banco Aurum/IMOBI, não foi criada bridge nem migration de adaptação.

Living System Checklist (infraestrutura): source/`.env` alimentam o deploy;
o deploy alimenta app/worker/scheduler e o smoke; registros ficam em
`.runtime/contabo`, consumidos pelo operador no runbook. Não há tela nova de
infraestrutura. Falhas encerram o script com causa operacional e preservam
volumes; configuração está no template/runbook. Fluxo IA↔humano existente não
é alterado. Telemetria de erro orienta diagnóstico/reexecução manual.
