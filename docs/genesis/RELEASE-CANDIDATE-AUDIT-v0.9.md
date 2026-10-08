# GENESIS TALK — Release Candidate Audit v0.9

## Ambiente
- Node disponível: **True**
- npm disponível: **True**
- Lockfiles: **pnpm-lock.yaml**
- `node_modules` disponível no artefato: **False**

## Execução de quality gates
- Gates executados: **0**
- Aprovados: **0**
- Falharam: **0**
- Execução bloqueada por dependências ausentes: **True**

Não foi executado `npm install`/`npm ci` via rede nesta auditoria. Portanto, se o
artefato não contém dependências, lint/typecheck/tests/build permanecem PENDING.

## Validação estática dos deltas Genesis
- Checks avaliados: **15**
- Checks booleanos aprovados: **14**
- Arquivos com merge markers: **0**

## Classificação
**RELEASE CANDIDATE: BLOCKED** enquanto lint/typecheck/unit/invariants/build não
forem executados com dependências reproduzíveis e enquanto os gates runtime,
RLS, restore e rollback aplicáveis não tiverem evidência.

## Próximo comando em ambiente de CI/dev completo
```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:invariants
npm run build
```

Depois: DB/RLS, smoke/E2E, migration/restore e rollback conforme o release gate.

## Evidência
`docs/genesis/evidence/release-candidate-audit-v0.9.json`
