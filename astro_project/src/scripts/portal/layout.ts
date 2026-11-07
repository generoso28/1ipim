import { apiFetch } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml, getUserInitials, showToast, onPageReady } from "./ui";
import { WP_ADMIN_URL } from "../../config/api";
import type { Permissions } from "./types";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  external?: boolean;
}

function buildNavItems(permissions: Permissions): NavItem[] {
  const items: NavItem[] = [
    {
      href: "/portal/notificacoes",
      icon: "fa-solid fa-bell",
      label: "Notificações",
    },
  ];

  if (permissions.canReflexoes) {
    items.push({
      href: "/portal/gerenciar-reflexoes",
      icon: "fa-solid fa-pen-nib",
      label: "Reflexões",
    });
  }
  if (permissions.canEscalas) {
    items.push({
      href: "/portal/escalas",
      icon: "fa-solid fa-calendar-check",
      label: "Escalas",
    });
  }
  if (permissions.canLivraria) {
    items.push({
      href: "/portal/livraria",
      icon: "fa-solid fa-book",
      label: "Livraria",
    });
  }
  if (permissions.canGrupos) {
    items.push({
      href: "/portal/pequenos-grupos",
      icon: "fa-solid fa-people-group",
      label: "Pequenos Grupos",
    });
  }
  if (permissions.canProgramacao) {
    items.push({
      href: "/portal/programacao",
      icon: "fa-solid fa-calendar-days",
      label: "Programação",
    });
  }
  if (permissions.canMinistries) {
    items.push({
      href: "/portal/ministerios",
      icon: "fa-solid fa-layer-group",
      label: "Ministérios",
    });
  }
  if (permissions.canAuditoria) {
    items.push({
      href: "/portal/auditoria",
      icon: "fa-solid fa-clipboard-list",
      label: "Auditoria",
    });
  }
  if (permissions.canApproveAccess) {
    items.push({
      href: "/portal/solicitacoes",
      icon: "fa-solid fa-user-check",
      label: "Solicitações",
    });
  }
  if (permissions.isAdmin) {
    items.push(
      {
        href: "/portal/usuarios",
        icon: "fa-solid fa-users-gear",
        label: "Voluntários",
      },
      {
        href: WP_ADMIN_URL,
        icon: "fa-brands fa-wordpress text-blue-500",
        label: "WP Admin",
        external: true,
      },
    );
  }

  items.push({
    href: "/portal/perfil",
    icon: "fa-solid fa-user",
    label: "Meu perfil",
  });

  return items;
}

function setNotificationBadge(count: number): void {
  const link = document.querySelector<HTMLAnchorElement>(
    '#nav-dynamic-links a[href="/portal/notificacoes"]',
  );
  if (!link) return;
  link.querySelector("[data-notification-badge]")?.remove();
  if (count <= 0) return;

  const badge = document.createElement("span");
  badge.setAttribute("data-notification-badge", "1");
  badge.className =
    "ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-700 text-white text-[9px] font-black flex items-center justify-center";
  badge.textContent = count > 9 ? "9+" : String(count);
  link.appendChild(badge);
}

async function refreshNotificationBadge(): Promise<void> {
  try {
    const response = await apiFetch(
      "/wp-json/1ipim/v1/notifications/unread-count",
    );
    if (!response.ok) return;
    const data = (await response.json()) as { count?: number };
    setNotificationBadge(Number(data.count || 0));
  } catch {
    // silencioso: o badge é apenas um indicador
  }
}

