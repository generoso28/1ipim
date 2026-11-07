#!/usr/bin/env bash
# Gera o pacote do portal (rotas na raiz) a partir do build Astro.
# Uso: scripts/build-portal.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="astro_project/dist"
OUT="astro_project/dist-portal"

if [ ! -d "$SRC/portal" ]; then
  echo "Build não encontrado em $SRC. Rode npm run build." >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"
cp -r "$SRC/portal/." "$OUT/"
cp -r "$SRC/_astro" "$OUT/_astro"
cp -r "$SRC/assets" "$OUT/assets"
cp "$SRC/favicon.ico" "$OUT/" 2>/dev/null || true
cp "$SRC/favicon.svg" "$OUT/" 2>/dev/null || true
cp "$SRC/404.html" "$OUT/" 2>/dev/null || true

cat > "$OUT/.htaccess" <<'HT'
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
    RewriteEngine On
    DirectorySlash Off

    RewriteCond %{HTTPS} !=on
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Links antigos /portal/... -> raiz
    RewriteRule ^portal/?(.*)$ /$1 [L,R=301]

    # Raiz serve o painel
    RewriteRule ^$ /index.html [L]

    # URL limpa -> <rota>/index.html (sem barra final)
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^([a-z0-9-]+)/?$ /$1/index.html [L]
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Robots-Tag "noindex, nofollow"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    <FilesMatch "\.(ico|pdf|flv|jpg|jpeg|png|gif|js|css|swf|webp|mp4|webm|woff|woff2|ttf|otf|svg)$">
        Header set Cache-Control "public, max-age=604800"
    </FilesMatch>
    <FilesMatch "\.html$">
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
</IfModule>
HT

echo "dist-portal pronto: $(find "$OUT" -type f | wc -l) arquivos"
