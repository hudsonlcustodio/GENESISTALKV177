# GENESIS TALK — Follow-up Customizations v0.3

## Implementado
- GEN-007/011: exclusão de nó continua usando os helpers modernos `semNo` + `semArestasDoNo`.
- GEN-008: ação explícita **Desconectar box**, preservando o nó.
- GEN-009: remoção de conexão continua disponível pelo fluxo moderno de seleção/delete.
- GEN-010: Undo local com até 100 snapshots.
- Criação de nó, conexão, edição de dados/condição, exclusões, drag e auto-layout entram no histórico.

## Decisão de integração
Não foi copiado o `FlowCanvas` antigo do Aurum. A customização foi transplantada
sobre o `FlowCanvas` atual do Deskcomm/Genesis para preservar:
- `nextSequenceId`;
- auto-layout;
- labels/branches atuais;
- helpers atuais de exclusão;
- PublishBar atual;
- comportamento mobile atual.

## Evidência
Alteração estrutural aplicada em:
`app/app/ai/followups/[id]/_components/FlowCanvas.tsx`

## Gate
Código implementado; validação automatizada completa permanece pendente enquanto
o ambiente de execução não disponibilizar a toolchain/dependências necessária.
