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

Código revisado e banco aprovado: `615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9`. A prova E2E
vem de `386d3d295438de53f5eb36ad4db41621a794f9f7`; o diff até a revisão final
altera somente a medição unitária de menu e metadados do workflow das imagens.
Runtime, specs/seeds E2E e banco/invariantes são idênticos. Unitários/cercas:
21.460 aprovados; E2E: 486 aprovados; DB: 3.261 em cada major. Limitações,
durações, IDs e estados finais de gov:verify/build constam no relatório/JSON.

`deploy/contabo/` contém rota manual, template sem segredos, preflight, builds
locais, bootstrap, backup e smoke. External exige Supabase pronto e schema
public vazio. Single-server reaproveita a preparação oficial do kit e termina
antes do instalador Deskcomm. Atualizações não reaplicam a baseline.

Supervisão diferencia loading, indisponibilidade e zero medido, informa atualização
de cada fonte e consulta por organização com polling de 30 segundos. Follow-up
tem testes de desconexão sem apagar nó, configurações, exclusão, movimento,
Undo limitado a 100 estados e tipos modernos/receipt de publicação.
O recibo testado é de componente; publicação real em provedor ainda exige E2E.

As 27 traduções espanholas ausentes foram acrescentadas. Controles/foco/seleção
usam tons com contraste suficiente, mantendo as âncoras oficiais Genesis.
Os testes preservam a calibração upstream e medem também a régua Genesis.
O workflow de qualidade utiliza a action preparada existente; os jobs de escrita
de release/GHCR exigem o repositório upstream. A comparação exata dos gatilhos
permanece ativa, inclusive para o job Genesis.

## Próxima execução necessária

1. Consulte os resultados finais e os SHAs no relatório/JSON. Não repita checks
   já aprovados sem mudança ou preocupação nova. Complete somente gates
   pendentes/falhados, com evidência de causa e sem remover testes.
2. Resolva o HIGH de `braces@3.0.3` com correção validada quando disponível;
   `audit --prod` limpo não neutraliza o audit completo nem a árvore de fundo.
3. Reconcilie o acervo de release em tarefa de canal/versão: o check herdado
   falha com 33 fragmentos e 31.331 bytes contra teto de 30.000. Não apague
   fragmentos nem aumente o limite para esconder o erro. Auto-update segue adiado.
4. Defina VPS, domínio/DNS, modo de banco e acesso administrativo. O operador
   preenche segredos diretamente no servidor/cofre, nunca neste repositório.
   Migrations são ledger: fresh usa baseline em public vazio; banco existente
   exige fingerprint e procedimento específico. Não foi criada bridge.
5. Construa no destino app/worker/scheduler do commit revisado, com APP_VERSION
   1.77.0. Telefonia é opcional, exige credenciais/integrações reais e profile
   explícito. Registre os IDs e o config hash próprios da VPS.
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
git checkout 615c9a1c4c746bd981ee22c1c9aa53004d6b9bd9
bash deploy/contabo/install.sh --single-server --domain crm.SEU_DOMINIO.com.br
```

External: preencha `.env` a partir de `deploy/contabo/.env.example`, proteja
com `chmod 600 .env` e execute `bash deploy/contabo/install.sh --external`.
Leia `deploy/contabo/README.md` para operação, proxy, backup e recuperação.
