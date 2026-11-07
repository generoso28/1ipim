import { apiFetch } from "./api";
import { auth } from "./auth";
import { escapeHtml, showToast, onPageReady } from "./ui";

interface AuditItem {
  id: number;
  actor_id: number;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: number;
  before_json: string;
  after_json: string;
  created_at: string;
}

interface AuditResponse {
  items: AuditItem[];
  total: number;
  page: number;
  pages: number;
}

onPageReady("#audit-table-body", async () => {
  const session = await auth.ensureSession();
  if (!session) return;
  if (
    !session.isAdmin &&
    !session.isPastor &&
    session.role !== "administrator"
  ) {
    window.location.href = "/portal/";
    return;
  }

  const tableBody = document.getElementById("audit-table-body");
  const loading = document.getElementById("audit-loading");
  const empty = document.getElementById("audit-empty");
  const pageInfo = document.getElementById("audit-page-info");
  const prev = document.getElementById(
    "audit-prev",
  ) as HTMLButtonElement | null;
  const next = document.getElementById(
    "audit-next",
  ) as HTMLButtonElement | null;
  const actionInput = document.getElementById(
    "audit-action",
  ) as HTMLInputElement | null;
  const targetSelect = document.getElementById(
    "audit-target",
  ) as HTMLSelectElement | null;
  const targetIdInput = document.getElementById(
    "audit-target-id",
  ) as HTMLInputElement | null;
  const actorInput = document.getElementById(
    "audit-actor",
  ) as HTMLInputElement | null;

  let page = 1;
  let pages = 1;
  let total = 0;
  let timer = 0;

  function pretty(raw: string): string {
    if (!raw) return "";
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  function render(items: AuditItem[]): void {
    if (!tableBody) return;
    if (items.length === 0) {
      tableBody.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }
    empty?.classList.add("hidden");
    tableBody.innerHTML = items
      .map((item) => {
        const before = pretty(item.before_json);
        const after = pretty(item.after_json);
        return `
          <tr class="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/60 dark:hover:bg-slate-700/20 align-top">
            <td class="px-6 py-4 text-[11px] text-gray-500 whitespace-nowrap">${escapeHtml(item.created_at)}</td>
            <td class="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-300">${escapeHtml(item.actor_name)}<div class="text-[9px] text-gray-500 font-normal">ID ${item.actor_id}</div></td>
            <td class="px-6 py-4"><code class="text-[10px] bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded">${escapeHtml(item.action)}</code></td>
            <td class="px-6 py-4 text-[11px] text-gray-600 dark:text-gray-300">${escapeHtml(item.target_type)} #${item.target_id}</td>
            <td class="px-6 py-4">
              <details class="text-[10px] text-gray-600 dark:text-gray-300">
                <summary class="cursor-pointer font-bold text-[var(--color-brand)]">Ver antes/depois</summary>
                <div class="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <pre class="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-48">${escapeHtml(before || "—")}</pre>
                  <pre class="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-48">${escapeHtml(after || "—")}</pre>
                </div>
              </details>
            </td>
          </tr>
        `;
      })
      .join("");

    if (pageInfo)
      pageInfo.innerText = `Página ${page} de ${pages} · ${total} registros`;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= pages;
  }

  async function load(): Promise<void> {
    loading?.classList.remove("hidden");
    empty?.classList.add("hidden");
    if (tableBody) tableBody.innerHTML = "";

    const params = new URLSearchParams({ per_page: "30", page: String(page) });
    if (actionInput?.value.trim())
      params.set("action", actionInput.value.trim());
    if (targetSelect?.value) params.set("target_type", targetSelect.value);
    if (Number(targetIdInput?.value) > 0)
      params.set("target_id", targetIdInput?.value || "");
    if (Number(actorInput?.value) > 0)
      params.set("actor_id", actorInput?.value || "");

    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/admin/audit?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar auditoria");
      const data = (await response.json()) as AuditResponse;
      total = data.total || 0;
      pages = Math.max(1, data.pages || 1);
      render(data.items || []);
    } catch {
      showToast("Erro ao carregar auditoria", "error");
    } finally {
      loading?.classList.add("hidden");
    }
  }

  actionInput?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      page = 1;
      void load();
    }, 350);
  });
  targetSelect?.addEventListener("change", () => {
    page = 1;
    void load();
  });
  targetIdInput?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      page = 1;
      void load();
    }, 350);
  });
  actorInput?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      page = 1;
      void load();
    }, 350);
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
