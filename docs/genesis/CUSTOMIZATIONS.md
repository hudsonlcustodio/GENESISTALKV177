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
