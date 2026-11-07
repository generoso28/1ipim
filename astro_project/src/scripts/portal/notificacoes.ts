import { apiFetch } from "./api";
import { auth } from "./auth";
import { escapeAttribute, escapeHtml, showToast, onPageReady } from "./ui";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  pages: number;
  unread_count: number;
}

const ICONS: Record<string, string> = {
  user_pending: "fa-user-clock",
  membership_approved: "fa-user-check",
  schedule_created: "fa-calendar-plus",
  schedule_updated: "fa-calendar-day",
  schedule_join: "fa-user-plus",
  schedule_override: "fa-triangle-exclamation",
  low_stock: "fa-boxes-stacked",
  email_verified: "fa-envelope-circle-check",
};

onPageReady("#notifications-list", async () => {
  const session = await auth.ensureSession();
  if (!session) return;

  const list = document.getElementById("notifications-list");
  const loading = document.getElementById("notifications-loading");
  const empty = document.getElementById("notifications-empty");
  const readAll = document.getElementById(
    "notifications-read-all",
  ) as HTMLButtonElement | null;
  const pageInfo = document.getElementById("notifications-page-info");
  const prev = document.getElementById(
    "notifications-prev",
  ) as HTMLButtonElement | null;
  const next = document.getElementById(
    "notifications-next",
  ) as HTMLButtonElement | null;

  let page = 1;
  let pages = 1;
  let total = 0;

  function updateBadge(count: number): void {
    window.dispatchEvent(
      new CustomEvent("ipim:notifications-updated", { detail: { count } }),
    );
  }

  function render(items: NotificationItem[]): void {
    if (!list) return;
    if (items.length === 0) {
      list.classList.add("hidden");
      empty?.classList.remove("hidden");
      return;
    }
    empty?.classList.add("hidden");
    list.classList.remove("hidden");
    list.innerHTML = items
      .map((item) => {
        const icon = ICONS[item.type] || "fa-bell";
        const unread = !item.read_at;
        return `
          <article class="notification-item ${unread ? "border-[var(--color-brand)]/30 bg-white dark:bg-slate-800" : "bg-white/70 dark:bg-slate-800/60"} border border-gray-100 dark:border-slate-700 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div class="w-11 h-11 rounded-xl ${unread ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]" : "bg-gray-100 dark:bg-slate-900 text-gray-500"} flex items-center justify-center shrink-0">
              <i class="fa-solid ${escapeAttribute(icon)}"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-black text-gray-900 dark:text-white text-sm">${escapeHtml(item.title)}</h2>
                ${unread ? '<span class="w-2 h-2 rounded-full bg-[var(--color-brand)]"></span>' : ""}
              </div>
              ${item.message ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">${escapeHtml(item.message)}</p>` : ""}
              <p class="text-[10px] text-gray-500 mt-2">${escapeHtml(item.created_at)}</p>
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
              ${item.link ? `<a href="${escapeAttribute(item.link)}" class="notification-open px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-[10px] font-black uppercase tracking-wider" data-id="${item.id}">Abrir</a>` : ""}
              ${unread ? `<button type="button" class="notification-read text-[10px] font-bold text-gray-500 hover:text-[var(--color-brand)]" data-id="${item.id}">Marcar lida</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    list
      .querySelectorAll<HTMLButtonElement>(".notification-read")
      .forEach((button) => {
        button.onclick = () => {
          void markRead(Number(button.getAttribute("data-id")));
        };
      });
    list
      .querySelectorAll<HTMLAnchorElement>(".notification-open")
      .forEach((link) => {
        link.addEventListener("click", () => {
          void markRead(Number(link.getAttribute("data-id")), false);
        });
      });

    if (pageInfo)
      pageInfo.innerText = `Página ${page} de ${pages} · ${total} notificações`;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= pages;
  }

  async function load(): Promise<void> {
    loading?.classList.remove("hidden");
    empty?.classList.add("hidden");
    list?.classList.add("hidden");
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/notifications?per_page=20&page=${page}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar notificações");
      const data = (await response.json()) as NotificationsResponse;
      total = data.total || 0;
      pages = Math.max(1, data.pages || 1);
      updateBadge(data.unread_count || 0);
      render(data.items || []);
    } catch {
      showToast("Erro ao carregar notificações", "error");
    } finally {
      loading?.classList.add("hidden");
    }
  }

  async function markRead(id: number, reload = true): Promise<void> {
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/notifications/${id}/read`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Falha ao marcar notificação");
      const data = (await response.json()) as { unread_count?: number };
      updateBadge(data.unread_count || 0);
      if (reload) await load();
    } catch {
      showToast("Erro ao marcar notificação", "error");
    }
  }

  readAll?.addEventListener("click", async () => {
    try {
      const response = await apiFetch(
        "/wp-json/1ipim/v1/notifications/read-all",
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Falha ao marcar notificações");
      updateBadge(0);
      showToast("Notificações marcadas como lidas", "success");
      await load();
    } catch {
      showToast("Erro ao marcar notificações", "error");
    }
  });

  prev?.addEventListener("click", () => {
    if (page <= 1) return;
    page--;
    void load();
  });
  next?.addEventListener("click", () => {
    if (page >= pages) return;
    page++;
    void load();
  });

  await load();
});
