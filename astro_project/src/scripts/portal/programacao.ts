import { apiFetch, getErrorMessage } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml, onPageReady, showToast } from "./ui";
import type { Permissions } from "./types";

interface ProgramacaoItem {
  id: number;
  tipo: "semanal" | "evento";
  titulo: string;
  subtitulo: string;
  descricao: string;
  horario: string;
  dia_semana: number | null;
  data: string | null;
  local: string;
  link: string;
  tag: string;
  tag_cor: string;
  tipo_evento: string;
  status: "publicado" | "rascunho";
  ordem: number;
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  camp: { label: "Acampamento", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  worship: { label: "Culto", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  education: { label: "Educação", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  special: { label: "Especial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  ministry: { label: "Ministério", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  youth: { label: "Juventude", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  conference: { label: "Conferência", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  celebration: { label: "Celebração", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
};

let permissions: Permissions;
let items: ProgramacaoItem[] = [];

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function feedback(type: "success" | "error", message: string): void {
  const el = $("programacao-feedback");
  if (!el) return;
  el.className =
    type === "success"
      ? "mb-6 p-4 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
      : "mb-6 p-4 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  el.textContent = message;
  el.classList.remove("hidden");
  if (type === "success") {
    window.setTimeout(() => el.classList.add("hidden"), 4000);
  }
}

function formFeedback(message: string): void {
  const el = $("programacao-form-feedback");
  if (!el) return;
  el.className =
    "md:col-span-2 p-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  el.textContent = message;
  el.classList.remove("hidden");
}

function setValue(id: string, value: string | number | null): void {
  const el = $(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (el) el.value = value === null || value === undefined ? "" : String(value);
}

function getValue(id: string): string {
  const el = $(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return el ? el.value.trim() : "";
}

function formatDate(value: string | null): string {
  if (!value) return "Data a definir";
  const [y, m, d] = value.split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

function statusBadge(status: string): string {
  return status === "publicado"
    ? `<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Publicado</span>`
    : `<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300">Rascunho</span>`;
}

function weeklyCard(item: ProgramacaoItem): string {
  const tag = item.tag
    ? `<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" style="background-color:${escapeHtml(item.tag_cor || "#7ccece")};">${escapeHtml(item.tag)}</span>`
    : "";
  const day = item.dia_semana === null ? "Dia a definir" : DIAS[item.dia_semana] || "Dia a definir";

  return `
    <article class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-lg font-black text-gray-900 dark:text-white">${escapeHtml(item.titulo)}</h3>
          ${tag}
        </div>
        ${statusBadge(item.status)}
      </div>
      <p class="text-sm font-bold text-[var(--color-brand)]">${escapeHtml(day)}${item.horario ? ` · ${escapeHtml(item.horario)}` : ""}</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(item.local || "Local a definir")}</p>
      ${item.descricao ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-3">${escapeHtml(item.descricao)}</p>` : ""}
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2">
        <button data-edit="${item.id}" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Editar</button>
        <button data-delete="${item.id}" class="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">Excluir</button>
      </div>
    </article>
  `;
}

function eventCard(item: ProgramacaoItem): string {
  const type = EVENT_TYPES[item.tipo_evento] || EVENT_TYPES.special;
  return `
    <article class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3 mb-2">
        <div>
          <p class="text-xs font-black uppercase tracking-widest text-amber-600">${escapeHtml(formatDate(item.data))}</p>
          <h3 class="text-lg font-black text-gray-900 dark:text-white mt-1">${escapeHtml(item.titulo)}</h3>
        </div>
        ${statusBadge(item.status)}
      </div>
      ${item.subtitulo ? `<p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(item.subtitulo)}</p>` : ""}
      <div class="flex flex-wrap items-center gap-2 mt-3">
        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${type.color}">${escapeHtml(type.label)}</span>
        ${item.horario ? `<span class="text-xs text-gray-500">${escapeHtml(item.horario)}</span>` : ""}
        ${item.local ? `<span class="text-xs text-gray-500">· ${escapeHtml(item.local)}</span>` : ""}
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2">
        <button data-edit="${item.id}" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Editar</button>
        <button data-delete="${item.id}" class="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">Excluir</button>
      </div>
    </article>
  `;
}

function render(): void {
  const weekly = items
    .filter((item) => item.tipo === "semanal")
    .sort((a, b) => (a.dia_semana ?? 99) - (b.dia_semana ?? 99) || a.ordem - b.ordem);
  const events = items
    .filter((item) => item.tipo === "evento")
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

  const weeklyList = $("semanal-lista");
  const eventList = $("evento-lista");
  if (weeklyList) {
    weeklyList.innerHTML = weekly.length
      ? weekly.map(weeklyCard).join("")
      : `<p class="text-sm text-gray-500 md:col-span-2">Nenhum culto semanal cadastrado.</p>`;
  }
  if (eventList) {
    eventList.innerHTML = events.length
      ? events.map(eventCard).join("")
      : `<p class="text-sm text-gray-500 md:col-span-2 xl:col-span-3">Nenhum evento cadastrado.</p>`;
  }
}

async function load(): Promise<void> {
  const response = await apiFetch("/wp-json/1ipim/v1/admin/programacao");
  if (!response.ok) {
    throw new Error("Não foi possível carregar a programação.");
  }
  items = (await response.json()) as ProgramacaoItem[];
  render();
}

function toggleTypeFields(tipo: "semanal" | "evento"): void {
  const semanal = tipo === "semanal";
  $("field-dia")?.classList.toggle("hidden", !semanal);
  $("field-tag")?.classList.toggle("hidden", !semanal);
  $("field-tag-cor")?.classList.toggle("hidden", !semanal);
  $("field-data")?.classList.toggle("hidden", semanal);
  $("field-tipo-evento")?.classList.toggle("hidden", semanal);
}

function openModal(tipo: "semanal" | "evento", item?: ProgramacaoItem): void {
  const modal = $("programacao-modal");
  if (!modal) return;

  $("programacao-form-feedback")?.classList.add("hidden");
  setValue("programacao-id", item?.id ?? "");
  setValue("programacao-tipo", tipo);
  setValue("programacao-titulo", item?.titulo ?? "");
  setValue("programacao-subtitulo", item?.subtitulo ?? "");
  setValue("programacao-horario", item?.horario ?? (tipo === "semanal" ? "19:00" : ""));
  setValue("programacao-dia", item?.dia_semana ?? 0);
  setValue("programacao-data", item?.data ?? new Date().toISOString().slice(0, 10));
  setValue("programacao-local", item?.local ?? "");
  setValue("programacao-link", item?.link ?? "");
  setValue("programacao-tag", item?.tag ?? "");
  setValue("programacao-tag-cor", item?.tag_cor || "#7ccece");
  setValue("programacao-tipo-evento", item?.tipo_evento || "special");
  setValue("programacao-status", item?.status || "publicado");
  setValue("programacao-ordem", item?.ordem ?? 0);
  setValue("programacao-descricao", item?.descricao ?? "");

  const title = $("programacao-modal-title");
  if (title) {
    const label = tipo === "semanal" ? "culto semanal" : "evento";
    title.textContent = item ? `Editar ${label}` : `Novo ${label}`;
  }

  toggleTypeFields(tipo);
  modal.classList.remove("hidden");
}

function closeModal(): void {
  $("programacao-modal")?.classList.add("hidden");
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  const submit = $("programacao-submit") as HTMLButtonElement | null;
  const tipo = (getValue("programacao-tipo") || "semanal") as "semanal" | "evento";
  const id = Number(getValue("programacao-id") || 0);

  const payload = {
    tipo,
    titulo: getValue("programacao-titulo"),
    subtitulo: getValue("programacao-subtitulo"),
    horario: getValue("programacao-horario"),
    dia_semana: tipo === "semanal" ? getValue("programacao-dia") : null,
    data: tipo === "evento" ? getValue("programacao-data") : null,
    local: getValue("programacao-local"),
    link: getValue("programacao-link"),
    tag: getValue("programacao-tag"),
    tag_cor: getValue("programacao-tag-cor"),
    tipo_evento: getValue("programacao-tipo-evento"),
    status: getValue("programacao-status"),
    ordem: Number(getValue("programacao-ordem") || 0),
    descricao: getValue("programacao-descricao"),
  };

  if (!payload.titulo) {
    formFeedback("Informe o título.");
    return;
  }
  if (tipo === "evento" && !payload.data) {
    formFeedback("Informe a data do evento.");
    return;
  }

  if (submit) {
    submit.disabled = true;
    submit.textContent = "Salvando...";
  }

  try {
    const response = await apiFetch(
      id
        ? `/wp-json/1ipim/v1/admin/programacao/${id}`
        : "/wp-json/1ipim/v1/admin/programacao",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: id || undefined }),
      },
    );
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(data.message || data.error || "Não foi possível salvar.");
    }
    closeModal();
    showToast("Programação salva.", "success");
    await load();
  } catch (error) {
    formFeedback(getErrorMessage(error, "Não foi possível salvar."));
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Salvar";
    }
  }
}

async function remove(id: number): Promise<void> {
  if (!window.confirm("Excluir este item da programação?")) return;
  try {
    const response = await apiFetch(`/wp-json/1ipim/v1/admin/programacao/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Não foi possível excluir.");
    showToast("Item excluído.", "success");
    await load();
  } catch (error) {
    feedback("error", getErrorMessage(error, "Não foi possível excluir."));
  }
}

function bind(): void {
  $("novo-semanal")?.addEventListener("click", () => openModal("semanal"));
  $("novo-evento")?.addEventListener("click", () => openModal("evento"));
  $("fechar-programacao-modal")?.addEventListener("click", closeModal);
  $("cancelar-programacao")?.addEventListener("click", closeModal);
  $("programacao-form")?.addEventListener("submit", (event) => void save(event));

  for (const listId of ["semanal-lista", "evento-lista"]) {
    $(listId)?.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const edit = target.closest<HTMLElement>("[data-edit]");
      const del = target.closest<HTMLElement>("[data-delete]");

      if (edit) {
        const item = items.find((row) => row.id === Number(edit.dataset.edit));
        if (item) openModal(item.tipo, item);
      } else if (del) {
        void remove(Number(del.dataset.delete));
      }
    });
  }
}

onPageReady("#semanal-lista", () => {
  void (async () => {
    const user = (await auth.ensureSession()) ?? auth.getUser();
    permissions = getPermissions(user);

    if (!permissions.canProgramacao) {
      $("novo-semanal")?.classList.add("hidden");
      $("novo-evento")?.classList.add("hidden");
      feedback("error", "Seu perfil não tem acesso à programação.");
      return;
    }

    bind();

    try {
      await load();
      const year = new Date().getFullYear();
      const info = $("eventos-ano-info");
      if (info) {
        info.textContent = `Data única; o site mostra apenas os eventos de ${year}.`;
      }
    } catch (error) {
      feedback("error", getErrorMessage(error, "Não foi possível carregar a programação."));
    }
  })();
});
