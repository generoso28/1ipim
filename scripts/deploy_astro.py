#!/usr/bin/env python3
"""
Deploy do site Astro para a HostGator via SFTP.

Uso:
  export DEPLOY_USER=...
  export DEPLOY_PASS=...
  python3 scripts/deploy_astro.py --target staging --confirm
  python3 scripts/deploy_astro.py --target production --confirm

Variáveis opcionais:
  DEPLOY_HOST       (padrão: ftp.1ipim.online)
  DEPLOY_PORT       (padrão: 22)
  DEPLOY_ROOT       (padrão: /home2/edu10350/public_html)
  DEPLOY_BACKUP_ROOT(padrão: /home2/edu10350/1ipim_backups)

O deploy é aditivo: nenhum arquivo remoto é apagado. Arquivos sobrescritos
são copiados antes para a pasta de backup no servidor.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import posixpath
import socket
import sys
import time
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Instale paramiko: pip install paramiko", file=sys.stderr)
    raise SystemExit(1)

LOCAL_DIST = Path(__file__).resolve().parent.parent / "astro_project" / "dist"

STAGING_HTACCESS = """\
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} !=on
    RewriteRule ^ https://staging.1ipim.online%{REQUEST_URI} [L,R=301]
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Robots-Tag "noindex, nofollow"

    # Assets com hash no nome podem ficar em cache
    <FilesMatch "\\.(ico|pdf|flv|jpg|jpeg|png|gif|js|css|swf|webp|mp4|webm|woff|woff2|ttf|otf|svg)$">
        Header set Cache-Control "public, max-age=604800"
    </FilesMatch>

    # HTML sempre revalidado: evita misturar versões antiga/nova do portal
    <FilesMatch "\\.html$">
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>

    # Sitemap/robots sempre revalidados
    <FilesMatch "^(sitemap\\.xml|robots\\.txt)$">
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
</IfModule>
"""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_dir(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    parts = remote_dir.strip("/").split("/")
    current = ""
    for part in parts:
        current += "/" + part
        try:
            sftp.stat(current)
        except OSError:
            sftp.mkdir(current)


def remote_sha(sftp: paramiko.SFTPClient, remote: str) -> str | None:
    try:
        with sftp.open(remote, "rb") as handle:
            return sha256_bytes(handle.read())
    except OSError:
        return None


def collect_files() -> list[Path]:
    if not LOCAL_DIST.is_dir():
        raise SystemExit(f"Build não encontrado: {LOCAL_DIST}. Rode npm run build.")
    return sorted(path for path in LOCAL_DIST.rglob("*") if path.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy do site 1IPIM via SFTP")
    parser.add_argument("--target", choices=["staging", "production"], required=True)
    parser.add_argument("--confirm", action="store_true", help="Confirma a escrita no servidor")
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que seria feito")
    parser.add_argument(
        "--remote-dir",
        help="Sobrescreve o diretório remoto (ex.: /home2/edu10350/public_html/staging)",
    )
    args = parser.parse_args()

    host = os.environ.get("DEPLOY_HOST", "ftp.1ipim.online")
    port = int(os.environ.get("DEPLOY_PORT", "22"))
    user = os.environ.get("DEPLOY_USER")
    password = os.environ.get("DEPLOY_PASS")
    root = os.environ.get("DEPLOY_ROOT", "/home2/edu10350/public_html")
    backup_root = os.environ.get("DEPLOY_BACKUP_ROOT", "/home2/edu10350/1ipim_backups")

    if not user or not password:
        print("Defina DEPLOY_USER e DEPLOY_PASS.", file=sys.stderr)
        return 1

    remote_dir = args.remote_dir or (
        os.environ.get(
            "DEPLOY_STAGING_DIR",
            posixpath.join(posixpath.dirname(root), "staging.1ipim.online"),
        )
        if args.target == "staging"
        else root
    )
    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    backup_dir = posixpath.join(backup_root, f"{args.target}_{timestamp}")

    files = collect_files()
    print(f"Origem: {LOCAL_DIST}")
    print(f"Destino: {remote_dir}")
    print(f"Arquivos: {len(files)}")
    print(f"Backup: {backup_dir}")

    if args.dry_run:
        for path in files:
            print("  ", path.relative_to(LOCAL_DIST))
        return 0

    if not args.confirm:
        print("\nNada foi enviado. Use --confirm para publicar.", file=sys.stderr)
        return 2

    socket.setdefaulttimeout(30)
    transport = paramiko.Transport((host, port))
    transport.connect(username=user, password=password)
    sftp = paramiko.SFTPClient.from_transport(transport)

    uploaded = 0
    skipped = 0
    failed: list[str] = []

    try:
        ensure_dir(sftp, remote_dir)
        ensure_dir(sftp, backup_dir)

        for local in files:
            relative = local.relative_to(LOCAL_DIST).as_posix()
            remote = posixpath.join(remote_dir, relative)
            local_hash = sha256_file(local)
            current_hash = remote_sha(sftp, remote)

            if current_hash == local_hash:
                skipped += 1
                continue

            # backups apenas do que já existe
            if current_hash is not None:
                backup_path = posixpath.join(backup_dir, relative)
                ensure_dir(sftp, posixpath.dirname(backup_path))
                with sftp.open(remote, "rb") as source, sftp.open(backup_path, "wb") as target:
                    target.write(source.read())

            ensure_dir(sftp, posixpath.dirname(remote))
            sftp.put(str(local), remote, confirm=True)

            if remote_sha(sftp, remote) != local_hash:
                failed.append(relative)
            else:
                uploaded += 1

        if args.target == "staging":
            htaccess = posixpath.join(remote_dir, ".htaccess")
            with sftp.open(htaccess, "w") as handle:
                handle.write(STAGING_HTACCESS)

        print(f"Enviados: {uploaded} | Iguais: {skipped} | Falhas: {len(failed)}")
        for item in failed:
            print("  FALHA:", item)
        return 0 if not failed else 1
    finally:
        sftp.close()
        transport.close()


if __name__ == "__main__":
    raise SystemExit(main())
