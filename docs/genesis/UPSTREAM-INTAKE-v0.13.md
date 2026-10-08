# GENESIS TALK — Upstream Intake & Reconciliation v0.13

## Estado real

Comparação exata do ZIP atual do Deskcomm com o GENESIS v0.12:

- Deskcomm atual: **6712** arquivos analisados
- Genesis v0.12: **5700**
- Só no Deskcomm atual: **1105**
- Só no Genesis: **93**
- Compartilhados e alterados: **1195**
- Compartilhados idênticos: **4412**

Banco:
- migrations SQL atuais: **400**
- migrations SQL no Genesis anterior: **312**
- migrations novas por nome: **88**
- nenhum arquivo de migration compartilhado foi deliberadamente reescrito nesta integração.

## Decisão

A v0.13 usa o ZIP atual do Deskcomm como **nova base técnica**. O Genesis anterior
não é sobreposto inteiro: isso regrediria features upstream modernas.

Foram preservados os artefatos canônicos Genesis (decisões, evidências,
caracterizações e referência de marca) e reaplicados comportamentos proprietários
sobre o código atual.

## Mudanças executadas

1. Dependências, lockfile, migrations, baseline, APIs, testes e operação passam a
   vir da base atual.
2. Branding Genesis foi reaplicado sobre o motor white-label atual, preservando
   resolução runtime e `logoDarkUrl`.
3. O `FlowCanvas` atual foi mantido (incluindo `collect`, `internal_task`, `skill`,
   `settings`, `surface` e bottom sheets mobile) e recebeu novamente:
   - Undo de até 100 snapshots;
   - settings incluído no snapshot;
   - snapshot no início do drag;
   - Desconectar box sem apagar o nó.
4. Foi criada regressão mobile para 360/375/390/412/430 px em rotas P0.
5. Kanban passou a conter o scroll horizontal dentro do board com snap/touch,
   sem exigir overflow estrutural da página.
6. Contatos recebeu padding mobile-first.
7. Foi criada a primeira superfície **Supervisão 360**, manager+, reutilizando
   fontes existentes e autorizadas: conversation counts, presença/carga da equipe,
   performance por atendente e operator metrics de IA.
8. O README Genesis foi refeito sem alegar parcerias/release status do upstream.

## Banco

O `supabase/migrations/MANIFEST.md` atual registra que a cadeia histórica não é
o caminho suportado para construir fresh install do zero. Para self-host novo,
o Genesis passa a tratar `supabase/baseline.sql` atual como fonte do schema
inicial. Migrations continuam sendo ledger de evolução.

Upgrade de instalação Aurum existente continua separado e depende de fingerprint
do banco real.

## Gates

- Upstream intake estrutural: PASS
- Merge cego evitado: PASS
- Preservação de features modernas do FlowCanvas: STATIC PASS
- Genesis Undo/disconnect reaplicado: STATIC PASS
- Supervisão 360 MVP: IMPLEMENTED / runtime pending
- Mobile regression suite: IMPLEMENTED / execution pending
- lint/typecheck/unit/build: PENDING ambiente com dependências
- DB/RLS/E2E/restore: PENDING
- Production-ready: BLOCKED

## Próximas frentes

W2 Mobile: Contacts mobile cards, Kanban gesture QA, Agenda, Tasks, composer/keyboard
e follow-up mobile operational validation.

W3 Supervisão: contratos explícitos de SLA/handoff/falhas/freshness, drill-down,
load budget e tenant-isolation tests.
