# Finalização Genesis 1.77 — evidências de navegador

Capturas em 10/10/2026–11/10/2026, antes da consolidação documental final.
Código observado: `41c2ab0b72107492ea4681d8f4c94554c8509a39`.
Os checks do próximo HEAD precisam aprovar novamente a árvore final.

## Prévia local autenticada

Supabase isolado `genesis-talk-preview-177`, conta e dados fictícios E2E.
Login real por senha; consulta autenticada HTTP 200; filtros de espera/frieza;
detalhamento de chamadas; ausência de overflow em 390 px; nenhum pageerror.

- [Supervisão desktop](supervisao-desktop.png).
- [Supervisão mobile clara](supervisao-mobile.png).
- [Supervisão mobile escura](supervisao-mobile-escuro.png).

As capturas longas mantêm os elementos fixos na posição do viewport do navegador.
A badge de compilação pertence ao servidor de desenvolvimento. A prévia usou o
compilador padrão Turbopack após o Webpack alcançar o limite de memória local.
Isso não mede capacidade, INP/LCP ou estabilidade da instalação de produção.

## Build de produção no CI

[Parte 6 aprovada](https://github.com/hudsonlcustodio/GENESISTALKV177/actions/runs/38096478033/job/114343332507).
Artifact `evidencia-parte-6`, capturas originais sem edição:

- [Supervisão: filtros, população e retry após falha controlada](ci-supervisao-mobile.png).
- [CRM: criação pela tela, reload e confirmação no banco](ci-crm-mobile.png).
- [Tarefas: prioridade, conclusão, reabertura e persistência](ci-tarefas-mobile.png).

O enquadramento do CRM mostra a coluna inicial do funil após reload; o negócio
criado é comprovado pelas asserções da tela e do banco, não por sua presença
neste enquadramento. Tarefas verifica ainda alvos de 44 px e ações sem hover.
As jornadas estão em `tests/e2e/genesis-mobile-first.spec.ts`.

São testes com dados locais de fixture. Não comprovam WhatsApp, IA paga, SMTP,
pareamento, dispositivo físico, teclado virtual ou homologação na Contabo.
