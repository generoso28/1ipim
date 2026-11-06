import type { PortalUser } from "./types";

/**
 * Base dos endpoints de sessão do portal.
 *
 * Aponta sempre para produção: o staging usa os mesmos cookies e a mesma
 * REST API, e o backend libera CORS para staging/www.
 */
export const AUTH_BASE = "https://1ipim.online/admin/portal-auth";

/**
 * Chaves de localStorage usadas pelo portal.
 *
 * Nenhuma delas é um segredo: o cookie de sessão do WordPress é HttpOnly.
 * O nonce é público (protege contra CSRF) e muda a cada login.
 */
export const AUTH_KEYS = {
  nonce: "1ipim_auth_nonce",
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

export interface SessionInput extends PortalUser {
  nonce: string;
}

export const auth = {
  getNonce(): string | null {
    return readKey(AUTH_KEYS.nonce);
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

  /**
   * Indica que existe um usuário em cache — não prova que a sessão ainda vale.
   * Use `refresh()` para validar no servidor.
   */
  hasSession(): boolean {
    return Boolean(readKey(AUTH_KEYS.nonce) && readKey(AUTH_KEYS.id));
  },

  setSession(session: SessionInput): void {
    writeKey(AUTH_KEYS.nonce, session.nonce);
    writeKey(AUTH_KEYS.email, session.email || "");
    writeKey(AUTH_KEYS.nicename, session.nicename || "");
    writeKey(AUTH_KEYS.displayName, session.displayName || "");
    writeKey(AUTH_KEYS.role, session.role || "");
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

  /**
   * Valida a sessão no WordPress e atualiza o cache local.
   *
   * - 401/403: limpa o cache e retorna null (precisa logar).
   * - Falha de rede: mantém o cache existente, para não deslogar por oscilação.
   */
  async refresh(): Promise<PortalUser | null> {
    try {
      const response = await fetch(`${AUTH_BASE}/session.php`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401 || response.status === 403) {
        auth.clear();
        return null;
      }

      if (!response.ok) {
        return auth.hasSession() ? auth.getUser() : null;
      }

      const payload = (await response.json()) as { user?: SessionInput };
      if (!payload?.user) {
        auth.clear();
        return null;
      }

      auth.setSession(payload.user);
      return auth.getUser();
    } catch {
      return auth.hasSession() ? auth.getUser() : null;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${AUTH_BASE}/logout.php`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      // Mesmo se a rede falhar, o cache local é limpo.
    } finally {
      auth.clear();
    }
  },
};

/** Redireciona para o login quando não há sessão válida. */
export async function requireAuth(): Promise<PortalUser | null> {
  const user = await auth.refresh();
  if (!user) {
    window.location.href = "/portal/login";
    return null;
  }
  return user;
}
