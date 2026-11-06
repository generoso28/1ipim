import type { Permissions } from "./types";

type PermissionSet = Omit<Permissions, "isPrivileged">;

const ROLE_PERMISSIONS: Record<string, PermissionSet> = {
  pastor: {
    label: "Pastor",
    canReflexoes: true,
    canEscalas: true,
    canUsers: true,
    canMinistries: true,
    canLivraria: true,
    isAdmin: true,
  },
  admin: {
    label: "Administrador",
    canReflexoes: true,
    canEscalas: true,
    canUsers: true,
    canMinistries: true,
    canLivraria: true,
    isAdmin: true,
  },
  administrator: {
    label: "Administrador",
    canReflexoes: true,
    canEscalas: true,
    canUsers: true,
    canMinistries: true,
    canLivraria: true,
    isAdmin: true,
  },
  editor: {
    label: "Líder",
    canReflexoes: true,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: true,
    isAdmin: false,
  },
  lider: {
    label: "Líder",
    canReflexoes: true,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: true,
    isAdmin: false,
  },
  leader: {
    label: "Líder",
    canReflexoes: true,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: true,
    isAdmin: false,
  },
  lider_ministerio: {
    label: "Líder",
    canReflexoes: true,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: true,
    isAdmin: false,
  },
  colaborador_ministerio: {
    label: "Voluntário",
    canReflexoes: false,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: true,
    isAdmin: false,
  },
  assinante: {
    label: "Membro",
    canReflexoes: false,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: false,
    isAdmin: false,
  },
  contributor: {
    label: "Voluntário",
    canReflexoes: false,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: true,
    isAdmin: false,
  },
  subscriber: {
    label: "Membro",
    canReflexoes: false,
    canEscalas: true,
    canUsers: false,
    canMinistries: false,
    canLivraria: false,
    isAdmin: false,
  },
};

export function getPermissions(
  role?: string | null,
  nicename?: string | null,
): Permissions {
  const key = (role || nicename || "").toLowerCase();
  const base = ROLE_PERMISSIONS[key] || ROLE_PERMISSIONS.subscriber;
  return { ...base, isPrivileged: base.isAdmin };
}

/** Remove barras finais para montar URLs da API sem duplicar "/". */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
