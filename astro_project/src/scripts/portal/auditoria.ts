import { apiFetch, getErrorMessage } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
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

interface ReportOptions {
  grupos: Array<{ id: number; nome: string }>;
  ministerios: Array<{ id: number; nome: string }>;
  escopo: { global: boolean; "ministérios": number; grupos: number };
}

type ReportKey = "frequencia" | "escalas" | "voluntarios" | "estoque";

const REPORT_FILES: Record<ReportKey, string> = {
  frequencia: "frequencia-pg.csv",
  escalas: "escalas.csv",
  voluntarios: "voluntarios.csv",
  estoque: "estoque-baixo.csv",
};

const $ = (id: string): HTMLElement | null => document.getElementById(id);

onPageReady("#audit-table-body", async () => {
  const session = await auth.ensureSession();
  if (!session) return;

  const permissions = getPermissions(session);
  if (!permissions.canAuditoria) {
    window.location.href = "/portal/";
    return;
  }

  // ------------------------------------------------------------------
  // Abas
  // ------------------------------------------------------------------
  const logPanel = $("tab-panel-log");
  const reportPanel = $("tab-panel-relatorios");
  const logButton = $("tab-btn-log");
  const reportButton = $("tab-btn-relatorios");

  function activate(tab: "log" | "relatorios"): void {
    const isLog = tab === "log";
    logPanel?.classList.toggle("hidden", !isLog);
    reportPanel?.classList.toggle("hidden", isLog);
    logButton?.classList.toggle("bg-[var(--color-brand)]", isLog);
    logButton?.classList.toggle("text-white", isLog);
    logButton?.classList.toggle("bg-white", !isLog);
    logButton?.classList.toggle("dark:bg-slate-800", !isLog);
    logButton?.classList.toggle("text-gray-500", !isLog);
    logButton?.classList.toggle("dark:text-gray-300", !isLog);
    logButton?.classList.toggle("border", !isLog);
    logButton?.classList.toggle("border-gray-100", !isLog);
    logButton?.classList.toggle("dark:border-slate-700", !isLog);
    reportButton?.classList.toggle("bg-[var(--color-brand)]", !isLog);
    reportButton?.classList.toggle("text-white", !isLog);
    reportButton?.classList.toggle("bg-white", isLog);
    reportButton?.classList.toggle("dark:bg-slate-800", isLog);
    reportButton?.classList.toggle("text-gray-500", isLog);
    reportButton?.classList.toggle("dark:text-gray-300", isLog);
    reportButton?.classList.toggle("border", isLog);
    reportButton?.classList.toggle("border-gray-100", isLog);
    reportButton?.classList.toggle("dark:border-slate-700", isLog);
    logButton?.setAttribute("aria-selected", String(isLog));
    reportButton?.setAttribute("aria-selected", String(!isLog));
    if (!isLog) void ensureOptions();
  }

  logButton?.addEventListener("click", () => activate("log"));
  reportButton?.addEventListener("click", () => activate("relatorios"));

  // ------------------------------------------------------------------
  // Log
  // ------------------------------------------------------------------
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
    grupo_create: "Criou PG",
    grupo_update: "Atualizou PG",
    grupo_delete: "Excluiu PG",
    grupo_encontro_create: "Registrou encontro",
    grupo_encontro_foto: "Enviou foto do encontro",
    grupo_lideres: "Vinculou líderes",
    programacao_create: "Criou item da programação",
    programacao_update: "Atualizou programação",
    programacao_delete: "Excluiu item da programação",
    programacao_seed: "Populou programação",
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
    inserted: "Inseridos",
    updated: "Atualizados",
    skipped: "Ignorados",
    changed: "Alterados",
    total: "Total",
    file: "Arquivo",
    count: "Quantidade",
    nome: "Nome",
    foto_url: "Foto",
    lideres: "Líderes",
    publico_presente: "Público",
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

  // ------------------------------------------------------------------
  // Relatórios
  // ------------------------------------------------------------------
  const reportSelect = $("report-select") as HTMLSelectElement | null;
  const groupSelect = $("report-group") as HTMLSelectElement | null;
  const ministrySelect = $("report-ministry") as HTMLSelectElement | null;
  const deInput = $("report-de") as HTMLInputElement | null;
  const ateInput = $("report-ate") as HTMLInputElement | null;
  const reportRun = $("report-run") as HTMLButtonElement | null;
  const reportCsv = $("report-csv") as HTMLButtonElement | null;
  const reportFeedback = $("report-feedback");
  const reportThead = $("report-thead");
  const reportTbody = $("report-tbody");
  const reportEmpty = $("report-empty");
  const reportSummary = $("report-summary");

  let optionsLoaded = false;
  let lastQuery: { key: ReportKey; params: URLSearchParams } | null = null;

  function reportKey(): ReportKey {
    return (reportSelect?.value || "frequencia") as ReportKey;
  }

  function setReportFeedback(
    message: string,
    type: "error" | "success" | "muted" = "muted",
  ): void {
    if (!reportFeedback) return;
    if (!message) {
      reportFeedback.classList.add("hidden");
      return;
    }
    reportFeedback.className =
      type === "error"
        ? "ml-auto text-xs font-bold text-red-600 dark:text-red-400"
        : type === "success"
          ? "ml-auto text-xs font-bold text-green-700 dark:text-green-400"
          : "ml-auto text-xs font-bold text-gray-500";
    reportFeedback.textContent = message;
  }

  function syncFilters(): void {
    const key = reportKey();
    $("report-group-wrap")?.classList.toggle("hidden", key !== "frequencia");
    $("report-ministry-wrap")?.classList.toggle(
      "hidden",
      key !== "escalas" && key !== "voluntarios",
    );
    $("report-de-wrap")?.classList.toggle(
      "hidden",
      key !== "frequencia" && key !== "escalas",
    );
    $("report-ate-wrap")?.classList.toggle(
      "hidden",
      key !== "frequencia" && key !== "escalas",
    );
  }

  async function ensureOptions(): Promise<void> {
    if (optionsLoaded) return;
    try {
      const response = await apiFetch(
        "/wp-json/1ipim/v1/admin/relatorios/opcoes",
      );
      if (!response.ok) return;
      const data = (await response.json()) as ReportOptions;
      optionsLoaded = true;

      if (groupSelect) {
        groupSelect.innerHTML =
          '<option value="">Todos</option>' +
          (data.grupos || [])
            .map(
              (group) =>
                `<option value="${group.id}">${escapeHtml(group.nome)}</option>`,
            )
            .join("");
      }
      if (ministrySelect) {
        ministrySelect.innerHTML =
          '<option value="">Todos</option>' +
          (data.ministerios || [])
            .map(
              (ministry) =>
                `<option value="${ministry.id}">${escapeHtml(ministry.nome)}</option>`,
            )
            .join("");
      }
    } catch {
      // Mantém os selects com "Todos".
    }
  }

  function buildParams(withFormat = false): URLSearchParams {
    const key = reportKey();
    const params = new URLSearchParams();
    if (key === "frequencia" && Number(groupSelect?.value) > 0) {
      params.set("grupo_id", groupSelect?.value || "");
    }
    if (
      (key === "escalas" || key === "voluntarios") &&
      Number(ministrySelect?.value) > 0
    ) {
      params.set("ministerio_id", ministrySelect?.value || "");
    }
    if (key === "frequencia" || key === "escalas") {
      if (deInput?.value) params.set("de", deInput.value);
      if (ateInput?.value) params.set("ate", ateInput.value);
    }
    if (withFormat) params.set("format", "csv");
    return params;
  }

  function tableHead(columns: string[]): void {
    if (!reportThead) return;
    reportThead.innerHTML = `<tr class="border-b border-gray-100 dark:border-slate-700">${columns
      .map(
        (column) =>
          `<th class="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">${escapeHtml(column)}</th>`,
      )
      .join("")}</tr>`;
  }

  function tableRows(rows: string[][]): void {
    if (!reportTbody) return;
    if (rows.length === 0) {
      reportTbody.innerHTML = "";
      reportEmpty?.classList.remove("hidden");
      return;
    }
    reportEmpty?.classList.add("hidden");
    reportTbody.innerHTML = rows
      .map(
        (cells) =>
          `<tr class="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/60 dark:hover:bg-slate-700/20">${cells
            .map(
              (cell) =>
                `<td class="px-6 py-3 text-xs text-gray-700 dark:text-gray-300">${escapeHtml(cell)}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
  }

  function summaryCards(items: Array<{ label: string; value: string }>): void {
    if (!reportSummary) return;
    if (items.length === 0) {
      reportSummary.classList.add("hidden");
      reportSummary.innerHTML = "";
      return;
    }
    reportSummary.innerHTML = items
      .map(
        (item) => `
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">${escapeHtml(item.label)}</p>
            <p class="text-2xl font-black text-gray-900 dark:text-white mt-1">${escapeHtml(item.value)}</p>
          </div>
        `,
      )
      .join("");
    reportSummary.classList.remove("hidden");
  }

  function renderReport(key: ReportKey, data: unknown): void {
    if (key === "frequencia") {
      const payload = data as {
        grupos: Array<{
          grupo: string;
          encontros: number;
          total_presentes: number;
          media: number;
          ultimo_encontro: string;
        }>;
        encontros: Array<{
          grupo: string;
          data: string;
          tema: string;
          preletor: string;
          publico_presente: number;
          presentes: string;
        }>;
      };
      const encontros = payload.encontros || [];
      const grupos = payload.grupos || [];
      const totalEncontros = grupos.reduce((sum, g) => sum + g.encontros, 0);
      const totalPessoas = grupos.reduce(
        (sum, g) => sum + g.total_presentes,
        0,
      );
      summaryCards([
        { label: "Grupos", value: String(grupos.length) },
        { label: "Encontros", value: String(totalEncontros) },
        { label: "Presenças somadas", value: String(totalPessoas) },
        {
          label: "Média por encontro",
          value: totalEncontros
            ? String(Math.round((totalPessoas / totalEncontros) * 10) / 10)
            : "—",
        },
      ]);
      tableHead([
        "Grupo",
        "Data",
        "Tema",
        "Preletor",
        "Público",
        "Presentes",
      ]);
      tableRows(
        encontros.map((row) => [
          row.grupo,
          row.data,
          row.tema || "—",
          row.preletor || "—",
          String(row.publico_presente),
          row.presentes || "—",
        ]),
      );
      return;
    }

    if (key === "escalas") {
      const payload = data as {
        items: Array<{
          data: string;
          horario: string;
          ministerio: string;
          titulo: string;
          equipe: string;
        }>;
      };
      const items = payload.items || [];
      summaryCards([{ label: "Escalas", value: String(items.length) }]);
      tableHead(["Data", "Horário", "Ministério", "Escala", "Equipe"]);
      tableRows(
        items.map((row) => [
          row.data || "—",
          row.horario || "—",
          row.ministerio || "—",
          row.titulo || "—",
          row.equipe || "—",
        ]),
      );
      return;
    }

    if (key === "voluntarios") {
      const payload = data as {
        items: Array<{
          nome: string;
          email: string;
          ministerio: string;
          papel: string;
          status: string;
        }>;
      };
      const items = payload.items || [];
      summaryCards([{ label: "Voluntários", value: String(items.length) }]);
      tableHead(["Nome", "E-mail", "Ministério", "Papel", "Status"]);
      tableRows(
        items.map((row) => [
          row.nome,
          row.email,
          row.ministerio,
          row.papel === "lider" ? "Líder" : "Colaborador",
          row.status,
        ]),
      );
      return;
    }

    const payload = data as {
      items: Array<{
        titulo: string;
        autor: string;
        categoria: string;
        estoque: number;
        estoque_minimo: number;
      }>;
    };
    const items = payload.items || [];
    summaryCards([{ label: "Títulos abaixo do mínimo", value: String(items.length) }]);
    tableHead(["Título", "Autor", "Categoria", "Estoque", "Mínimo"]);
    tableRows(
      items.map((row) => [
        row.titulo,
        row.autor || "—",
        row.categoria || "—",
        String(row.estoque),
        String(row.estoque_minimo),
      ]),
    );
  }

  async function runReport(): Promise<void> {
    await ensureOptions();
    const key = reportKey();
    const params = buildParams();
    lastQuery = { key, params: new URLSearchParams(params) };

    if (reportRun) {
      reportRun.disabled = true;
      reportRun.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Gerando...';
    }
    setReportFeedback("");

    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/admin/relatorios/${key}?${params.toString()}`,
      );
      if (response.status === 403) {
        throw new Error("Seu perfil não tem acesso a este relatório.");
      }
      if (!response.ok) throw new Error("Não foi possível gerar o relatório.");
      const data = await response.json();
      renderReport(key, data);
      if (reportCsv) reportCsv.disabled = false;
      setReportFeedback("Relatório atualizado.", "success");
    } catch (error) {
      tableHead([]);
      tableRows([]);
      summaryCards([]);
      if (reportCsv) reportCsv.disabled = true;
      setReportFeedback(
        getErrorMessage(error, "Não foi possível gerar o relatório."),
        "error",
      );
    } finally {
      if (reportRun) {
        reportRun.disabled = false;
        reportRun.innerHTML = '<i class="fa-solid fa-play mr-2"></i> Gerar';
      }
    }
  }

  async function downloadCsv(): Promise<void> {
    if (!lastQuery) return;
    const { key, params } = lastQuery;
    const csvParams = new URLSearchParams(params);
    csvParams.set("format", "csv");

    if (reportCsv) reportCsv.disabled = true;
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/admin/relatorios/${key}?${csvParams.toString()}`,
      );
      if (!response.ok) throw new Error("Não foi possível exportar o CSV.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = REPORT_FILES[key];
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setReportFeedback("CSV baixado.", "success");
    } catch (error) {
      setReportFeedback(
        getErrorMessage(error, "Não foi possível exportar o CSV."),
        "error",
      );
    } finally {
      if (reportCsv) reportCsv.disabled = false;
    }
  }

  reportSelect?.addEventListener("change", () => {
    syncFilters();
    if (reportCsv) reportCsv.disabled = true;
    lastQuery = null;
    summaryCards([]);
    tableHead([]);
    tableRows([]);
    reportEmpty?.classList.add("hidden");
    setReportFeedback("");
  });
  reportRun?.addEventListener("click", () => void runReport());
  reportCsv?.addEventListener("click", () => void downloadCsv());

  syncFilters();
  activate("log");
  await load();
});
