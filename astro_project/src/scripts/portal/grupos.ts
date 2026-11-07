import { apiFetch, getErrorMessage } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeHtml, onPageReady, showToast } from "./ui";
import type { Permissions } from "./types";

interface Grupo {
  id: number;
  slug: string;
  nome: string;
  descricao: string;
  publico_alvo: string;
  frequencia: string;
  dia_semana: number | null;
  horario: string;
  local: string;
  contato: string;
  responsavel: string;
  imagem: string;
  status: string;
  lideres?: Array<{ user_id: number; papel: string; nome: string }>;
}

interface Encontro {
  id: number;
  grupo_id: number;
  data: string;
  texto_lido: string;
  tema: string;
  preletor: string;
  foto_url: string;
  observacoes: string;
  publico_presente: number;
  publicar_feed: boolean;
  foto_attachment_id?: number | null;
  presenca: Array<{ nome: string; user_id: number | null }>;
}

interface LiderCandidate {
  user_id: number;
  nome: string;
  email: string;
}

const DIAS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

let permissions: Permissions;
let groups: Grupo[] = [];
let current: Grupo | null = null;
let candidates: LiderCandidate[] = [];
let editingLeaders: number[] = [];

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function feedback(el: HTMLElement | null, type: "success" | "error", message: string): void {
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

function dayLabel(dia: number | null): string {
  return dia && DIAS[dia] ? DIAS[dia] : "Dia a definir";
}

function card(g: Grupo): string {
  const img = g.imagem
    ? `<img src="${escapeHtml(g.imagem)}" alt="${escapeHtml(g.nome)}" class="w-full h-full object-cover" loading="lazy">`
    : `<div class="w-full h-full flex items-center justify-center text-[var(--color-brand)] bg-[var(--color-brand)]/10"><i class="fa-solid fa-people-group text-4xl"></i></div>`;
  const badge =
    g.status === "ativo"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300";
  const canArchive = permissions.isAdmin || permissions.isMinistryLeader;

  return `
    <article class="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
      <div class="h-40 overflow-hidden">${img}</div>
      <div class="p-6 flex flex-col flex-1">
        <div class="flex items-start justify-between gap-3 mb-2">
          <h3 class="text-xl font-black text-gray-900 dark:text-white leading-tight">${escapeHtml(g.nome)}</h3>
          <span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${badge}">${escapeHtml(g.status)}</span>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(g.publico_alvo || "Público não informado")}</p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
          <i class="fa-solid fa-calendar-day text-[var(--color-brand)] mr-1"></i>
          ${escapeHtml(dayLabel(g.dia_semana))}${g.horario ? ` às ${escapeHtml(g.horario)}` : ""}
          · ${escapeHtml(g.frequencia || "—")}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
          <i class="fa-solid fa-user text-[var(--color-brand)] mr-1"></i>
          ${escapeHtml(g.responsavel || "Líder não informado")}
        </p>
        <div class="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 flex flex-wrap gap-2">
          <button data-encounters="${g.id}" class="bg-[var(--color-brand)]/10 text-[var(--color-brand)] px-3 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-brand)]/20 transition-colors">Encontros</button>
          <button data-edit="${g.id}" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Editar</button>
          ${canArchive ? `<button data-archive="${g.id}" class="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">Arquivar</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function render(): void {
  const grid = $("grupos-grid");
  if (!grid) return;

  const active = groups.filter((g) => g.status !== "arquivado");
  if (active.length === 0) {
    grid.innerHTML = `<div class="md:col-span-2 xl:col-span-3 bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-[2rem] p-10 text-center text-gray-500">Nenhum grupo cadastrado ainda.</div>`;
    return;
  }

  grid.innerHTML = active.map(card).join("");
}

async function loadGroups(): Promise<void> {
  const response = await apiFetch("/wp-json/1ipim/v1/admin/grupos");
  if (!response.ok) {
    throw new Error("Não foi possível carregar os grupos.");
  }
  groups = (await response.json()) as Grupo[];
  render();
}

function setValue(id: string, value: string | number | null): void {
  const el = $(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (el) el.value = value === null || value === undefined ? "" : String(value);
}

function getValue(id: string): string {
  const el = $(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return el ? el.value.trim() : "";
}

async function loadCandidates(): Promise<void> {
  if (!permissions.canGruposAll || candidates.length > 0) return;
  try {
    const response = await apiFetch("/wp-json/1ipim/v1/admin/grupos/candidatos");
    if (response.ok) {
      candidates = (await response.json()) as LiderCandidate[];
    }
  } catch {
    candidates = [];
  }
}

function renderLeaderOptions(selected: number[]): void {
  const wrap = $("grupo-lideres-wrap");
  const list = $("grupo-lideres");
  if (!wrap || !list) return;

  if (!permissions.canGruposAll) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  if (candidates.length === 0) {
    list.innerHTML = `<p class="text-xs text-gray-500 sm:col-span-2">Nenhum membro do ministério de PGs cadastrado. Vincule usuários em Ministérios.</p>`;
    return;
  }

  list.innerHTML = candidates
    .map(
      (candidate) => `
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
          <input type="checkbox" value="${candidate.user_id}" ${selected.includes(candidate.user_id) ? "checked" : ""} class="w-4 h-4 accent-[var(--color-brand)]">
          <span class="truncate" title="${escapeHtml(candidate.email)}">${escapeHtml(candidate.nome)}</span>
        </label>
      `,
    )
    .join("");
}

async function openGroupModal(grupo?: Grupo): Promise<void> {
  const modal = $("grupo-modal");
  const title = $("grupo-modal-title");
  const feedbackBox = $("grupo-form-feedback");
  if (!modal) return;

  feedbackBox?.classList.add("hidden");
  if (title) title.textContent = grupo ? "Editar grupo" : "Novo grupo";

  setValue("grupo-id", grupo?.id ?? "");
  setValue("grupo-nome", grupo?.nome ?? "");
  setValue("grupo-publico", grupo?.publico_alvo ?? "");
  setValue("grupo-responsavel", grupo?.responsavel ?? "");
  setValue("grupo-dia", grupo?.dia_semana ?? "");
  setValue("grupo-horario", grupo?.horario ?? "");
  setValue("grupo-frequencia", grupo?.frequencia || "Semanal");
  setValue("grupo-local", grupo?.local ?? "");
  setValue("grupo-contato", grupo?.contato ?? "");
  setValue("grupo-imagem", grupo?.imagem ?? "");
  setValue("grupo-status", grupo?.status || "ativo");
  setValue("grupo-descricao", grupo?.descricao ?? "");

  editingLeaders = (grupo?.lideres ?? []).map((leader) => leader.user_id);
  await loadCandidates();
  renderLeaderOptions(editingLeaders);

  modal.classList.remove("hidden");
}

function closeModal(id: string): void {
  $(id)?.classList.add("hidden");
}

async function saveGroup(event: Event): Promise<void> {
  event.preventDefault();
  const feedbackBox = $("grupo-form-feedback");
  const id = Number(getValue("grupo-id") || 0);
  const leaderIds = Array.from(
    document.querySelectorAll<HTMLInputElement>("#grupo-lideres input[type=checkbox]:checked"),
  ).map((input) => Number(input.value));
  const payload: Record<string, unknown> = {
    id: id || undefined,
    nome: getValue("grupo-nome"),
    publico_alvo: getValue("grupo-publico"),
    responsavel: getValue("grupo-responsavel"),
    dia_semana: getValue("grupo-dia") || null,
    horario: getValue("grupo-horario"),
    frequencia: getValue("grupo-frequencia"),
    local: getValue("grupo-local"),
    contato: getValue("grupo-contato"),
    imagem: getValue("grupo-imagem"),
    status: getValue("grupo-status"),
    descricao: getValue("grupo-descricao"),
  };

  if (permissions.canGruposAll) {
    payload.lideres = leaderIds;
  }

  try {
    const path = id
      ? `/wp-json/1ipim/v1/admin/grupos/${id}`
      : "/wp-json/1ipim/v1/admin/grupos";
    const response = await apiFetch(path, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Não foi possível salvar o grupo.");
    }
    closeModal("grupo-modal");
    showToast("Grupo salvo.", "success");
    await loadGroups();
  } catch (error) {
    feedback(feedbackBox, "error", getErrorMessage(error, "Não foi possível salvar o grupo."));
  }
}

async function archiveGroup(id: number): Promise<void> {
  if (!window.confirm("Arquivar este grupo? Ele deixa de aparecer no site.")) return;
  try {
    const response = await apiFetch(`/wp-json/1ipim/v1/admin/grupos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Não foi possível arquivar.");
    showToast("Grupo arquivado.", "success");
    await loadGroups();
    if (current?.id === id) {
      current = null;
      $("grupo-panel")?.classList.add("hidden");
    }
  } catch (error) {
    feedback($("grupos-feedback"), "error", getErrorMessage(error, "Não foi possível arquivar."));
  }
}

function formatDate(value: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

function encounterCard(e: Encontro): string {
  const people = e.presenca.length
    ? e.presenca.map((p) => escapeHtml(p.nome)).join(", ")
    : "Sem lista nominal";
  return `
    <div class="bg-gray-50 dark:bg-slate-900/40 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
      ${e.foto_url ? `<img src="${escapeHtml(e.foto_url)}" alt="Foto do encontro de ${escapeHtml(formatDate(e.data))}" class="w-full h-44 object-cover rounded-xl mb-3" loading="lazy">` : ""}
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p class="font-black text-gray-900 dark:text-white">${escapeHtml(formatDate(e.data))}</p>
        <span class="text-xs font-bold text-[var(--color-brand)] bg-[var(--color-brand)]/10 px-2 py-1 rounded-full">${e.publico_presente} presentes</span>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(e.texto_lido || "—")} · ${escapeHtml(e.tema || "Sem tema")} · ${escapeHtml(e.preletor || "Preletor não informado")}</p>
      <p class="text-xs text-gray-500 mt-2"><strong>Presentes:</strong> ${people}</p>
      ${e.observacoes ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(e.observacoes)}</p>` : ""}
      ${e.publicar_feed ? `<p class="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-2"><i class="fa-solid fa-bullhorn mr-1"></i> Publicado no feed do Berea</p>` : ""}
    </div>
  `;
}

async function openEncounters(grupo: Grupo): Promise<void> {
  current = grupo;
  const panel = $("grupo-panel");
  const name = $("grupo-panel-nome");
  const info = $("grupo-panel-info");
  const list = $("encontros-lista");
  if (!panel) return;

  if (name) name.textContent = grupo.nome;
  if (info) {
    info.textContent = `${dayLabel(grupo.dia_semana)}${grupo.horario ? ` às ${grupo.horario}` : ""} · ${grupo.responsavel || "Sem líder"}`;
  }
  if (list) list.innerHTML = `<p class="text-sm text-gray-500">Carregando encontros...</p>`;
  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const response = await apiFetch(`/wp-json/1ipim/v1/admin/grupos/${grupo.id}/encontros`);
    if (!response.ok) throw new Error("Não foi possível carregar os encontros.");
    const encontros = (await response.json()) as Encontro[];
    if (list) {
      list.innerHTML = encontros.length
        ? encontros.map(encounterCard).join("")
        : `<p class="text-sm text-gray-500">Nenhum encontro registrado ainda.</p>`;
    }
  } catch (error) {
    if (list) list.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(getErrorMessage(error, "Erro ao carregar."))}</p>`;
  }
}

function openEncounterModal(): void {
  if (!current) return;
  const feedbackBox = $("encontro-form-feedback");
  feedbackBox?.classList.add("hidden");
  setValue("encontro-grupo-id", current.id);
  setValue("encontro-data", new Date().toISOString().slice(0, 10));
  setValue("encontro-publico", "");
  setValue("encontro-texto", "");
  setValue("encontro-tema", "");
  setValue("encontro-preletor", "");
  setValue("encontro-foto", "");
  setValue("encontro-observacoes", "");
  setValue("encontro-presenca", "");
  const photoInput = $("encontro-foto-file") as HTMLInputElement | null;
  if (photoInput) photoInput.value = "";
  $("encontro-foto-preview")?.classList.add("hidden");
  const feed = $("encontro-feed") as HTMLInputElement | null;
  if (feed) feed.checked = false;
  $("encontro-modal")?.classList.remove("hidden");
}

function previewPhoto(): void {
  const input = $("encontro-foto-file") as HTMLInputElement | null;
  const preview = $("encontro-foto-preview");
  if (!input || !preview) return;

  const file = input.files?.[0];
  if (!file) {
    preview.classList.add("hidden");
    preview.innerHTML = "";
    return;
  }

  const url = URL.createObjectURL(file);
  preview.innerHTML = `<img src="${url}" alt="Prévia da foto do encontro" class="w-full max-h-64 object-cover">`;
  preview.classList.remove("hidden");
}

async function uploadPhoto(grupoId: number, file: File): Promise<{ url: string; attachment_id: number }> {
  const formData = new FormData();
  formData.append("foto", file);
  const response = await apiFetch(`/wp-json/1ipim/v1/admin/grupos/${grupoId}/foto`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Não foi possível enviar a foto.");
  }
  return (await response.json()) as { url: string; attachment_id: number };
}

async function saveEncounter(event: Event): Promise<void> {
  event.preventDefault();
  const feedbackBox = $("encontro-form-feedback");
  const submit = $("encontro-submit") as HTMLButtonElement | null;
  const grupoId = Number(getValue("encontro-grupo-id"));
  if (!grupoId) return;

  const names = getValue("encontro-presenca")
    .split(/\n|,/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((nome) => ({ nome }));

  try {
    let fotoUrl = getValue("encontro-foto");
    let fotoAttachmentId = 0;

    const photoInput = $("encontro-foto-file") as HTMLInputElement | null;
    const file = photoInput?.files?.[0];
    if (file) {
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Enviando foto...";
      }
      const uploaded = await uploadPhoto(grupoId, file);
      fotoUrl = uploaded.url;
      fotoAttachmentId = uploaded.attachment_id;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Salvando...";
    }

    const payload = {
      data: getValue("encontro-data"),
      texto_lido: getValue("encontro-texto"),
      tema: getValue("encontro-tema"),
      preletor: getValue("encontro-preletor"),
      foto_url: fotoUrl,
      foto_attachment_id: fotoAttachmentId || null,
      observacoes: getValue("encontro-observacoes"),
      publico_presente: Number(getValue("encontro-publico") || 0),
      publicar_feed: ($("encontro-feed") as HTMLInputElement | null)?.checked ? 1 : 0,
      presenca: names,
    };

    const response = await apiFetch(`/wp-json/1ipim/v1/admin/grupos/${grupoId}/encontros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Não foi possível salvar o encontro.");
    }
    closeModal("encontro-modal");
    showToast("Encontro registrado.", "success");
    if (current) await openEncounters(current);
  } catch (error) {
    feedback(feedbackBox, "error", getErrorMessage(error, "Não foi possível salvar o encontro."));
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Salvar encontro";
    }
  }
}

function bind(): void {
  $("novo-grupo")?.addEventListener("click", () => void openGroupModal());
  $("fechar-grupo-modal")?.addEventListener("click", () => closeModal("grupo-modal"));
  $("cancelar-grupo")?.addEventListener("click", () => closeModal("grupo-modal"));
  $("fechar-encontro-modal")?.addEventListener("click", () => closeModal("encontro-modal"));
  $("cancelar-encontro")?.addEventListener("click", () => closeModal("encontro-modal"));
  $("novo-encontro")?.addEventListener("click", openEncounterModal);
  $("encontro-foto-file")?.addEventListener("change", previewPhoto);
  $("fechar-painel")?.addEventListener("click", () => $("grupo-panel")?.classList.add("hidden"));
  $("grupo-form")?.addEventListener("submit", (event) => void saveGroup(event));
  $("encontro-form")?.addEventListener("submit", (event) => void saveEncounter(event));

  $("grupos-grid")?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const edit = target.closest<HTMLElement>("[data-edit]");
    const enc = target.closest<HTMLElement>("[data-encounters]");
    const archive = target.closest<HTMLElement>("[data-archive]");

    if (edit) {
      const grupo = groups.find((g) => g.id === Number(edit.dataset.edit));
      if (grupo) void openGroupModal(grupo);
    } else if (enc) {
      const grupo = groups.find((g) => g.id === Number(enc.dataset.encounters));
      if (grupo) void openEncounters(grupo);
    } else if (archive) {
      void archiveGroup(Number(archive.dataset.archive));
    }
  });
}

onPageReady("#grupos-grid", () => {
  void (async () => {
    const user = (await auth.ensureSession()) ?? auth.getUser();
    permissions = getPermissions(user);

    const button = $("novo-grupo");
    if (!permissions.canGrupos) {
      if (button) button.classList.add("hidden");
      feedback($("grupos-feedback"), "error", "Seu perfil não tem acesso aos Pequenos Grupos.");
      return;
    }

    bind();

    try {
      await loadGroups();
    } catch (error) {
      feedback($("grupos-feedback"), "error", getErrorMessage(error, "Não foi possível carregar os grupos."));
    }
  })();
});
