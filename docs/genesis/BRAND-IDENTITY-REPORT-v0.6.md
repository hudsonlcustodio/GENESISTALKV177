# GENESIS TALK — Brand Identity v0.6

## Implementado
- Nome comercial padrão: **GENESIS TALK**.
- Paleta corporativa GENESIS 360 mantida:
  `#7ED321`, `#00C853`, `#0B3D3A`, `#00B8D9`, `#6B7280`, `#FFFFFF`.
- Aliases CSS `--genesis-*` adicionados ao design system.
- Asset vetorial `public/genesis-talk.svg` criado com a paleta oficial.
- Branding comercial antigo substituído conservadoramente nas superfícies de app/componentes/configuração.
- 7 arquivos tiveram substituição comercial controlada.

## Proteção contra quebra
Não foi executado rename global de identificadores técnicos. Migrations, schemas,
env vars, contratos persistidos e históricos de evidência não foram rebatizados.

## Tipografia
A referência GENESIS 360 apresenta DIN Next, mas nenhum arquivo dessa fonte foi
incorporado. O SVG usa fallback seguro; a fonte corporativa depende de licença/asset oficial.

## Evidência
- `docs/genesis/evidence/brand-v0.6.json`
- `public/genesis-talk.svg`
- `lib/branding/genesis-360.ts`
- `app/globals.css`

## Gate
- GATE-BRAND-FOUNDATION: passed
- GATE-BRAND-VISUAL-QA: pending (render/browser)
- GATE-TECHNICAL-RENAME: intentionally not required
