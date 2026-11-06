/**
 * Tipos compartilhados do Portal 1IPIM.
 * Os tipos de WordPress refletem apenas os campos usados pelo portal.
 */

export type PortalRole =
  | "pastor"
  | "admin"
  | "administrator"
  | "editor"
  | "lider"
  | "leader"
  | "contributor"
  | "subscriber"
  | string;

export interface PortalUser {
  email: string | null;
  nicename: string;
  displayName: string;
  role: PortalRole;
  id: string;
  ministries: number[];
}

export interface Permissions {
  label: string;
  canReflexoes: boolean;
  canEscalas: boolean;
  canUsers: boolean;
  canMinistries: boolean;
  canLivraria: boolean;
  isAdmin: boolean;
  isPrivileged: boolean;
}

export interface WpRendered {
  rendered: string;
  raw?: string;
}

export interface WpPost {
  id: number;
  date: string;
  modified: string;
  status: string;
  title: WpRendered;
  content: WpRendered;
}

export interface WpUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  meta?: {
    ministries_requested?: string;
    ministries_approved?: string;
  };
}

export interface WpMinistry {
  id: number;
  title: WpRendered;
}

export interface WpSchedule {
  id: number;
  date: string;
  title: WpRendered;
  content?: WpRendered;
  meta?: {
    data_da_escala?: string;
    ministerio_id?: string;
    equipe_nomes?: string;
    equipe_emails?: string;
    horario?: string;
  };
}

export type ToastType = "success" | "error" | "info";
