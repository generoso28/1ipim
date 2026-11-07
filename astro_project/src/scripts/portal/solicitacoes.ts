import { apiFetch, getErrorMessage } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml, onPageReady, showToast } from "./ui";

interface AccessRequest {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  ministry_id: number;
  ministry_name: string;
  requested_role: "colaborador" | "lider";
  status: "pendente" | "aprovado" | "recusado";
  motivo: string;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
}

const $ = (id: string): HTMLElement | null => document.getElementById(id);

let isGlobal = false;

function feedback(type: "error" | "success", message: string): void {
  const box = $("requests-feedback");
  if (!box) return;
  box.className =
    type === "success"
      ? "mb-6 p-4 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
      : "mb-6 p-4 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  box.textContent = message;
  box.classList.remove("hidden");
  if (type === "success") {
    window.setTimeout(() => box.classList.add("hidden"), 4000);
  }
}

function statusBadge(status: string): string {
  if (status === "aprovado") {
    return '<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aprovada</span>';
  }
  if (status === "recusado") {
    return '<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Recusada</span>';
  }
  return '<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pendente</span>';
}

function card(item: AccessRequest): string {
  const roleOptions = isGlobal
    ? `<option value="colaborador" ${item.requested_role === "colaborador" ? "selected" : ""}>Colaborador</option>
       <option value="lider" ${item.requested_role === "lider" ? "selected" : ""}>Líder</option>`
    : `<option value="colaborador">Colaborador</option>`;

  return `
    <article class="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="min-w-0">
          <h2 class="text-base font-black text-gray-900 dark:text-white truncate">${escapeHtml(item.user_name)}</h2>
          <p class="text-xs text-gray-500 truncate">${escapeHtml(item.user_email)}</p>
        </div>
        ${statusBadge(item.status)}
      </div>

      <div class="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-3">
        <p><span class="font-bold text-gray-900 dark:text-white">Ministério:</span> ${escapeHtml(item.ministry_name)}</p>
        <p><span class="font-bold text-gray-900 dark:text-white">Enviada em:</span> ${escapeHtml(item.created_at)}</p>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 mb-4">${escapeHtml(item.motivo || "Sem justificativa.")}</p>

      ${item.review_note ? `<p class="text-xs text-gray-500 mb-4"><span class="font-bold">Observação:</span> ${escapeHtml(item.review_note)}</p>` : ""}

      ${
        item.status === "pendente"
          ? `
        <div class="flex flex-wrap items-center gap-2">
          <select data-role="${item.id}" class="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none">
            ${roleOptions}
          </select>
          <button data-approve="${item.id}" class="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            <i class="fa-solid fa-check mr-1"></i> Aprovar
          </button>
          <button data-reject="${item.id}" class="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">
            Recusar
          </button>
        </div>
      `
          : ""
      }
    </article>
  `;
}

onPageReady("#requests-list", () => {
  void (async () => {
    const session = await auth.ensureSession();
    if (!session) return;
    const permissions = getPermissions(session);
    if (!permissions.canApproveAccess) {
      window.location.href = "/portal/";
      return;
    }

    const list = $("requests-list");
    const empty = $("requests-empty");
    const loading = $("requests-loading");
    const statusSelect = $("requests-status") as HTMLSelectElement | null;
    let items: AccessRequest[] = [];

    try {
      const me = await apiFetch("/wp-json/1ipim/v1/me/portal-access");
      if (me.ok) {
        const data = (await me.json()) as { is_global?: boolean };
        isGlobal = Boolean(data.is_global);
      }
    } catch {
      isGlobal = permissions.isAdmin;
    }

    function render(): void {
      if (!list) return;
      if (items.length === 0) {
        list.innerHTML = "";
        empty?.classList.remove("hidden");
        return;
      }
      empty?.classList.add("hidden");
      list.innerHTML = items.map(card).join("");
    }

    async function load(): Promise<void> {
      loading?.classList.remove("hidden");
      empty?.classList.add("hidden");
      if (list) list.innerHTML = "";
      try {
        const status = statusSelect?.value || "pendente";
        const response = await apiFetch(
          `/wp-json/1ipim/v1/admin/access-requests?status=${status}`,
        );
        if (!response.ok) throw new Error("Não foi possível carregar as solicitações.");
        items = (await response.json()) as AccessRequest[];
        render();
      } catch (error) {
        feedback(
          "error",
          getErrorMessage(error, "Não foi possível carregar as solicitações."),
        );
      } finally {
        loading?.classList.add("hidden");
      }
    }

    async function review(id: number, decision: "approve" | "reject"): Promise<void> {
      const role =
        (document.querySelector<HTMLSelectElement>(`[data-role="${id}"]`)?.value ||
          "colaborador") as "colaborador" | "lider";
      let note = "";
      if (decision === "reject") {
        note = window.prompt("Motivo da recusa (opcional):") || "";
      }

      try {
        const response = await apiFetch(
          `/wp-json/1ipim/v1/admin/access-requests/${id}/${decision}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role, note }),
          },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            payload.error === "role_forbidden"
              ? "Apenas admin/pastor pode aprovar como líder."
              : "Não foi possível concluir a ação.",
          );
        }
        showToast(
          decision === "approve"
            ? "Solicitação aprovada."
            : "Solicitação recusada.",
          "success",
        );
        await load();
      } catch (error) {
        feedback(
          "error",
          getErrorMessage(error, "Não foi possível concluir a ação."),
        );
      }
    }

    list?.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const approve = target.closest<HTMLElement>("[data-approve]");
      const reject = target.closest<HTMLElement>("[data-reject]");
      if (approve) void review(Number(approve.dataset.approve), "approve");
      else if (reject) void review(Number(reject.dataset.reject), "reject");
    });

    statusSelect?.addEventListener("change", () => void load());

    await load();
  })();
});
