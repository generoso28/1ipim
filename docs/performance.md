# Performance: fontes, ícones e hero

## Fontes self-hosted

Não há mais requisição ao Google Fonts. Os arquivos ficam em
`astro_project/public/assets/fonts/`:

| Arquivo | Uso |
|---|---|
| `inter-latin.woff2` | fonte principal (variável, 300–800) |
| `cormorant-garamond-normal.woff2` | títulos da Semana Jovem |
| `cormorant-garamond-italic.woff2` | itálicos da Semana Jovem |
| `archivo-narrow.woff2` | labels da Semana Jovem |

As declarações `@font-face` estão no fim de `src/styles/global.css`, com
`font-display: swap`. O `Layout.astro` faz preload apenas do Inter.

Para atualizar uma fonte, baixe o `.woff2` (subconjunto `latin`) e substitua o
arquivo; o nome e o `@font-face` continuam iguais.

## Ícones (Font Awesome)

O Font Awesome 6 Free é servido localmente:

- CSS: `public/assets/fontawesome/css/all.min.css`
- fontes: `public/assets/fontawesome/webfonts/*.woff2`

O `Layout.astro` referencia `/assets/fontawesome/css/all.min.css`. Nada é
carregado da cdnjs para estilos/fontes. O GSAP continua vindo da cdnjs
(`script-src`), pois é JavaScript, não fonte/ícone.

## Hero

- **Poster primeiro**: um `<picture>` mostra o primeiro frame imediatamente
  (`hero-poster.webp` no desktop, `sobrevoo-poster.webp` no mobile), com
  `fetchpriority="high"`.
- **Vídeo depois do primeiro paint**: o `<video id="hero-video">` começa sem
  `src` e `preload="none"`. Depois do primeiro paint (via
  `requestIdleCallback`, com fallback de 1,2 s) o JS escolhe a fonte:
  - `≤ 767px`: `/assets/video/sobrevoo.mp4` (vertical, 720×1280);
  - `≥ 768px`: `/assets/video/hero.webm` e `hero.mp4` (atuais).
- Quando o vídeo começa a tocar, ele faz fade-in sobre o poster.
- **`prefers-reduced-motion`**: o vídeo não é carregado; o poster estático
  permanece.
- **Sem JavaScript**: o poster continua visível.

## CSP

O `Layout.astro` não libera mais `fonts.googleapis.com`/`fonts.gstatic.com` nem
a cdnjs em `style-src`/`font-src`. Permanecem apenas as origens necessárias
para scripts (GSAP/YouTube/GA) e o próprio site.

## Testes

`astro_project/tests/public-pages.spec.ts`:

- hero mobile usa o poster e o vídeo de sobrevoo;
- hero desktop mantém o vídeo atual;
- nenhuma requisição a Google Fonts ou Font Awesome externo;
- conteúdo visível com movimento reduzido e sem JavaScript.
