# Migração para subdomínios — runbook

**Status:** subdomínios cadastrados e com SSL wildcard (`*.1ipim.online`).
**Estado em 07/11/2026:**
- `portal.1ipim.online` — **publicado** (Astro `dist`; `/` → `/portal/`), validado
  em navegador e com 13 testes Playwright verdes.
- `admin.1ipim.online` — **redirect interino 301** para `https://1ipim.online/admin/`
  (alias definitivo com `WP_HOME`/`search-replace` pendente).
- `berea.1ipim.online` — **placeholder** com a identidade; app real na fase 5.
- `1ipim.online`, `staging.1ipim.online` — inalterados (200).
- Produção recebeu `portal-auth/_bootstrap.php` (CORS) e o mu-plugin
  `1ipim-cors.php` (backups em `/home2/edu10350/1ipim_backups/manual_*`).

**Alvo:** `admin`, `portal`, `berea` e `staging` em `.1ipim.online`.

---

## 1. Mapa de hosts

| Host | Serve | Docroot sugerido |
|---|---|---|
| `1ipim.online` | Site público (Astro `dist/`) | `public_html` |
| `admin.1ipim.online` | WordPress (`/admin` atual) | `public_html/admin` (alias) |
| `portal.1ipim.online` | Portal (Astro `dist/`) | `portal.1ipim.online` |
| `berea.1ipim.online` | App Berea (build próprio, fase 5) | `berea.1ipim.online` |
| `staging.1ipim.online` | Homologação | `staging.1ipim.online` |

> Enquanto o Berea não tem build próprio, `berea.1ipim.online` pode ficar
> como placeholder ou apontar para a mesma `dist` (o módulo só entra na fase 5).

---

## 2. O que já está no código

- **Config por ambiente:** `src/config/api.ts` deriva REST, `portal-auth` e
  `wp-admin` de `PUBLIC_WP_ADMIN_BASE` (padrão `https://1ipim.online/admin`).
  Para a migração, buildar com `PUBLIC_WP_ADMIN_BASE=https://admin.1ipim.online`.
- **CORS:** `public/admin/portal-auth/_bootstrap.php` libera `admin`, `portal`,
  `berea` e `staging`.
- **CSP:** `src/layouts/Layout.astro` inclui os subdomínios em `img-src` e
  `connect-src`.
- **Deploy:** `scripts/deploy_astro.py` aceita `--remote-dir` (qualquer docroot)
  e `DEPLOY_STAGING_DIR`.

---

## 3. Passos no servidor (cPanel/HostGator)

1. **Docroots:** criar/confirmar cada subdomínio apontando para a pasta certa.
2. **SSL:** emitir certificado para cada subdomínio (Let's Encrypt/AutoSSL) ou
   wildcard `*.1ipim.online`.
3. **WordPress — cookie compartilhado:** em `wp-config.php`, antes do
   `require_once ABSPATH . 'wp-settings.php';`:
   ```php
   define('COOKIE_DOMAIN', '.1ipim.online');
   define('WP_HOME', 'https://admin.1ipim.online');
   define('WP_SITEURL', 'https://admin.1ipim.online');
   ```
   > A troca de `WP_HOME`/`WP_SITEURL` exige **backup** e, se o banco tiver URLs
   > absolutas antigas, um `search-replace` de `https://1ipim.online/admin`
   > para `https://admin.1ipim.online`.
4. **Alias temporário:** manter `1ipim.online/admin` funcionando como alias do
   WordPress durante a transição (não remover até validar tudo).

---

## 4. Deploy por ambiente

```bash
# Portal (mesma dist, docroot do subdomínio)
PUBLIC_WP_ADMIN_BASE=https://admin.1ipim.online npm run build
python3 scripts/deploy_astro.py --target production \
  --remote-dir /home2/edu10350/portal.1ipim.online --confirm

# Berea (quando existir build próprio — fase 5)
python3 scripts/deploy_astro.py --target production \
  --remote-dir /home2/edu10350/berea.1ipim.online --confirm
```

> O deploy é aditivo (não apaga arquivos remotos), com backup dos sobrescritos.

---

## 5. `.htaccess` no cutover (só ativar quando o subdomínio estiver validado)

No docroot do site público (`public_html`), redirecionar as rotas antigas:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On

    # /portal -> portal.1ipim.online (somente no host principal)
    RewriteCond %{HTTP_HOST} ^(www\.)?1ipim\.online$ [NC]
    RewriteRule ^portal/?(.*)$ https://portal.1ipim.online/$1 [L,R=301]

    # /admin -> admin.1ipim.online (somente no host principal)
    RewriteCond %{HTTP_HOST} ^(www\.)?1ipim\.online$ [NC]
    RewriteRule ^admin/?(.*)$ https://admin.1ipim.online/$1 [L,R=301]
</IfModule>
```

> **Não** aplicar antes de o subdomínio responder. O alias
> `1ipim.online/admin` deve continuar funcionando até o fim da validação.

---

## 6. Validação

- [ ] `https://admin.1ipim.online/wp-json/1ipim/v1/me` responde 200 com sessão.
- [ ] Login em `portal.1ipim.online` define cookie em `.1ipim.online`.
- [ ] Portal em `portal.1ipim.online` chama a API em `admin.1ipim.online`
      (sem erro de CORS/CSP no console).
- [ ] `berea.1ipim.online` abre (placeholder ou app).
- [ ] `https://1ipim.online/portal` e `/admin` redirecionam corretamente.
- [ ] Playwright verde contra o novo host (`BASE_URL=...`).
- [ ] axe sem violações critical/serious.

---

## 7. Rollback

1. Remover as regras de redirect do `.htaccess`.
2. Reverter `COOKIE_DOMAIN` e `WP_HOME`/`WP_SITEURL` no `wp-config.php`.
3. Rebuildar com `PUBLIC_WP_ADMIN_BASE=https://1ipim.online/admin` e redeployar.
4. Restaurar backup do banco se houve `search-replace`.
