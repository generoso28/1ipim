# CI/CD com Jenkins + Playwright

O Jenkins local roda em Docker e executa a suíte Playwright antes de publicar.
O fluxo é: **testes locais → deploy staging → testes no staging → deploy
produção → smoke em produção**.

## Subir o Jenkins

```bash
cp docker/jenkins/.env.example docker/jenkins/.env
# edite DEPLOY_USER, DEPLOY_PASS, YOUTUBE_API_KEY e JENKINS_ADMIN_PASSWORD
docker compose up -d --build
```

Acesse **http://localhost:8081** e entre com `admin` e a senha definida em
`docker/jenkins/.env`.

O `docker/jenkins/.env` é ignorado pelo Git. O job `1ipim-ci` é criado
automaticamente via Configuration as Code (JCasC), com as credenciais
`1ipim-sftp` e `youtube-api-key`.

## O que a imagem contém

- Jenkins LTS (JDK 21);
- Node 22;
- Playwright 1.62.1 + Chromium e dependências;
- Python 3 + paramiko (deploy SFTP);
- plugins: Configuration as Code, Job DSL, Pipeline, Git, Credentials Binding,
  JUnit, HTML Publisher, Timestamper.

## Pipeline

Parâmetros:

| Parâmetro | Padrão | Efeito |
|---|---|---|
| `DEPLOY_STAGING` | `true` | Publica e testa no staging |
| `DEPLOY_PRODUCTION` | `true` | Publica em produção após os testes |
| `REQUIRE_APPROVAL` | `false` | Exige aprovação manual antes da produção |

Etapas:

1. `npm ci`
2. Build do Astro (`YOUTUBE_API_KEY` vindo das credenciais)
3. **Testes locais** — 28 testes Playwright contra o preview local
4. **Deploy staging** — `scripts/deploy_astro.py --target staging`
5. **Testes no staging** — `BASE_URL=https://staging.1ipim.online`
6. Aprovação manual (opcional)
7. **Deploy produção** — `scripts/deploy_astro.py --target production`
8. **Smoke produção** — `BASE_URL=https://1ipim.online`

Se qualquer etapa falhar, o pipeline para e a próxima não roda. O deploy é
aditivo, faz backup em `~/1ipim_backups/` e verifica SHA-256.

## Rodando localmente sem Jenkins

```bash
cd astro_project
npm ci
printf 'YOUTUBE_API_KEY=%s\n' "$YOUTUBE_API_KEY" > .env
npm run build
npx playwright test
```

Contra staging/produção:

```bash
BASE_URL=https://staging.1ipim.online npx playwright test
BASE_URL=https://1ipim.online npx playwright test
```

## Observações

- O job é **manual**; não há gatilho de SCM configurado. Para build automático a
  cada push, adicione `triggers { scm('H/5 * * * *') }` no job em
  `docker/jenkins/casc/jenkins.yaml` ou configure um webhook.
- O pipeline usa **API mockada** nos testes do portal; ele não cria, edita ou
  exclui dados reais no WordPress.
- Como o `DEPLOY_PRODUCTION` vem `true` por padrão, um build sem alterar
  parâmetros publica em produção depois dos testes. Use
  `DEPLOY_PRODUCTION=false` para um dry-run ou `REQUIRE_APPROVAL=true` para
  exigir aprovação manual.
- O Jenkins fica exposto apenas em `localhost:8081`; não exponha essa porta
  publicamente sem TLS e autenticação reforçada.
- Para parar: `docker compose down`. Para apagar também o estado do Jenkins:
  `docker compose down -v`.
