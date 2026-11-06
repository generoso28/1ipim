# Snapshot das páginas sem código-fonte

Este diretório guarda uma cópia fiel das páginas que estavam publicadas em
produção e **não tinham código-fonte neste repositório**:

- `reflexoes/`
- `semana-jovem/`
- `portal/` (todas as telas)

O snapshot foi extraído de `https://1ipim.online` em **06/11/2026**, depois do
deploy da fase 1. Ele existe porque o código-fonte original dessas páginas foi
perdido; o HTML publicado é o único registro que restou.

## Conteúdo

- 13 páginas HTML;
- CSS e JavaScript compilados do build Astro (`_astro/`);
- imagens e vídeo referenciados por essas páginas (`_astro/` e `assets/`);
- `MANIFEST.json` com tamanho e SHA-256 de cada arquivo.

## Limitações importantes

- É **HTML compilado**, não o código-fonte Astro. Serve para preservar o
  conteúdo, o layout e o comportamento, mas não substitui a reconstrução dos
  componentes `.astro`.
- O `portal/` depende da API do WordPress em
  `https://1ipim.online/admin/wp-json` e do login JWT. Sem esse backend, as
  telas abrem, mas não carregam dados.
- `reflexoes/` também busca os posts via API do WordPress em tempo de execução.
- Fontes, FontAwesome e GSAP continuam vindo de CDNs externos.
- Links para páginas fora deste snapshot (Home, Contato, etc.) não resolvem
  quando ele é servido isoladamente; essas páginas estão no código Astro do
  repositório.

## Como visualizar localmente

```bash
cd deployed_snapshot
python3 -m http.server 8080
```

Abra:

- `http://localhost:8080/reflexoes/`
- `http://localhost:8080/semana-jovem/`
- `http://localhost:8080/portal/login/`

Os caminhos são absolutos (`/_astro/...`), por isso o snapshot deve ser servido
a partir da raiz deste diretório.

## Recomendação

1. Reconstruir essas páginas como componentes Astro e trazê-las para `src/pages`.
2. Versionar o código do portal junto com o restante do site.
3. Manter este snapshot como referência histórica até a reconstrução terminar.