function renderNavigation(permissions: Permissions): void {
  const container = document.getElementById("nav-dynamic-links");
  if (!container) return;

  container.innerHTML = buildNavItems(permissions)
    .map((item) => {
      const active =
        !item.external && window.location.pathname.startsWith(item.href);
      return `
        <a href="${item.href}" ${item.external ? 'target="_blank" rel="nofollow"' : ""} ${active ? 'aria-current="page"' : ""} class="nav-link flex items-center gap-4 px-3 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-[var(--color-brand)] transition-all group/link overflow-hidden whitespace-nowrap ${active ? "bg-gray-50 dark:bg-slate-700/50 text-[var(--color-brand)]" : ""}">
          <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center">
            <i class="${item.icon}"></i>
          </div>
          <span class="font-bold text-sm lg:opacity-100 lg:group-hover:opacity-100 opacity-0 transition-opacity">${escapeHtml(item.label)}</span>
        </a>
      `;
    })
    .join("");
}

function renderUser(permissions: Permissions): void {
  const user = auth.getUser();
  const name = document.getElementById("user-nav-name");
  const role = document.getElementById("user-nav-role");
  const initials = document.getElementById("user-initials");

  if (name) name.innerText = user.displayName || "Usuário";
  if (role) role.innerText = permissions.label;
  if (initials) initials.innerText = getUserInitials(user.displayName) || "..";
}

function setupThemeToggle(): void {
  const toggle = document.getElementById("portal-theme-toggle");
  const icon = document.getElementById("portal-theme-icon");
  const label = document.getElementById("portal-theme-text");

  const updateLabel = () => {
    if (!icon || !label) return;
    const isDark = document.documentElement.classList.contains("dark");
    icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    label.innerText = isDark ? "Modo Claro" : "Modo Escuro";
  };

  updateLabel();

  if (toggle) {
    toggle.onclick = () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      updateLabel();
    };
  }
}

function setupMobileMenu(): void {
  const button = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("portal-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (!button || !sidebar) return;

  const setOpen = (open: boolean): void => {
    sidebar.classList.toggle("-translate-x-full", !open);
    backdrop?.classList.toggle("hidden", !open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  };

  button.onclick = () => {
    setOpen(sidebar.classList.contains("-translate-x-full"));
  };
  backdrop?.addEventListener("click", () => setOpen(false));
  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

function setupLogout(): void {
  const button = document.getElementById("portal-logout-btn");
  if (button) {
    button.onclick = async () => {
      button.setAttribute("aria-busy", "true");
      await auth.logout();
      window.location.href = "/portal/login";
    };
  }
}

function hideAuthGuard(): void {
  const guard = document.getElementById("auth-guard");
  if (!guard) return;

  setTimeout(() => {
    guard.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => guard.remove(), 500);
  }, 300);
}

function renderShell(user: { role: string; nicename: string }): void {
  const permissions = getPermissions(user);
  renderUser(permissions);
  renderNavigation(permissions);
  void refreshNotificationBadge();
}

onPageReady("#portal-root", () => {
  // Pinta a interface com o cache (se houver) para evitar tela branca.
  if (auth.hasSession()) {
    renderShell(auth.getUser());
    hideAuthGuard();
  }

  window.addEventListener("ipim:notifications-updated", (event) => {
    const count = Number(
      (event as CustomEvent<{ count?: number }>).detail?.count || 0,
    );
    setNotificationBadge(count);
  });

  setupThemeToggle();
  setupMobileMenu();
  setupLogout();

  const path = window.location.pathname.replace(/\/+$/, "");
  const homeLink = document.querySelector<HTMLAnchorElement>(
    '#portal-sidebar nav > a[href="/portal"]',
  );
  if (homeLink && path === "/portal") {
    homeLink.classList.add(
      "bg-gray-50",
      "dark:bg-slate-700/50",
      "text-[var(--color-brand)]",
    );
    homeLink.setAttribute("aria-current", "page");
  }

  // Compatibilidade com scripts antigos que chamam window.showToast.
  (window as Window & { showToast?: typeof showToast }).showToast = showToast;

  void (async () => {
    const user = await auth.ensureSession();
    if (!user) {
      auth.clear();
      window.location.href = "/portal/login";
      return;
    }

    renderShell(user);
    hideAuthGuard();

    if (user.hasPortalAccess === false) {
      window.location.href = "/portal/solicitar-acesso";
    }
  })();
});
