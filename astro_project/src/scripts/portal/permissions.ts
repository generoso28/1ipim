import type { Permissions } from "./types";

type PermissionSet = Omit<Permissions, "isPrivileged" | "isMinistryLeader" | "canGrupos">;

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

interface PermissionUser {
  role?: string | null;
  nicename?: string | null;
  roles?: string[];
  memberships?: Array<{ role?: string }>;
  isAdmin?: boolean;
  isPastor?: boolean;
  isMinistryLeader?: boolean;
  canManageLivraria?: boolean;
  canManageGrupos?: boolean;
}

export function getPermissions(
  userOrRole?: string | PermissionUser | null,
  nicename?: string | null,
): Permissions {
  const user: PermissionUser =
    typeof userOrRole === "object" && userOrRole !== null
      ? userOrRole
      : { role: userOrRole, nicename };
  const key = (user.role || user.nicename || "").toLowerCase();
  const base = ROLE_PERMISSIONS[key] || ROLE_PERMISSIONS.subscriber;
  const roles = (user.roles || []).map((role) => role.toLowerCase());

  const isAdmin =
    Boolean(user.isAdmin) ||
    base.isAdmin ||
    roles.includes("administrator") ||
    roles.includes("pastor");
  const isMinistryLeader =
    Boolean(user.isMinistryLeader) ||
    roles.includes("lider_ministerio") ||
    roles.includes("editor") ||
    roles.includes("lider") ||
    (user.memberships || []).some((membership) => membership.role === "lider");

  return {
    ...base,
    label: isAdmin ? "Administrador" : isMinistryLeader ? "Líder" : base.label,
    canReflexoes: isAdmin || base.canReflexoes,
    canUsers: isAdmin,
    canMinistries: isAdmin || isMinistryLeader,
    canLivraria: isAdmin || Boolean(user.canManageLivraria),
    canGrupos: isAdmin || Boolean(user.canManageGrupos),
    isAdmin,
    isPrivileged: isAdmin || isMinistryLeader,
    isMinistryLeader,
  };
}

/** Remove barras finais para montar URLs da API sem duplicar "/". */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
