# GENESIS TALK — CUSTOMIZATIONS

## Invariantes importados para validação
Os testes em `tests/genesis-compat/` foram copiados do snapshot Aurum/Imobi como
probes de compatibilidade. Eles NÃO provam compatibilidade até serem executados
contra a baseline atual.

Prioridades:
1. IA → humano: silêncio do bot, ownership e retomada.
2. Realtime: aguardar autenticação antes de subscribe.
3. Refetch: relógio de segurança não reinicia por render.
4. Suporte read-only: não alterar unread nem executar ações proibidas.
5. Follow-up: preservar invariantes e, depois, operações exclusivas do editor.

## Política
Se o Deskcomm atual já satisfizer o comportamento, manter upstream.
Se falhar um invariante Genesis, adaptar a implementação atual; não restaurar
automaticamente código antigo.

## Hardening Codex — 2026-10-08

Probes atualizadas para o contrato v1.77: ramos via `nodeBranches`, recuperação via
`followupGatilhoPresencaHandler`, pausa manual unificada por empresa (60 min por
padrão) e transição de organização no suporte. Reaplicados: bloqueio de onboarding
durante suporte, marcação de lido somente para agente autorizado e relógio Realtime
estável por hash semântico de query. Os testes continuam exigindo essas propriedades.

## Consentimento — STOP em pausa manual

`lib/followup/reactivity.ts` inclui `paused_manual` somente nos estados alcançados
por hard stop (STOP/opt-out/contato pessoal). Mensagem comum e handoff continuam
sem acordar essa pausa. A regressão Postgres antes marcada `it.fails` agora exige
cancelamento, outcome, motivo e idempotência; seu adapter honra os estados
passados pelo código de produção. Os três novos controles unitários preservam
as fronteiras da pausa manual. Nenhuma tabela ou migration foi alterada.
