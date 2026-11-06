import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml, getUserInitials, showToast } from "./ui";
import type { Permissions } from "./types";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  external?: boolean;
}

const WP_ADMIN_URL = "https://1ipim.online/admin/wp-admin";

function buildNavItems(permissions: Permissions): NavItem[] {
  const items: NavItem[] = [];

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
  if (permissions.isAdmin) {
    items.push(
      {
        href: "/portal/usuarios",
        icon: "fa-solid fa-users-gear",
        label: "Voluntários",
      },
      {
        href: "/portal/ministerios",
        icon: "fa-solid fa-layer-group",
        label: "Ministérios",
      },
      {
        href: WP_ADMIN_URL,
        icon: "fa-brands fa-wordpress text-blue-500",
        label: "WP Admin",
        external: true,
      },
    );
  }

  return items;
}

function renderNavigation(permissions: Permissions): void {
  const container = document.getElementById("nav-dynamic-links");
  if (!container) return;

  container.innerHTML = buildNavItems(permissions)
    .map((item) => {
      const active =
        !item.external && window.location.pathname.startsWith(item.href);
      return `
        <a href="${item.href}" ${item.external ? 'target="_blank" rel="nofollow"' : ""} class="nav-link flex items-center gap-4 px-3 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-[var(--color-brand)] transition-all group/link overflow-hidden whitespace-nowrap ${active ? "bg-gray-50 dark:bg-slate-700/50 text-[var(--color-brand)]" : ""}">
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
  if (button && sidebar) {
    button.onclick = () => sidebar.classList.toggle("-translate-x-full");
  }
}

function setupLogout(): void {
  const button = document.getElementById("portal-logout-btn");
  if (button) {
    button.onclick = () => {
      auth.clear();
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

document.addEventListener("astro:page-load", () => {
  if (!auth.getToken()) {
    window.location.href = "/portal/login";
    return;
  }

  const user = auth.getUser();
  const permissions = getPermissions(user.role, user.nicename);

  renderUser(permissions);
  renderNavigation(permissions);
  setupThemeToggle();
  setupMobileMenu();
  setupLogout();
  hideAuthGuard();

  // Compatibilidade com scripts antigos que chamam window.showToast.
  (window as Window & { showToast?: typeof showToast }).showToast = showToast;
});
