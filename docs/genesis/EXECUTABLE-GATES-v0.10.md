# GENESIS TALK — Executable Gates v0.10

## Resultado
| Gate | Estado | Exit |
|---|---|---:|
| dependency_install | FAIL | 1 |
| lint | BLOCKED | None |
| typecheck | BLOCKED | None |
| test_invariants | BLOCKED | None |
| test_unit | BLOCKED | None |
| build | BLOCKED | None |

## Regra
Dependências foram solicitadas pelo `pnpm-lock.yaml` com `--frozen-lockfile`.
Nenhum gate é marcado PASS sem exit code 0. Build é adiado se gates fundamentais
falham, evitando esconder erro anterior com ruído de compilação.

## Evidência
`docs/genesis/evidence/executable-gates-v0.10.json` contém stdout/stderr capturados.

## Estado de release
Um RC só pode ser promovido depois de lint, typecheck, invariants, unit e build PASS,
seguido dos gates aplicáveis de DB/RLS, smoke/E2E, restore e rollback.
