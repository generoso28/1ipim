# Deploy do site

O build é feito em `astro_project/dist` e enviado por SFTP. O script é aditivo:
não apaga nada no servidor e guarda backup dos arquivos sobrescritos.

## Pré-requisitos

- `npm run build` concluído;
- Python 3 com `paramiko`;
- variáveis de ambiente:
  - `DEPLOY_USER`
  - `DEPLOY_PASS`
  - opcionais: `DEPLOY_HOST` (padrão `ftp.1ipim.online`), `DEPLOY_PORT`,
    `DEPLOY_ROOT`, `DEPLOY_BACKUP_ROOT`, `DEPLOY_STAGING_DIR`.

## Staging

Crie no cPanel o subdomínio `staging.1ipim.online`. Neste account o cPanel
criou o docroot em `staging.1ipim.online` (fora de `public_html`). O script usa
esse caminho por padrão, mas você pode sobrescrever com `DEPLOY_STAGING_DIR` ou
`--remote-dir`. Depois:

```bash
cd astro_project && npm run build
cd ..
DEPLOY_USER=... DEPLOY_PASS=... \
  python3 scripts/deploy_astro.py --target staging --confirm
```

O script grava um `.htaccess` de staging com `X-Robots-Tag: noindex, nofollow`.
A API do portal continua sendo a de produção (`https://1ipim.online/admin`).

## Produção

```bash
cd astro_project && npm run build
cd ..
DEPLOY_USER=... DEPLOY_PASS=... \
  python3 scripts/deploy_astro.py --target production --confirm
```

Antes de sobrescrever, os arquivos existentes são copiados para
`$DEPLOY_BACKUP_ROOT/production_<data>`. Para reverter, baixe o backup e envie
os arquivos de volta.

## Dry-run

```bash
DEPLOY_USER=x DEPLOY_PASS=x \
  python3 scripts/deploy_astro.py --target staging --dry-run
```
