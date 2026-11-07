/**
 * Endpoints do WordPress/Portal, configuráveis por ambiente (build-time).
 *
 * Padrão (produção atual): WordPress em `https://1ipim.online/admin`.
 *
 * Na migração para subdomínios, defina no build:
 *   PUBLIC_WP_ADMIN_BASE=https://admin.1ipim.online
 * e o restante (REST, portal-auth, wp-admin) é derivado automaticamente.
 *
 * As variáveis precisam do prefixo `PUBLIC_` para chegarem ao cliente.
 */

const stripTrailingSlashes = (value: string): string =>
  value.replace(/\/+$/, "");

const readEnv = (key: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value.trim() : "";
};

/** Base do WordPress (inclui `/admin` no arranjo atual). */
export const WP_ADMIN_BASE =
  stripTrailingSlashes(readEnv("PUBLIC_WP_ADMIN_BASE")) ||
  "https://1ipim.online/admin";

/** REST API do projeto. */
export const WP_REST_BASE = `${WP_ADMIN_BASE}/wp-json/1ipim/v1`;

/** Endpoints de sessão do portal. */
export const AUTH_BASE = `${WP_ADMIN_BASE}/portal-auth`;

/** wp-admin. */
export const WP_ADMIN_URL = `${WP_ADMIN_BASE}/wp-admin`;

/** Origem do site público (contato, etc.). */
export const SITE_ORIGIN =
  stripTrailingSlashes(readEnv("PUBLIC_SITE_ORIGIN")) || "https://1ipim.online";
