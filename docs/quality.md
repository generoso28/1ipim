# Qualidade: acessibilidade (axe) e Lighthouse CI

## Acessibilidade com axe

O arquivo `astro_project/tests/a11y.spec.ts` roda o **axe-core** via
`@axe-core/playwright` em 13 páginas públicas + a home em viewport mobile.

- Regras: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`.
- Falha o build se houver violação **critical** ou **serious**.
- Verifica também se todo `<iframe>` tem `title` acessível.
- O conteúdo de iframes de terceiros (Spotify) é excluído da varredura; os
  títulos dos iframes continuam sendo verificados.
- Os testes rodam junto com o Playwright local, no staging e na produção.

Execução local:

```bash
cd astro_project
npx playwright test tests/a11y.spec.ts
```

## Lighthouse CI

Configuração em `astro_project/lighthouserc.cjs`:

- **Mobile**, 1 execução por URL.
- URLs: `/`, `/visitantes/`, `/contato/`.
- Relatórios em `astro_project/lighthouse-reports/` (HTML + JSON + `index.html`).
- O `scripts/lighthouse_index.mjs` gera um index estável para o Jenkins.

Limiares:

| Categoria | Limiar | Efeito |
|---|---|---|
| Performance | 75 | aviso |
| Acessibilidade | 90 | **falha** |
| Boas práticas | 90 | aviso |
| SEO | 90 | **falha** |

Execução local:

```bash
cd astro_project
npm run build
npm run preview -- --port 4321 &
CHROME_PATH=$(find ~/.cache/ms-playwright -maxdepth 3 -type f -name chrome | head -1) npx lhci autorun
node scripts/lighthouse_index.mjs
```

No Jenkins, a etapa **Lighthouse CI** sobe o preview na porta 4321, define
`CHROME_PATH` a partir de `/ms-playwright`, roda o LHCI e publica o relatório
**Lighthouse** ao lado do relatório do Playwright.

## Últimos resultados (mobile)

| Página | Performance | Acessibilidade | Boas práticas | SEO |
|---|---|---|---|---|
| `/` | 89 | 95 | 100 | 100 |
| `/visitantes/` | 96 | 95 | 77* | 100 |
| `/contato/` | 80 | 94 | 96 | 100 |

\* O aviso de boas práticas em `/visitantes/` vem do iframe do Spotify
(cookies de terceiros), que não controlamos. É um **aviso**, não falha.

## Otimizações feitas para chegar nesses números

- Fontes, Font Awesome e **GSAP/ScrollTrigger self-hosted** (sem cdnjs/Google
  Fonts no carregamento).
- Hero com poster do primeiro frame; vídeo carregado após o primeiro paint.
- Mapa do contato carregado **sob demanda** (clique), removendo o Google Maps
  do carregamento inicial.
- Iframes do Spotify e do mapa com `loading="lazy"`.
