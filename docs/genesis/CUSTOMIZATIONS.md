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
