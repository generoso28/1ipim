import type { PortalUser } from "./types";

/**
 * Chaves de localStorage usadas pelo portal.
 * Mantidas iguais às versões anteriores para não invalidar sessões existentes.
 */
export const AUTH_KEYS = {
  token: "1ipim_auth_token",
  email: "1ipim_user_email",
  nicename: "1ipim_user_nicename",
  displayName: "1ipim_user_display_name",
  role: "1ipim_user_role",
  id: "1ipim_user_id",
  ministries: "1ipim_user_ministries_approved",
} as const;

const isBrowser = () => typeof window !== "undefined";

function readKey(key: string): string | null {
  return isBrowser() ? localStorage.getItem(key) : null;
}

function writeKey(key: string, value: string): void {
  if (isBrowser()) localStorage.setItem(key, value);
}

function parseMinistries(raw: string | null): number[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

export interface SessionInput {
  token: string;
  email: string;
  nicename: string;
  displayName: string;
  role: string;
  id?: string;
  ministries?: number[];
}

export const auth = {
  getToken(): string | null {
    return readKey(AUTH_KEYS.token);
  },

  getUser(): PortalUser {
    return {
      email: readKey(AUTH_KEYS.email),
      nicename: readKey(AUTH_KEYS.nicename) || "",
      displayName: readKey(AUTH_KEYS.displayName) || "",
      role: readKey(AUTH_KEYS.role) || "",
      id: readKey(AUTH_KEYS.id) || "",
      ministries: parseMinistries(readKey(AUTH_KEYS.ministries)),
    };
  },

  isLoggedIn(): boolean {
    return Boolean(readKey(AUTH_KEYS.token));
  },

  setSession(session: SessionInput): void {
    writeKey(AUTH_KEYS.token, session.token);
    writeKey(AUTH_KEYS.email, session.email);
    writeKey(AUTH_KEYS.nicename, session.nicename);
    writeKey(AUTH_KEYS.displayName, session.displayName);
    writeKey(AUTH_KEYS.role, session.role);
    writeKey(AUTH_KEYS.id, session.id || "");
    writeKey(AUTH_KEYS.ministries, JSON.stringify(session.ministries || []));
  },

  setRole(role: string): void {
    writeKey(AUTH_KEYS.role, role);
  },

  setId(id: string | number): void {
    writeKey(AUTH_KEYS.id, String(id));
  },

  setMinistries(ministries: number[]): void {
    writeKey(AUTH_KEYS.ministries, JSON.stringify(ministries));
  },

  clear(): void {
    if (!isBrowser()) return;
    Object.values(AUTH_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};

/** Redireciona para o login quando não há token. */
export function requireAuth(): PortalUser | null {
  if (!auth.getToken()) {
    window.location.href = "/portal/login";
    return null;
  }
  return auth.getUser();
}
