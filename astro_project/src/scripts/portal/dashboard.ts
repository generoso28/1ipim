import { apiFetch } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml, onPageReady, showToast } from "./ui";
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
      description: permissions.isAdmin
        ? "Gerencie todas as escalas da igreja"
        : permissions.isMinistryLeader
          ? "Gerencie as escalas do seu ministério"
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

  if (permissions.canGrupos) {
    cards.push({
      title: "Pequenos Grupos",
      description: permissions.isAdmin || permissions.isMinistryLeader
        ? "Gerencie os grupos e registre encontros."
        : "Registre encontros e presença do seu grupo.",
      icon: "fa-people-group",
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      href: "/portal/pequenos-grupos",
    });
  }

  if (permissions.canMinistries) {
    cards.push({
      title: "Ministérios",
      description: permissions.isAdmin
        ? "Crie e organize as equipes de trabalho."
        : "Gerencie a equipe do seu ministério.",
      icon: "fa-layer-group",
      color:
        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      href: "/portal/ministerios",
    });
  }

  if (permissions.isAdmin) {
    cards.push({
      title: "Voluntários",
      description: "Aprove novos cadastros e defina cargos.",
      icon: "fa-users-gear",
      color:
        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
      href: "/portal/usuarios",
    });
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

interface DashboardSummary {
  pending_users?: number;
  low_stock?: number;
  unread_notifications?: number;
  next_schedules?: Array<{
    id: number;
    title: string;
    date: string;
    time: string;
    ministry: string;
  }>;
}

function renderSummary(summary: DashboardSummary): void {
  const container = document.getElementById("dashboard-summary");
  if (!container) return;
  const next = summary.next_schedules?.[0];
  const nextLabel = next
    ? `${next.date.split("-").reverse().slice(0, 2).join("/")} ${next.time || ""}`
    : "Nenhuma";
  const nextDetail = next ? next.title : "Sem escalas futuras";

  const cards = [
    {
      label: "Cadastros pendentes",
      value: String(summary.pending_users ?? 0),
      detail: "aprovações aguardando",
      icon: "fa-user-clock",
      href: "/portal/usuarios",
    },
    {
      label: "Estoque baixo",
      value: String(summary.low_stock ?? 0),
      detail: "livros para repor",
      icon: "fa-triangle-exclamation",
      href: "/portal/livraria",
    },
    {
      label: "Não lidas",
      value: String(summary.unread_notifications ?? 0),
      detail: "notificações",
      icon: "fa-bell",
      href: "/portal/notificacoes",
    },
    {
      label: "Próxima escala",
      value: nextLabel,
      detail: nextDetail,
      icon: "fa-calendar-check",
      href: "/portal/escalas",
    },
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <a href="${card.href}" class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">${escapeHtml(card.label)}</span>
            <i class="fa-solid ${card.icon} text-[var(--color-brand)]"></i>
          </div>
          <p class="text-xl font-black text-gray-900 dark:text-white truncate">${escapeHtml(card.value)}</p>
          <p class="text-[10px] text-gray-500 mt-1 truncate">${escapeHtml(card.detail)}</p>
        </a>
      `,
    )
    .join("");
}

onPageReady("#dashboard-grid", () => {
  void (async () => {
    const user = (await auth.ensureSession()) ?? auth.getUser();
    const permissions = getPermissions(user);

    const greeting = document.getElementById("dash-user-name");
    if (greeting) greeting.innerText = user.displayName || "Voluntário";

    renderCards(buildCards(permissions));

    try {
      const response = await apiFetch("/wp-json/1ipim/v1/dashboard");
      if (response.ok) {
        renderSummary((await response.json()) as DashboardSummary);
      }
    } catch {
      showToast("Não foi possível carregar o resumo operacional", "info");
    }
  })();
});
