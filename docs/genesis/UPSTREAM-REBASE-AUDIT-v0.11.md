# GENESIS TALK — Upstream Rebase Audit v0.11

## Estado verificado — 2026-09-23
O upstream evoluiu em áreas que intersectam diretamente o Genesis: handoff humano,
follow-up, white-label, update/recovery, segurança e disciplina de migrations.

Há duas políticas distintas: `SECURITY.md` suporta o `main` mais recente para
correções de segurança; o updater self-host documentado aponta para release
publicada (a documentação observada cita `v1.2.3`), não para commit arbitrário de
`main`. Genesis deve tratar release/tag como candidato de atualização de produto
e `main` como feed de patches a auditar.

## Prioridades
**P0 Handoff.** O upstream documenta dois motores de handoff e correção para avisar
o lead antes de silenciar. Recomparar GEN-001..006.

**P0 White-label.** O upstream evoluiu para marca resolvida em banco
(`platform_branding` e branding por organização), com fallback observável.
Reconciliar com GENESIS 360 sem perder identidade nem compatibilidade.

**P0 Banco/update.** A doutrina upstream atual exige migration + baseline
idempotente + MANIFEST; fresh self-host usa baseline. Reconciliar isso com a
estratégia Genesis v0.7 antes do primeiro release self-host.

**P1 Security/dependencies.** Comparar package/lock/overrides reais antes de bumps.

**P1 Recovery.** Absorver updater/backup/health/rollback somente junto com testes.

## Política de integração
Classificar cada delta como `ABSORB`, `ALREADY_PRESENT`, `CONFLICT_GENESIS`,
`IRRELEVANT` ou `DEFER`. Sem merge automático. GEN-001..023 são regression firewall.

## Alterações concretas nesta versão
1. `genesis-quality.yml` corrigido de npm para pnpm 9.15.9, com lock congelado.
2. `scripts/genesis-upstream-audit.sh` adicionado: configura/faz fetch e gera diff,
   mas deliberadamente NÃO faz merge.
3. Este documento/evidência passa a ser o gate de reconciliação upstream.

## Gate
- Política upstream: DEFINED
- Mismatch npm/pnpm no CI Genesis: FIXED
- Fetch/diff Git real: PENDING em ambiente Git com rede
- Integração seletiva: PENDING após diff real
- RC Genesis: BLOCKED até evidência executável
