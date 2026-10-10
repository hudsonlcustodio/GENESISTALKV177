# Evidências da auditoria de 10/10/2026

Consulte `../../AUDITORIA-OPERACIONAL-CONTABO-2026-10-10.md` para análise e limitações.
`audit-results.json` registra candidato, arquivos, hashes e resultados. Os logs
selecionados não incluem arquivos de ambiente, sessões de navegador ou backups.

`security-results.json` preserva a primeira tentativa do scanner, que falhou na
configuração de confiança do Git. O resultado válido da repetição está em
`secret-scan-corrected.json` e em `audit-results.json`.

`health-repro.repro.ts` importa o handler real e simula somente as dependências.
A execução histórica dos dois casos confirmou o comportamento anterior, incluindo o defeito;
não significa aprovação do health para produção. Após a correção, a reprodução do defeito deve reprovar; os testes atuais ficam junto do handler. O sufixo `.repro.ts` impede sua coleta na regressão normal. Os hashes do índice pertencem à coleta histórica anterior à renomeação. Para reproduzir na raiz:

```powershell
node node_modules/vitest/vitest.mjs run --config docs/genesis/evidence/audit-2026-10-10/vitest.audit.config.mjs
```

`reproduce-restore-acl.mjs` exige Docker e a imagem local `postgres:17-alpine`.
Cria seu próprio contêiner com nome UUID, sem rede, portas ou volumes persistentes,
e confirma a propriedade por label antes de removê-lo. Não usa bancos existentes.
Reproduz a perda de ACLs em um modelo mínimo, não um exploit/restore integral do CRM:

```powershell
node docs/genesis/evidence/audit-2026-10-10/reproduce-restore-acl.mjs
```

O JSON de nova execução vai para `.runtime/audit-2026-10-10/restore-acl-proof.json`.
As execuções iniciais e verificações finais estão distinguidas no índice de evidências.
