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

export function authHeaders(token: string | null, json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  base = WP_BASE,
): Promise<Response> {
  return fetch(apiUrl(path, base), init);
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
