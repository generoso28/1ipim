# Reconstrução das páginas sem código-fonte (2026-11-06)

As páginas `reflexoes/`, `semana-jovem/` e `portal/` existiam apenas como HTML
compilado publicado. Este documento registra como elas foram reconstruídas como
componentes Astro.

## Fonte

- Snapshot fiel do site publicado: `deployed_snapshot/` (commit `d586336`).
- Análise dos bundles JavaScript com REA (`analyze_javascript_application`):
  - Evidence: `ev_ccf10674b7573f2031772fd9725dc0d11f528a0fa275df64f7f7d7ad7ac5201b`
  - 12 arquivos JS analisados, 102 achados, 88 relações de requisição.
  - Endpoints recuperados: `jwt-auth/v1/token`, `wp/v2/posts`, `wp/v2/users`,
    `wp/v2/ministerio`, `wp/v2/escala`, `wp/v2/settings`, `wp/v2/categories`.

## Arquivos criados

- `src/pages/reflexoes.astro`
- `src/pages/semana-jovem.astro`
- `src/layouts/PortalLayout.astro`
- `src/pages/portal/*.astro` (11 telas)
- `src/scripts/portal/*.js` (lógica do portal, extraída dos bundles)
- `src/scripts/semana-jovem.js`
- `src/styles/portal.css`
- `src/styles/semana-jovem.css`
- `public/assets/semana-jovem/*` (imagens, logos e vídeo)

Alterações de suporte:

- `src/layouts/Layout.astro`: nova prop `hideChrome` (renderiza a página sem
  Navbar/Footer públicos) e `connect-src` do CSP incluindo
  `https://1ipim.online`.
- `PortalLayout` usa `hideChrome`, o logo do portal aponta para `/` e as páginas
  do portal usam `noindex`.

## Fidelidade

- O conteúdo textual, as imagens, o vídeo, as seções e os links das páginas
  `reflexoes` e `semana-jovem` foram comparados com o site publicado: texto
  idêntico (1.043 e 1.237 caracteres), mesmas imagens e mesmas seções.
- O portal foi validado com um token de teste: todas as 11 telas renderizam o
  shell, títulos, formulários e navegação; o dashboard monta os 5 cards e os
  links por papel.
- `reflexoes` carrega os 4 posts via API e abre o modal de leitura.
- `semana-jovem` mantém o layout escuro, o vídeo de fundo, o contador e as 14
  imagens.

## O que ainda não é código-fonte original

- Os scripts em `src/scripts/` são os bundles compilados, apenas formatados.
  Eles funcionam e são editáveis, mas ainda têm nomes minificados (`e`, `t`,
  `n`). O próximo passo é refatorá-los para TypeScript/módulos legíveis.
- O CSS do portal e da Semana Jovem veio dos arquivos compilados; os utilitários
  Tailwind são regerados pelo build.
- O HTML das páginas está minificado (uma linha); pode ser formatado depois.

## Como testar

```bash
cd astro_project
npm run build
npm run preview -- --port 4324
```

- `http://localhost:4324/reflexoes/`
- `http://localhost:4324/semana-jovem/`
- `http://localhost:4324/portal/login/`
- `http://localhost:4324/portal/` (redireciona para o login sem token)
