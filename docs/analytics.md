# Analytics (GA4) e consentimento

O site usa **Google Analytics 4** com carregamento condicionado ao
consentimento do visitante (LGPD).

## Onde fica o ID

`astro_project/src/config/analytics.ts`:

```ts
export const GA_MEASUREMENT_ID = "G-ZF9PLVDGB8";
```

O ID é público (aparece no HTML) e não é segredo. Para trocar de propriedade,
basta alterar essa constante e publicar.

> O container **GTM-M48GXT2B** não é usado pelo site. A integração é feita
> direto com a tag do Google (`gtag.js`), o que mantém o consentimento sob
> nosso controle. Se um dia quiserem usar o GTM, é preciso revisar o fluxo.

## Como funciona o consentimento

- Banner fixo no rodapé com **Aceitar** / **Recusar**.
- A escolha fica em `localStorage` na chave `1ipim_consent_analytics`
  (`granted` ou `denied`).
- **Nenhum script do Google é carregado antes do aceite.**
- Ao aceitar, o site injeta
  `https://www.googletagmanager.com/gtag/js?id=G-...` e passa a enviar
  `page_view`.
- O link **Preferências de cookies** no rodapé reabre o banner.
- O portal administrativo (`hideChrome`) não carrega analytics.

## Eventos

- `page_view`: enviado manualmente em cada `astro:page-load`, então funciona
  com as transições SPA do Astro.
- `generate_lead`: disparado quando o formulário de contato é enviado com
  sucesso (`form: "contato"` e `subject`).

## Pageviews e SPA

A configuração usa `send_page_view: false`; o pageview é enviado pelo próprio
site a cada navegação, evitando duplicidade e cobrindo as transições do
`ClientRouter`.

## CSP

O `Layout.astro` libera:

- `script-src`: `https://www.googletagmanager.com`
- `img-src`/`connect-src`: `https://www.google-analytics.com`,
  `https://*.google-analytics.com`, `https://*.analytics.google.com`,
  `https://www.googletagmanager.com`

Ao trocar de provedor ou adicionar tags, atualize o CSP.

## Privacidade

A página `/privacidade` explica o uso do formulário, do GA4 e do armazenamento
local. A retenção de dados do GA4 deve ser configurada em **Admin →
Configurações da propriedade → Retenção de dados** (recomendado: 14 meses).

## Testes

`astro_project/tests/public-pages.spec.ts`, describe
**“Consentimento de analytics”**:

- GA não carrega antes do consentimento;
- recusar mantém desligado;
- aceitar carrega o `gtag.js`;
- link do rodapé reabre o banner.
