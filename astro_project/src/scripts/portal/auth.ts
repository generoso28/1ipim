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
  roles: "1ipim_user_roles",
  memberships: "1ipim_user_memberships",
  isAdmin: "1ipim_user_is_admin",
  isPastor: "1ipim_user_is_pastor",
  isMinistryLeader: "1ipim_user_is_ministry_leader",
  canManageLivraria: "1ipim_user_can_manage_livraria",
  canManageLivrariaStock: "1ipim_user_can_manage_livraria_stock",
} as const;

/** Chave do JWT antigo: removida para não confundir navegadores com cache velho. */
const LEGACY_TOKEN_KEY = "1ipim_auth_token";

const isBrowser = () => typeof window !== "undefined";

function purgeLegacyToken(): void {
  if (isBrowser()) localStorage.removeItem(LEGACY_TOKEN_KEY);
}

// Limpa o token do login antigo assim que o módulo novo carrega.
purgeLegacyToken();

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

function parseStringArray(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseMemberships(raw: string | null): PortalUser["memberships"] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface SessionInput extends PortalUser {
  nonce: string;
}

let pendingRefresh: Promise<PortalUser | null> | null = null;

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
      roles: parseStringArray(readKey(AUTH_KEYS.roles)),
      id: readKey(AUTH_KEYS.id) || "",
      ministries: parseMinistries(readKey(AUTH_KEYS.ministries)),
      memberships: parseMemberships(readKey(AUTH_KEYS.memberships)),
      isAdmin: readKey(AUTH_KEYS.isAdmin) === "1",
      isPastor: readKey(AUTH_KEYS.isPastor) === "1",
      isMinistryLeader: readKey(AUTH_KEYS.isMinistryLeader) === "1",
      canManageLivraria: readKey(AUTH_KEYS.canManageLivraria) === "1",
      canManageLivrariaStock: readKey(AUTH_KEYS.canManageLivrariaStock) === "1",
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
    writeKey(AUTH_KEYS.roles, JSON.stringify(session.roles || []));
    writeKey(AUTH_KEYS.memberships, JSON.stringify(session.memberships || []));
    writeKey(AUTH_KEYS.isAdmin, session.isAdmin ? "1" : "0");
    writeKey(AUTH_KEYS.isPastor, session.isPastor ? "1" : "0");
    writeKey(AUTH_KEYS.isMinistryLeader, session.isMinistryLeader ? "1" : "0");
    writeKey(
      AUTH_KEYS.canManageLivraria,
      session.canManageLivraria ? "1" : "0",
    );
    writeKey(
      AUTH_KEYS.canManageLivrariaStock,
      session.canManageLivrariaStock ? "1" : "0",
    );
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
    purgeLegacyToken();
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

  /**
   * Mesma verificação de `refresh()`, compartilhada entre layout e telas para
   * não disparar várias requisições ao carregar a página.
   */
  ensureSession(): Promise<PortalUser | null> {
    if (!pendingRefresh) {
      pendingRefresh = auth.refresh().finally(() => {
        pendingRefresh = null;
      });
    }
    return pendingRefresh;
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
  const user = await auth.ensureSession();
  if (!user) {
    window.location.href = "/portal/login";
    return null;
  }
  return user;
}
