import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml } from "./ui";
import type { Permissions } from "./types";

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  color: string;
  href: string;
}

function buildCards(permissions: Permissions): DashboardCard[] {
  const cards: DashboardCard[] = [];

  if (permissions.canReflexoes) {
    cards.push({
      title: "Reflexões",
      description: "Gerencie as mensagens e boletins semanais.",
      icon: "fa-pen-nib",
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      href: "/portal/gerenciar-reflexoes",
    });
  }

  if (permissions.canEscalas) {
    cards.push({
      title: "Escalas de Serviço",
      description: permissions.isPrivileged
        ? "Gerencie todos os voluntários"
        : "Veja seus dias de serviço",
      icon: "fa-calendar-check",
      color:
        "bg-brand-100 text-[var(--color-brand)] dark:bg-[var(--color-brand)]/10 dark:text-[var(--color-brand)]",
      href: "/portal/escalas",
    });
  }

  if (permissions.canLivraria) {
    cards.push({
      title: "Livraria",
      description: "Gerencie catálogo e estoque da igreja.",
      icon: "fa-book",
      color:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      href: "/portal/livraria",
    });
  }

  if (permissions.isAdmin) {
    cards.push(
      {
        title: "Voluntários",
        description: "Aprove novos cadastros e defina cargos.",
        icon: "fa-users-gear",
        color:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
        href: "/portal/usuarios",
      },
      {
        title: "Ministérios",
        description: "Crie e organize as equipes de trabalho.",
        icon: "fa-layer-group",
        color:
          "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        href: "/portal/ministerios",
      },
    );
  }

  return cards;
}

function renderCards(cards: DashboardCard[]): void {
  const grid = document.getElementById("dashboard-grid");
  if (!grid) return;

  grid.innerHTML = cards
    .map(
      (card) => `
        <a href="${card.href}" class="group bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between h-full">
          <div>
            <div class="w-14 h-14 ${card.color} rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              <i class="fa-solid ${card.icon}"></i>
            </div>
            <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">${escapeHtml(card.title)}</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">${escapeHtml(card.description)}</p>
          </div>
          <div class="mt-8 flex items-center gap-2 text-[var(--color-brand)] font-bold text-sm">
            Abrir ferramenta <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </div>
        </a>
      `,
    )
    .join("");
}

document.addEventListener("astro:page-load", () => {
  const user = auth.getUser();
  const permissions = getPermissions(user.role, user.nicename);

  const greeting = document.getElementById("dash-user-name");
  if (greeting) greeting.innerText = user.displayName || "Voluntário";

  renderCards(buildCards(permissions));
});
