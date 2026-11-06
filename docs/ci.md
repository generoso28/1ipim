# CI/CD com Jenkins + Playwright

O Jenkins local roda em Docker e executa a suíte Playwright antes de publicar.
O fluxo é: **testes locais → deploy staging → testes no staging → deploy
produção → smoke em produção**.

## Subir o Jenkins

```bash
cp docker/jenkins/.env.example docker/jenkins/.env
# edite DEPLOY_USER, DEPLOY_PASS e JENKINS_ADMIN_PASSWORD
docker compose up -d --build
```

Acesse **http://localhost:8081** e entre com `admin` e a senha definida em
`docker/jenkins/.env`.

O `docker/jenkins/.env` é ignorado pelo Git. O job `1ipim-ci` é criado
automaticamente via Configuration as Code (JCasC), com as credenciais
`1ipim-sftp`.

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
| `DEPLOY_PRODUCTION` | `false` | Publica em produção após os testes (precisa ser marcado) |
| `REQUIRE_APPROVAL` | `false` | Exige aprovação manual antes da produção |

Etapas:

1. `npm ci`
2. Build do Astro
3. **Testes locais** — 29 testes Playwright contra o preview local
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
npm run build
npx playwright test
```

Contra staging/produção:

```bash
BASE_URL=https://staging.1ipim.online npx playwright test
BASE_URL=https://1ipim.online npx playwright test
```

## Observações

- O job tem **SCM trigger** (`H/5 * * * *`): cada push no `master` dispara o
  fluxo completo de testes e o deploy de staging. `DEPLOY_PRODUCTION=false` por
  padrão, então um push **não** publica em produção. Para publicar, rode o job
  manualmente marcando `DEPLOY_PRODUCTION=true`; `REQUIRE_APPROVAL=true` adiciona
  uma pausa de aprovação antes.
- O pipeline usa **API mockada** nos testes do portal; ele não cria, edita ou
  exclui dados reais no WordPress.
- Como o `DEPLOY_PRODUCTION` vem `false` por padrão, builds automáticos (push)
  validam staging mas não tocam em produção. Use `REQUIRE_APPROVAL=true` se
  quiser uma pausa extra mesmo em builds manuais.
- O Jenkins fica exposto apenas em `localhost:8081`; não exponha essa porta
  publicamente sem TLS e autenticação reforçada.
- Para parar: `docker compose down`. Para apagar também o estado do Jenkins:
  `docker compose down -v`.

## Relatório Playwright no Jenkins

O container roda com `-Dhudson.model.DirectoryBrowserSupport.CSP=` para permitir
que o JavaScript do relatório HTML do Playwright execute dentro do Jenkins.
Sem isso, o Jenkins aplica `Content-Security-Policy: sandbox ... default-src
'none'` e o relatório abre em branco.

Essa configuração vale apenas para este Jenkins local. Se o Jenkins for exposto
publicamente, restrinja a CSP ou sirva o relatório por outro meio.
