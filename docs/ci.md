# CI/CD com Jenkins + Playwright

O pipeline está no `Jenkinsfile` da raiz. Ele valida o site com Playwright antes
de qualquer deploy e só publica em produção após aprovação manual.

## Fluxo

1. **Checkout**
2. **Instalar dependências** (`npm ci` em `astro_project`)
3. **Build** (Astro; injeta `YOUTUBE_API_KEY` em `.env`)
4. **Testes E2E** (Playwright, 28 testes)
5. **Preparar deploy** (instala Python/paramiko quando houver deploy)
6. **Deploy staging** (se `DEPLOY_STAGING=true`)
7. **Aprovação manual** (se `DEPLOY_PRODUCTION=true`)
8. **Deploy produção** (somente após aprovação)

Artefatos publicados:

- relatório HTML em `astro_project/playwright-report/`;
- JUnit em `astro_project/test-results/junit.xml`;
- traces, screenshots e vídeos de falhas em `astro_project/test-results/`.

## Pré-requisitos no Jenkins

Plugins:

- Pipeline / Pipeline: Docker
- Credentials Binding
- JUnit
- HTML Publisher
- (opcional) Timestamper, build discarder

Credenciais:

| ID | Tipo | Uso |
|---|---|---|
| `1ipim-sftp` | Username with password | deploy SFTP |
| `youtube-api-key` | Secret text | build do Astro |

O agente usa a imagem Docker
`mcr.microsoft.com/playwright:v1.62.1-noble`, que já traz Node 24 e os
navegadores do Playwright 1.62.1. Se o Jenkins não usar Docker, troque o
`agent` por um nó com Node 22+, Python 3 e execute
`npx playwright install --with-deps chromium`.

## Rodando localmente

```bash
cd astro_project
npm ci
printf 'YOUTUBE_API_KEY=%s\n' "$YOUTUBE_API_KEY" > .env
npm run build
npx playwright test
```

Ou:

```bash
npm run test:e2e:build
```

O `playwright.config.ts` sobe `npm run preview` na porta 4330 quando
`BASE_URL` não está definido.

Para testar contra outro ambiente:

```bash
BASE_URL=https://staging.1ipim.online npx playwright test
```

Nesse caso o Playwright não sobe o servidor local.

## O que os testes cobrem

- **12 páginas públicas**: status, canonical, `og:url`, um `<h1>`, descrição
  única, rodapé/ano, ausência de `localhost` e de chave exposta, sem 404 de
  assets locais e sem erros de página.
- **Reflexões** com API mockada (4 artigos na versão validada).
- **Semana Jovem** com imagens carregadas.
- **404** personalizado.
- **Menu desktop** (Agenda/A Igreja) e **menu mobile**.
- **robots.txt** e **sitemap.xml**.
- **Portal**: login, sessão/localStorage, dashboard por papel, escalas
  (calendário, participação, criação), voluntários (aprovar/promover/excluir),
  ministérios (criar/excluir), reflexões (lixeira/filtro), nova/editar reflexão
  e telas restantes.
- O portal usa **API mockada** nos testes; nenhum dado real de produção é
  alterado pelo pipeline.

## Deploy

- O deploy é feito pelo `scripts/deploy_astro.py` (SFTP aditivo, backup e
  verificação SHA-256).
- Staging: docroot `staging.1ipim.online`, `X-Robots-Tag: noindex`.
- Produção: exige `DEPLOY_PRODUCTION=true` e aprovação manual no Jenkins.
- Backups ficam em `~/1ipim_backups/` no servidor.
