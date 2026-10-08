# GENESIS TALK 1.77 — handoff após execução Codex

Data: 2026-10-08. Decisão de produção: **BLOCKED**.
Consulte `PRODUCTION-READINESS-v1.77.md` e o JSON em `evidence/` para gates,
comandos, resultados e limites da prova. Os antigos relatórios v0.x não aprovam
esta árvore.

## Entrega concreta

Source extraído do ZIP Genesis, dependências congeladas instaladas e repositório
Git inicializado em `main`, origin `hudsonlcustodio/GENESISTALKV177`.
A versão é 1.77.0. Não foi criado release, tag publicada ou canal GHCR/updater.
O ZIP upstream serviu para conferência e fixture de calibração; não substituiu
o source Genesis inteiro.

`deploy/contabo/` contém rota manual, template sem segredos, preflight, builds
locais, bootstrap, backup e smoke. External exige Supabase pronto e schema
public vazio. Single-server reaproveita a preparação oficial do kit e termina
antes do instalador Deskcomm. Atualizações não reaplicam a baseline.

Supervisão diferencia loading, indisponibilidade e zero medido, informa atualização
de cada fonte e consulta por organização com polling de 30 segundos. Follow-up
tem testes de desconexão sem apagar nó, configurações, exclusão, movimento,
Undo limitado a 100 estados e tipos modernos/receipt de publicação.
O recibo testado é de componente; publicação real em provedor ainda exige E2E.

As 26 traduções espanholas ausentes foram acrescentadas. Controles/foco/seleção
usam tons com contraste suficiente, mantendo as âncoras oficiais Genesis.
Os testes preservam a calibração upstream e medem também a régua Genesis.
O workflow de qualidade utiliza a action preparada existente; os jobs de escrita
de release/GHCR exigem o repositório upstream. A comparação exata dos gatilhos
permanece ativa, inclusive para o job Genesis.

## Próxima execução necessária

1. Use Linux com memória/swap suficientes e Docker funcional. Complete
   `pnpm gov:verify`, `pnpm build` e `pnpm test:shell`, sem excluir testes.
2. Execute `pnpm test:db` para install/update da baseline, invariantes e RLS.
   Migrations históricas são ledger; não replay todo histórico na instalação.
3. Suba Supabase local isolado e gere `.env.e2e` com `pnpm e2e:env`. Use o seed
   canônico; rode as jornadas autenticadas e `genesis-mobile-first.spec.ts` em
   360/375/390/412/430 px. Confirme Inbox, Kanban, Supervisão e Follow-up em tela.
4. Construa app, worker e scheduler do mesmo commit. Telefonia é opcional e exige
   credenciais/integração reais antes de construir/ativar voice-agent.
5. Defina VPS, domínio/DNS, modo de banco e acesso administrativo. O operador
   preenche segredos diretamente no servidor/cofre, nunca neste repositório.
6. Em ambiente isolado, prove backup e restore de banco/Storage/WhatsApp/chaves,
   login, tenants, mensagens e anexos; registre tempos e evidência. Depois prove
   smoke HTTPS, IDs, workers/scheduler e rollback compatível com o schema.

Não há evidência de migração ou restore sobre banco de produção. Nenhum volume
de produção foi apagado. Não há RTO/RPO afirmado nesta entrega.

## Instalação na Contabo após fechar os gates

Single-server novo, portas livres e DNS apontando à VPS:

```bash
git clone https://github.com/hudsonlcustodio/GENESISTALKV177.git genesis-talk
cd genesis-talk
# Faça checkout do commit revisado registrado na evidência.
bash deploy/contabo/install.sh --single-server --domain crm.SEU_DOMINIO.com.br
```

External: preencha `.env` a partir de `deploy/contabo/.env.example`, proteja
com `chmod 600 .env` e execute `bash deploy/contabo/install.sh --external`.
Leia `deploy/contabo/README.md` para operação, proxy, backup e recuperação.
