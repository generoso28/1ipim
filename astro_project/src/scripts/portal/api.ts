import { auth } from "./auth";
import { normalizeBaseUrl } from "./permissions";

export const WP_BASE = "https://1ipim.online/admin";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function apiUrl(path: string, base = WP_BASE): string {
  return `${normalizeBaseUrl(base)}${path}`;
}

/**
 * Cabeçalhos de autenticação.
 *
 * A sessão vai no cookie HttpOnly (credentials: "include"); o nonce protege
 * as requisições de escrita da REST API contra CSRF.
 */
export function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  const nonce = auth.getNonce();
  if (nonce) headers["X-WP-Nonce"] = nonce;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  base = WP_BASE,
): Promise<Response> {
  return fetch(apiUrl(path, base), {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  base = WP_BASE,
): Promise<T> {
  const response = await apiFetch(path, init, base);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ||
      `Erro ${response.status} ao acessar a API`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
