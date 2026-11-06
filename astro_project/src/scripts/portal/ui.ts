import type { ToastType } from "./types";

const TOAST_STYLES: Record<ToastType, string> = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  info: "bg-[var(--color-brand)] text-white",
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: "fa-circle-check",
  error: "fa-circle-exclamation",
  info: "fa-circle-info",
};

/** Exibe um toast no canto inferior direito (mesmo visual do portal antigo). */
export function showToast(message: string, type: ToastType = "info"): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `${TOAST_STYLES[type]} px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up transform transition-all duration-300 translate-y-12 opacity-0 font-bold text-sm min-w-[280px]`;
  toast.innerHTML = `
    <i class="fa-solid ${TOAST_ICONS[type]} text-xl"></i>
    <span></span>
  `;
  const text = toast.querySelector("span");
  if (text) text.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.classList.remove("translate-y-12", "opacity-0"), 10);
  setTimeout(() => {
    toast.classList.add("translate-y-12", "opacity-0");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value: unknown): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

interface LoadingState {
  button?: HTMLButtonElement | null;
  label?: HTMLElement | null;
  loader?: HTMLElement | null;
  arrow?: HTMLElement | null;
  loading: boolean;
  idleText: string;
  busyText: string;
}

/** Alterna o estado visual de um botão com loader. */
export function setLoadingState({
  button,
  label,
  loader,
  arrow,
  loading,
  idleText,
  busyText,
}: LoadingState): void {
  if (button) button.disabled = loading;
  if (label) label.innerText = loading ? busyText : idleText;
  if (loader) loader.classList.toggle("hidden", !loading);
  if (arrow) arrow.classList.toggle("hidden", loading);
}
