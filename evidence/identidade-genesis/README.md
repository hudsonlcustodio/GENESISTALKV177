# Identidade visual Genesis — verificação local

Conferido em 09/10/2026 no preview Next.js em `localhost:3000`, com o Supabase
isolado `genesis-talk-preview-177` e uma conta fictícia de teste. Não houve
publicação em produção nem alteração de esquema ou dados de negócio.

## Referência e implementação

O logotipo fornecido pelo usuário foi copiado sem alteração para
`public/branding/genesis-360.png`. SHA-256 do original e da cópia:
`486d2a157fc4c29696bf22988c05a517845ec6798ea55d2955bd7e1f3c93dcbb`.
O enquadramento SVG elimina apenas as margens externas transparentes na
apresentação. Uma base branca protege a versão positiva no tema escuro.

As âncoras do manual são lima `#D4FF00`, verde Genesis `#00E676`, azul profundo
`#071B33`, ciano `#19C2FF`, cinza técnico `#52616F` e branco `#F7FAFC`.
Botões, texto e foco usam derivações verificadas para manter contraste.
DIN Next tem prioridade quando disponível; o arquivo da fonte não foi
fornecido. O fallback local é IBM Plex Sans, já presente no projeto.

Os resolvers existentes mantêm a prioridade de marcas personalizadas da
instalação e organização. Login, sidebar e ícones usam a arte oficial quando
a marca resolvida é a marca padrão. A configuração existente em Admin › Marca
continua sendo o ponto de edição; esta mudança de apresentação não cria
rotas, tabelas, eventos de negócio ou um novo fluxo operacional.

## Evidências no navegador

Playwright com Chromium verificou:

- Login desktop em 1440 × 980: [captura clara](login-claro.png).
- Login mobile em 390 × 844, sem rolagem horizontal: [captura](login-mobile.png).
- Login escuro com transições concluídas: [captura](login-escuro.png).
- Login real por senha, navegação principal e Inbox autenticada:
  [tema claro](inbox-claro.png) e [tema escuro](inbox-escuro.png).

O fundo claro calculado foi `rgb(247, 250, 252)`, o texto `rgb(7, 27, 51)` e
a borda de foco `rgb(0, 135, 71)`. No botão principal escuro, o fundo foi
`rgb(57, 237, 148)` e o texto `rgb(7, 27, 51)`.
As capturas da Inbox registram o shell com a lista em carregamento inicial;
não validam envio de mensagens, provedores ou operações de CRM.
Não houve erros de página durante a verificação final.

## Verificação automatizada e limites

- 340 casos pertinentes de marca/contraste/ícones passaram nas execuções
  direcionadas. Os casos de calibração foram repetidos após a atualização
  dos valores da paleta; os limites de contraste foram preservados.
- A verificação final de tokens Tailwind, régua congelada e contraste passou
  com 43 casos, incluindo os tokens da fonte e foco.
- ESLint completo terminou com zero erros e 523 avisos existentes. O lint
  direcionado das últimas alterações também terminou sem erros.
- A verificação completa TypeScript não foi concluída: o processo padrão
  esgotou o heap de 2 GB; a tentativa com 4 GB foi interrompida por pressão
  de memória. A compilação de desenvolvimento e as telas verificadas no
  navegador funcionaram. Isso não equivale a validar o build de produção.
