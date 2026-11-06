# SEO — estratégia e implementação

## Princípios aplicados

1. **Conteúdo útil e local**: texto que responde ao que as pessoas buscam
   (“igreja presbiteriana em Machado”, “igreja em Machado MG”, horários,
   endereço, como visitar).
2. **Técnico**: canonical de produção, sitemap, robots, HTML semântico,
   mobile-first, HTTPS, Core Web Vitals (fontes/ícones locais e hero leve).
3. **Dados estruturados JSON-LD**: `Church`/`Organization`, `WebSite`,
   `BreadcrumbList`, `FAQPage`, `Event`, `Person`, `VideoObject`,
   `ContactPage` e `CollectionPage`.
4. **NAP consistente** (nome, endereço, telefone) no site e no schema.
5. **Links internos descritivos** entre home, programação, visitantes,
   contato, mensagens e pastores.
6. **Metadados únicos por página**: título, descrição, keywords, Open Graph,
   Twitter Card e hreflang `pt-BR`.
7. **Sem keyword stuffing**: os termos aparecem de forma natural no conteúdo.

## Onde ficam os dados

- `src/config/seo.ts`: nome, endereço, geo, telefone, redes, horários e o mapa
  de título/descrição/keywords por página.
- `src/layouts/Layout.astro`: canonical, Open Graph, Twitter, hreflang,
  breadcrumbs e JSON-LD global.
- Páginas específicas passam `schema` para o Layout (FAQ, Event, Person,
  VideoObject etc.).

## Termos-alvo

| Termo | Onde é reforçado |
|---|---|
| 1IPIM / 1IPI | marca, título, schema (`alternateName`), rodapé |
| Primeira Igreja Presbiteriana | título/conteúdo da home e schema |
| Igreja Presbiteriana | título/descrição, conteúdo local, schema |
| Igreja em Machado / Igreja em Machado MG | título da home, contato, bloco local |
| Machado / Machado MG | endereço, bloco local, contato, schema |
| IPI | bloco local, `memberOf` no schema, rodapé |
| Igreja Presbiteriana de Machado | `alternateName` e conteúdo |
| Horário de culto em Machado | programação (título + Event schema) |

> **Importante:** aparecer para a palavra isolada “Machado” não é garantido.
> Ela é ampla e disputa com a cidade, empresas e outros resultados. O que
> controlamos é relevância local, dados estruturados, conteúdo e autoridade.
> Para buscas locais, o **Google Business Profile** e citações externas pesam
> muito (ver próximos passos).

## Dados estruturados implementados

| Tipo | Página |
|---|---|
| `Church` + `Organization` + `WebSite` | todas |
| `BreadcrumbList` | todas, exceto home |
| `FAQPage` (7 perguntas) | `/visitantes/` |
| `Event` (cultos semanais) | `/programacao/` |
| `Person` (pastores + emérito) | `/pastores/` |
| `VideoObject` (últimos vídeos) | `/mensagens/` |
| `ContactPage` | `/contato/` |
| `CollectionPage` | `/reflexoes/` |

O schema da igreja inclui endereço, CEP, coordenadas, telefone, e-mail, mapa,
redes sociais, áreas atendidas (Machado, Paraguaçu, Pouso Alegre,
Carvalhópolis, Serrania), horários de culto, fundação (1874) e vínculo com a
IPI do Brasil.

## Sitemap e robots

- `public/sitemap.xml` lista todas as páginas públicas, incluindo
  `/privacidade/`.
- `public/robots.txt` bloqueia `/admin/`, `/portal/` e `/api/` e aponta o
  sitemap.

## Próximos passos recomendados

1. **Google Business Profile**: criar/reivindicar o perfil da igreja com o
   mesmo NAP, categoria “Igreja presbiteriana”, fotos, horários e link do site.
   É o fator que mais ajuda em buscas locais (“igreja em Machado”).
2. **Search Console**: depois do deploy, abrir **Sitemaps** e enviar
   `https://1ipim.online/sitemap.xml`; usar **Inspeção de URL** nas páginas
   principais para solicitar indexação.
3. **Citações locais**: garantir o mesmo endereço/telefone em diretórios da
   IPI, Acampamento Maanaim, Instagram, YouTube e Google.
4. **Conteúdo recorrente**: transformar cada reflexão em uma página estática
   indexável (hoje a lista é carregada via JavaScript) e publicar páginas de
   eventos com datas ISO.
5. **Monitoramento**: acompanhar Consultas no Search Console, Core Web Vitals
   e o relatório de resultados enriquecidos (Rich Results Test).
6. **Backlinks**: links de sites da IPI, presbitério, acampamento e projetos
   sociais (Missão Vida Nova, Instituto CREIA).

## Validação

`astro_project/tests/seo.spec.ts` cobre:

- título, descrição, keywords, canonical, Open Graph, Twitter e hreflang;
- JSON-LD de Church/WebSite/Breadcrumb em todas as páginas;
- FAQ, Event, Person, VideoObject, ContactPage e CollectionPage;
- unicidade de títulos/descrições;
- sitemap e robots.

Ferramentas externas: [Rich Results Test](https://search.google.com/test/rich-results),
[PageSpeed Insights](https://pagespeed.web.dev/) e Search Console.
