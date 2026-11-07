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

  const ACTION_LABELS: Record<string, string> = {
    schedule_join: "Entrou na escala",
    schedule_create: "Criou escala",
    schedule_update: "Atualizou escala",
    schedule_override: "Autorizou conflito",
    schedule_leave: "Saiu da escala",
    schedule_team_update: "Editou equipe",
    membership_set: "Vinculou membro",
    membership_remove: "Removeu vínculo",
    ministry_create: "Criou ministério",
    ministry_update: "Atualizou ministério",
    ministry_delete: "Excluiu ministério",
    user_role: "Alterou papel",
    user_invite: "Convidou usuário",
    user_delete: "Excluiu usuário",
    user_register_volunteer: "Cadastro de voluntário",
    user_register_bible_rats: "Cadastro Bible Rats",
    email_verify_manual: "Verificou e-mail",
    email_verification_resend: "Reenviou confirmação",
    livro_create: "Criou livro",
    livro_update: "Atualizou livro",
    livro_delete: "Excluiu livro",
    livro_stock: "Movimentou estoque",
    livro_cover: "Alterou capa",
    password_change: "Alterou senha",
    install: "Instalação",
    migrate: "Migração",
  };

  const FIELD_LABELS: Record<string, string> = {
    ministry_id: "Ministério",
    ministry: "Ministério",
    role: "Papel",
    estoque: "Estoque",
    tipo: "Tipo",
    email: "E-mail",
    title: "Título",
    titulo: "Título",
    verified: "Verificado",
    invite_sent: "Convite enviado",
    sent: "Enviado",
    reason: "Justificativa",
    conflicts: "Conflitos",
    quantidade: "Quantidade",
    motivo: "Motivo",
    referencia: "Referência",
    before: "Antes",
    after: "Depois",
    status: "Status",
    data_da_escala: "Data",
    horario: "Horário",
    equipe_nomes: "Equipe",
    equipe_emails: "E-mails",
    account_type: "Tipo de conta",
  };

  function label(key: string): string {
    return (
      FIELD_LABELS[key] ||
      key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
    );
  }

  function valueLabel(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (Array.isArray(value)) return value.map(valueLabel).join(", ");
    if (typeof value === "object") {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, val]) => `${label(key)}: ${valueLabel(val)}`)
        .join(" · ");
    }
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    return String(value);
  }

  function parseJson(raw: string): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  function renderDetails(item: AuditItem): string {
    const before = parseJson(item.before_json);
    const after = parseJson(item.after_json);
    if (!before && !after) {
      return '<span class="text-[11px] text-gray-500">Sem detalhes registrados.</span>';
    }
    const keys = Array.from(
      new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
    );
    const rows = keys
      .map((key) => {
        const beforeValue = before?.[key];
        const afterValue = after?.[key];
        const changed =
          JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
        return `
          <div class="grid grid-cols-[120px,1fr] gap-2 py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
            <dt class="text-[10px] font-black uppercase tracking-wider text-gray-500">${escapeHtml(label(key))}</dt>
            <dd class="text-[11px] text-gray-700 dark:text-gray-300">
              ${before ? `<span class="${changed ? "text-red-700 dark:text-red-300" : ""}">${escapeHtml(valueLabel(beforeValue))}</span>` : ""}
              ${before && after && changed ? '<i class="fa-solid fa-arrow-right mx-1.5 text-gray-400"></i>' : ""}
              ${after ? `<span class="${changed ? "text-green-700 dark:text-green-300 font-bold" : ""}">${escapeHtml(valueLabel(afterValue))}</span>` : ""}
            </dd>
          </div>
        `;
      })
      .join("");
    return `<dl class="rounded-xl bg-gray-50 dark:bg-slate-900 px-3 py-1">${rows || '<p class="text-[11px] text-gray-500 py-2">Sem alterações relevantes.</p>'}</dl>`;
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
            <td class="px-6 py-4"><span class="text-[11px] font-bold text-gray-700 dark:text-gray-300">${escapeHtml(ACTION_LABELS[item.action] || item.action)}</span><div class="text-[9px] text-gray-500 font-normal">${escapeHtml(item.action)}</div></td>
            <td class="px-6 py-4 text-[11px] text-gray-600 dark:text-gray-300">${escapeHtml(item.target_type)} #${item.target_id}</td>
            <td class="px-6 py-4">
              <details class="text-[10px] text-gray-600 dark:text-gray-300">
                <summary class="cursor-pointer font-bold text-[var(--color-brand)]">Ver antes/depois</summary>
                <div class="mt-2">${renderDetails(item)}</div>
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
