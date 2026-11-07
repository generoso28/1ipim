import { auth } from "./auth";
import { apiFetch } from "./api";
import { getPermissions } from "./permissions";
import { escapeAttribute, escapeHtml, showToast, onPageReady } from "./ui";
import type { WpMinistry, WpSchedule, WpUser } from "./types";

interface ScheduleFilters {
  active: string;
}

const FILTER_ACTIVE_CLASSES = [
  "active",
  "bg-[var(--color-brand)]",
  "text-white",
  "shadow-lg",
  "shadow-[var(--color-brand)]/20",
];
const FILTER_INACTIVE_CLASSES = [
  "text-gray-500",
  "hover:bg-gray-50",
  "dark:hover:bg-slate-700",
];
const VIEW_ACTIVE_CLASSES = [
  "active",
  "bg-white",
  "dark:bg-slate-700",
  "text-gray-900",
  "dark:text-white",
  "shadow-sm",
];
const VIEW_INACTIVE_CLASSES = [
  "text-gray-500",
  "hover:text-gray-900",
  "dark:hover:text-white",
];

function stripTags(html: string | undefined): string {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\\n/g, "")
    .trim();
}

function splitContent(schedule: WpSchedule): string[] {
  return stripTags(schedule.content?.rendered).split("|");
}

interface ScheduleConflict {
  ministry?: string;
  date?: string;
  start?: string;
  end?: string;
}

interface RestErrorPayload {
  code?: string;
  message?: string;
  data?: {
    status?: number;
    conflicts?: ScheduleConflict[];
    can_override?: boolean;
  };
}

async function parseError(response: Response): Promise<RestErrorPayload> {
  return (await response.json().catch(() => ({}))) as RestErrorPayload;
}

function conflictMessage(payload: RestErrorPayload): string {
  const conflicts = payload.data?.conflicts || [];
  if (conflicts.length === 0) {
    return payload.message || "Conflito de escala.";
  }

  const lines = conflicts.map(
    (conflict) =>
      `• ${conflict.ministry || "Ministério"} — ${conflict.date || ""} às ${conflict.start || ""}`,
  );

  return `${payload.message || "Conflito de escala."}\n\n${lines.join("\n")}`;
}

/**
 * Pede autorização explícita ao líder quando a API retorna 409.
 * Retorna null quando o usuário cancela.
 */
function askOverride(
  payload: RestErrorPayload,
  canOverride: boolean,
): { reason: string } | null {
  if (!canOverride) {
    showToast(conflictMessage(payload), "error");
    return null;
  }

  if (!confirm(`${conflictMessage(payload)}\n\nAutorizar mesmo assim?`)) {
    return null;
  }

  const reason = prompt(
    "Justificativa para autorizar o conflito (obrigatória):",
  );
  if (!reason || !reason.trim()) {
    showToast("A autorização exige justificativa.", "error");
    return null;
  }

  return { reason: reason.trim() };
}

onPageReady("#form-container", async () => {
  const formContainer = document.getElementById("form-container");
  const listContainer = document.getElementById("list-container");
  const listView = document.getElementById("list-view");
  const loading = document.getElementById("loading-scales");
  const ministrySelect = document.getElementById(
    "scale-ministry",
  ) as HTMLSelectElement | null;
  const volunteersSelect = document.getElementById("volunteers-select");
  const filterTabs = document.querySelectorAll<HTMLElement>(".filter-tab");
  const addScaleForm = document.getElementById(
    "add-scale-form",
  ) as HTMLFormElement | null;
  const modal = document.getElementById("scale-modal");
  const modalContent = document.getElementById("modal-content");
  const modalTitle = document.getElementById("modal-title");
  const closeModalButton = document.getElementById("close-modal");
  const calendarView = document.getElementById("calendar-view");
  const viewToggles = document.querySelectorAll<HTMLElement>(".view-toggle");
  const pageTitle = document.getElementById("page-title");
  const user = (await auth.ensureSession()) ?? auth.getUser();
  const permissions = getPermissions(user);
  const isManager = permissions.isAdmin || permissions.isPrivileged;

  const ministryNames: Record<number, string> = {};
  let schedules: WpSchedule[] = [];
  let usersList: WpUser[] = [];
  let calendarCursor = new Date();

  const filterState: ScheduleFilters = { active: "all" };
  const initialActiveTab =
    document.querySelector<HTMLElement>(".filter-tab.active");
  filterState.active = initialActiveTab?.getAttribute("data-filter") || "all";

  if (!isManager) {
    if (formContainer) formContainer.style.display = "none";
    if (listContainer) listContainer.className = "lg:col-span-12 space-y-4";
    if (pageTitle) pageTitle.innerText = "Minhas Participações";
  }

  async function loadMinistries(): Promise<void> {
    try {
      const path = isManager
        ? "/wp-json/1ipim/v1/ministries?manage=1"
        : "/wp-json/wp/v2/ministerio/?per_page=100";
      const response = await apiFetch(path);
      const ministries = (await response.json()) as WpMinistry[];

      ministries.forEach((ministry) => {
        ministryNames[ministry.id] = ministry.title.rendered;
      });

      if (ministrySelect) {
        ministrySelect.innerHTML =
          '<option value="">Selecione...</option>' +
          ministries
            .map(
              (ministry) =>
                `<option value="${ministry.id}">${escapeHtml(ministry.title.rendered)}</option>`,
            )
            .join("");
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadVolunteers(): Promise<void> {
    try {
      const response = await apiFetch("/wp-json/1ipim/v1/users");
      const users = (await response.json()) as WpUser[];
      usersList = users;

      if (volunteersSelect) {
        volunteersSelect.innerHTML = users
          .map(
            (volunteer) => `
              <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-700 shadow-sm shadow-transparent hover:shadow-black/5">
                <div class="relative flex items-center">
                  <input type="checkbox" name="volunteers" value="${escapeAttribute(volunteer.email)}" data-name="${escapeAttribute(volunteer.name)}" class="peer w-5 h-5 rounded-md border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] transition-all">
                </div>
                <span class="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">${escapeHtml(volunteer.name)}</span>
              </label>
            `,
          )
          .join("");
      }
    } catch {
      if (volunteersSelect) {
        volunteersSelect.innerHTML =
          '<p class="text-xs text-red-500">Erro ao carregar</p>';
      }
    }
  }

  async function loadSchedules(): Promise<void> {
    try {
      loading?.classList.remove("hidden");
      const response = await apiFetch(
        "/wp-json/wp/v2/escala/?per_page=100",
        {},
      );
      const data = await response.json();
      loading?.classList.add("hidden");

      schedules = Array.isArray(data)
        ? data.sort((a: WpSchedule, b: WpSchedule) => {
            const dateOf = (schedule: WpSchedule) =>
              new Date(
                schedule.meta?.data_da_escala || schedule.date || 0,
              ).getTime();
            return dateOf(a) - dateOf(b);
          })
        : [];

      renderSchedules(schedules);
    } catch {
      showToast("Erro ao carregar escalas", "error");
    }
  }

  function scheduleMetadata(schedule: WpSchedule) {
    const parts = splitContent(schedule);
    return {
      parts,
      date: schedule.meta?.data_da_escala || parts[0] || "---",
      names: schedule.meta?.equipe_nomes || parts[3] || "---",
      emails: schedule.meta?.equipe_emails || parts[1] || "",
      time: schedule.meta?.horario || parts[2] || "",
      ministryId: schedule.meta?.ministerio_id || parts[4] || "",
    };
  }

  function filterSchedules(list: WpSchedule[]): WpSchedule[] {
    if (filterState.active !== "mine") return list;

    return list.filter((schedule) => {
      const meta = scheduleMetadata(schedule);
      const emails = meta.emails.toLowerCase();
      const userEmail = (user.email || "").toLowerCase();
      const ministryId = String(meta.ministryId);
      return (
        emails.includes(userEmail) ||
        user.ministries.includes(Number(ministryId))
      );
    });
  }

  function renderCalendar(list: WpSchedule[]): void {
    if (!calendarView) return;

    const byDate: Record<string, Array<WpSchedule & { minId: string }>> = {};
    list.forEach((schedule) => {
      const meta = scheduleMetadata(schedule);
      const date = meta.date;
      if (!date) return;
      byDate[date] = byDate[date] || [];
      byDate[date].push({ ...schedule, minId: meta.ministryId });
    });

    const cursor = calendarCursor;
    const month = cursor.getMonth();
    const year = cursor.getFullYear();
    const today = new Date();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
      <div class="flex items-center justify-between mb-4">
        <button id="calendar-prev" type="button" aria-label="Mês anterior" class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-500 hover:text-[var(--color-brand)]">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <h4 class="font-black text-gray-900 dark:text-white text-lg uppercase">${cursor.toLocaleString("pt-BR", { month: "long" })} ${year}</h4>
        <button id="calendar-next" type="button" aria-label="Próximo mês" class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-500 hover:text-[var(--color-brand)]">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
        ${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
          .map(
            (day) =>
              `<div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${day}</div>`,
          )
          .join("")}
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-2">
    `;

    for (let index = 0; index < firstWeekday; index++) {
      html +=
        '<div class="p-2 sm:p-4 rounded-xl border border-dashed border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/20 opacity-50"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const daySchedules = byDate[date] || [];
      const isToday = date === today.toISOString().split("T")[0];

      html += `
        <div class="calendar-day p-1 sm:p-2 rounded-xl border ${isToday ? "border-[var(--color-brand)]/50 bg-indigo-50/30 dark:bg-indigo-900/10" : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800"} min-h-[80px] sm:min-h-[100px] flex flex-col items-center cursor-pointer hover:border-[var(--color-brand)] transition-all" data-date="${date}">
          <span class="text-xs sm:text-sm font-black ${isToday ? "text-[var(--color-brand)]" : "text-gray-400 dark:text-gray-500"} mb-1">${day}</span>
          <div class="w-full flex flex-col gap-1 overflow-y-auto max-h-[100px]">
            ${daySchedules
              .map(
                (schedule) => `
                  <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded-md truncate w-full text-center tooltip" title="${escapeAttribute(schedule.title?.rendered)}">
                    ${escapeHtml((ministryNames[Number(schedule.minId)] || "GERAL").substring(0, 6))}
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
      `;
    }

    html += "</div>";
    calendarView.innerHTML = html;

    calendarView
      .querySelectorAll<HTMLElement>(".calendar-day")
      .forEach((day) => {
        day.onclick = () => {
          const date = day.getAttribute("data-date");
          if (date) openDayModal(date, byDate[date] || []);
        };
      });

    calendarView
      .querySelector<HTMLButtonElement>("#calendar-prev")
      ?.addEventListener("click", () => {
        calendarCursor = new Date(year, month - 1, 1);
        renderCalendar(schedules);
      });
    calendarView
      .querySelector<HTMLButtonElement>("#calendar-next")
      ?.addEventListener("click", () => {
        calendarCursor = new Date(year, month + 1, 1);
        renderCalendar(schedules);
      });
  }

  function attachCardHandlers(): void {
    document
      .querySelectorAll<HTMLButtonElement>(".delete-scale-btn")
      .forEach((button) => {
        button.onclick = async () => {
          if (!confirm("Deseja cancelar esta escala permanentemente?")) return;
          const id = button.getAttribute("data-id");
          try {
            const response = await apiFetch(
              `/wp-json/wp/v2/escala/${id}/?force=true`,
              {
                method: "DELETE",
              },
            );
            if (!response.ok) throw new Error("Falha ao cancelar");
            showToast("Escala cancelada", "success");
            await loadSchedules();
          } catch {
            showToast("Erro ao cancelar", "error");
          }
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".join-scale-btn")
      .forEach((button) => {
        button.onclick = async () => {
          const id = button.getAttribute("data-id");
          const names = button.getAttribute("data-names") || "";
          const emails = button.getAttribute("data-emails") || "";

          if (emails.toLowerCase().includes((user.email || "").toLowerCase())) {
            showToast("Você já está escalado para este dia!", "error");
            return;
          }
          if (!confirm("Colocar o seu nome à disposição nesta escala?")) return;

          button.disabled = true;
          button.innerHTML =
            '<i class="fa-solid fa-circle-notch animate-spin"></i>';

          const join = async (override?: {
            override: boolean;
            override_reason: string;
          }) => {
            const response = await apiFetch(
              `/wp-json/1ipim/v1/escalas/${id}/participar`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(override || {}),
              },
            );

            if (response.status === 409) {
              const payload = await parseError(response);
              const authorization = askOverride(
                payload,
                Boolean(payload.data?.can_override) && isManager,
              );
              if (!authorization) return false;

              return join({
                override: true,
                override_reason: authorization.reason,
              });
            }

            if (!response.ok) throw new Error("Falha ao participar");
            return true;
          };

          try {
            const joined = await join();
            if (!joined) {
              button.disabled = false;
              button.innerHTML =
                '<i class="fa-solid fa-user-plus"></i> Participar';
              return;
            }
            showToast("Seu nome foi adicionado à equipe!", "success");
            modal?.classList.add("hidden");
            await loadSchedules();
          } catch {
            showToast("Erro ao participar", "error");
            button.disabled = false;
            button.innerHTML =
              '<i class="fa-solid fa-user-plus"></i> Participar';
          }
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".leave-scale-btn")
      .forEach((button) => {
        button.onclick = async () => {
          const id = button.getAttribute("data-id");
          if (!id) return;
          if (!confirm("Sair desta escala?")) return;
          button.disabled = true;
          try {
            const response = await apiFetch(
              `/wp-json/1ipim/v1/escalas/${id}/sair`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              },
            );
            if (!response.ok) throw new Error("Falha ao sair");
            showToast("Você saiu da escala", "success");
            modal?.classList.add("hidden");
            await loadSchedules();
          } catch {
            showToast("Erro ao sair da escala", "error");
            button.disabled = false;
          }
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".edit-scale-btn")
      .forEach((button) => {
        button.onclick = () => {
          const id = button.getAttribute("data-id");
          if (!id) return;
          openEditModal(
            id,
            button.getAttribute("data-names") || "",
            button.getAttribute("data-emails") || "",
            button.getAttribute("data-date") || "",
            button.getAttribute("data-time") || "",
            button.getAttribute("data-minid") || "",
          );
        };
      });
  }

  function renderSchedules(list: WpSchedule[]): void {
    if (!listView) return;

    const filtered = filterSchedules(list);

    if (filtered.length === 0) {
      listView.innerHTML = `
        <div class="text-center py-20 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-700 animate-slide-up">
          <i class="fa-regular fa-calendar-xmark text-5xl text-gray-200 mb-4"></i>
          <p class="text-gray-500 font-bold">Nenhuma escala encontrada para este filtro.</p>
        </div>
      `;
      renderCalendar(filtered);
      return;
    }

    listView.innerHTML = filtered
      .map((schedule) => {
        const meta = scheduleMetadata(schedule);
        const ministryName = ministryNames[Number(meta.ministryId)] || "Geral";
        const date = new Date(`${meta.date}T12:00:00`);
        const day = date.getDate();
        const month = date
          .toLocaleString("pt-BR", { month: "short" })
          .toUpperCase()
          .replace(".", "");
        const isParticipant = meta.emails
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .includes((user.email || "").toLowerCase());

        return `
          <div class="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6 group hover:shadow-xl transition-all animate-slide-up">
            <div class="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-gray-100 dark:border-slate-700 flex-shrink-0 shadow-inner group-hover:bg-[var(--color-brand)] group-hover:border-[var(--color-brand)] transition-colors">
              <span class="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white">${day}</span>
              <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase group-hover:text-white/80">${month}</span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <h4 class="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg leading-none">${escapeHtml(schedule.title?.rendered || "Escala")}</h4>
                <span class="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">${escapeHtml(ministryName)}</span>
              </div>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <i class="fa-regular fa-clock text-[var(--color-brand)]"></i> ${escapeHtml(meta.time || "Horário não definido")}
                </div>
                <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold max-w-full">
                  <i class="fa-solid fa-users text-[var(--color-brand)]"></i>
                  <span class="truncate italic font-medium">${escapeHtml(meta.names)}</span>
                </div>
              </div>
            </div>

            <div class="sm:ml-auto flex items-center gap-2">
              ${
                isParticipant
                  ? `<button class="leave-scale-btn px-4 py-2 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white transition-all font-bold text-xs gap-2 border border-transparent hover:border-red-600" data-id="${schedule.id}">
                      <i class="fa-solid fa-user-minus"></i> Sair
                    </button>`
                  : `<button class="join-scale-btn px-4 py-2 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-[var(--color-brand)] hover:text-white transition-all font-bold text-xs gap-2 border border-transparent hover:border-[var(--color-brand)]" data-id="${schedule.id}" data-names="${escapeAttribute(meta.names)}" data-emails="${escapeAttribute(meta.emails)}" data-time="${escapeAttribute(meta.time)}" data-date="${escapeAttribute(meta.date)}" data-minid="${escapeAttribute(meta.ministryId)}">
                      <i class="fa-solid fa-user-plus"></i> Participar
                    </button>`
              }

              ${
                isManager
                  ? `
                    <button aria-label="Editar equipe" class="edit-scale-btn w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900" data-id="${schedule.id}" data-names="${escapeAttribute(meta.names)}" data-emails="${escapeAttribute(meta.emails)}" data-time="${escapeAttribute(meta.time)}" data-date="${escapeAttribute(meta.date)}" data-minid="${escapeAttribute(meta.ministryId)}" title="Editar Equipe">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button aria-label="Excluir escala" class="delete-scale-btn w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900" data-id="${schedule.id}">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  `
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");

    renderCalendar(filtered);
    attachCardHandlers();
  }

  function openDayModal(date: string, items: WpSchedule[]): void {
    if (!modal || !modalContent || !modalTitle) return;

    const [year, month, day] = date.split("-");
    modalTitle.innerText = `Escalas: ${day}/${month}/${year}`;

    if (items.length === 0) {
      modalContent.innerHTML =
        '<p class="text-center py-10 text-gray-400 font-bold">Nenhuma escala para este dia.</p>';
    } else {
      modalContent.innerHTML = items
        .map((schedule) => {
          const meta = scheduleMetadata(schedule);
          const ministryName =
            ministryNames[Number(meta.ministryId)] || "Geral";
          const isParticipant = meta.emails
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .includes((user.email || "").toLowerCase());
          return `
            <div class="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-700/50">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-black text-gray-900 dark:text-white uppercase text-sm">${escapeHtml(schedule.title?.rendered || "Escala")}</h4>
                <span class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">${escapeHtml(ministryName)}</span>
              </div>
              <div class="space-y-2 mb-4">
                <p class="text-[10px] text-gray-500 font-bold flex items-center gap-2"><i class="fa-regular fa-clock text-[var(--color-brand)]"></i> ${escapeHtml(meta.time || "SH")}</p>
                <p class="text-[10px] text-gray-500 font-bold flex items-center gap-2"><i class="fa-solid fa-users text-[var(--color-brand)]"></i> ${escapeHtml(meta.names)}</p>
              </div>
              <div class="flex items-center gap-2">
                ${
                  isParticipant
                    ? `<button class="leave-scale-btn flex-1 bg-red-600 text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-600/20" data-id="${schedule.id}">Sair da escala</button>`
                    : `<button class="join-scale-btn flex-1 bg-[var(--color-brand)] text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[var(--color-brand)]/20" data-id="${schedule.id}" data-names="${escapeAttribute(meta.names)}" data-emails="${escapeAttribute(meta.emails)}" data-time="${escapeAttribute(meta.time)}" data-date="${escapeAttribute(date)}" data-minid="${escapeAttribute(meta.ministryId)}">Participar</button>`
                }
                ${
                  isManager
                    ? `
                      <button aria-label="Editar equipe" class="edit-scale-btn w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-blue-500 border border-gray-100 dark:border-slate-600" data-id="${schedule.id}" data-names="${escapeAttribute(meta.names)}" data-emails="${escapeAttribute(meta.emails)}" data-time="${escapeAttribute(meta.time)}" data-date="${escapeAttribute(date)}" data-minid="${escapeAttribute(meta.ministryId)}"><i class="fa-solid fa-pen text-xs"></i></button>
                      <button aria-label="Excluir escala" class="delete-scale-btn w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-red-500 border border-gray-100 dark:border-slate-600" data-id="${schedule.id}"><i class="fa-solid fa-trash-can text-xs"></i></button>
                    `
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");
    }

    modal.classList.remove("hidden");
    attachCardHandlers();
  }

  function openEditModal(
    id: string,
    names: string,
    emails: string,
    date: string,
    time: string,
    ministryId: string,
  ): void {
    if (!modal || !modalContent || !modalTitle) return;

    const currentEmails = emails
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const currentNames = names.split(",").map((name) => name.trim());
    const seen = new Set<string>();
    const candidates: Array<{ name: string; email: string }> = [];
    usersList.forEach((member) => {
      const email = (member.email || "").toLowerCase();
      if (email && !seen.has(email)) {
        seen.add(email);
        candidates.push({ name: member.name, email });
      }
    });
    currentEmails.forEach((email, index) => {
      if (!seen.has(email)) {
        seen.add(email);
        candidates.push({ name: currentNames[index] || email, email });
      }
    });
    const candidatesHtml = candidates.length
      ? candidates
          .map(
            (candidate) => `
              <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                <input type="checkbox" name="edit-volunteers" value="${escapeAttribute(candidate.email)}" data-name="${escapeAttribute(candidate.name)}" ${currentEmails.includes(candidate.email) ? "checked" : ""} class="w-5 h-5 rounded-md border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]">
                <span class="text-xs font-bold text-gray-700 dark:text-gray-300">${escapeHtml(candidate.name)} <span class="text-gray-500 font-normal">${escapeHtml(candidate.email)}</span></span>
              </label>
            `,
          )
          .join("")
      : '<p class="text-xs text-gray-500">Nenhum voluntário disponível.</p>';

    modalTitle.innerText = `Editar equipe — ${date} ${time}`.trim();
    modalContent.innerHTML = `
      <div class="space-y-4">
        <div>
          <span class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Equipe escalada</span>
          <div id="edit-volunteers" class="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl max-h-64 overflow-y-auto p-2 space-y-1">
            ${candidatesHtml}
          </div>
        </div>
        <div class="flex gap-3">
          <button id="cancel-edit" class="flex-1 py-3 bg-gray-50 dark:bg-slate-700 text-gray-500 font-black rounded-2xl text-xs uppercase">Cancelar</button>
          <button id="save-edit" class="flex-1 py-3 bg-[var(--color-brand)] text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-[var(--color-brand)]/20">Salvar Alterações</button>
        </div>
      </div>
    `;
    modal.classList.remove("hidden");

    const cancelButton = document.getElementById("cancel-edit");
    const saveButton = document.getElementById(
      "save-edit",
    ) as HTMLButtonElement | null;

    if (cancelButton) {
      cancelButton.onclick = () => modal.classList.add("hidden");
    }

    if (saveButton) {
      saveButton.onclick = async () => {
        const selected = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            'input[name="edit-volunteers"]:checked',
          ),
        );
        const teamNames =
          selected
            .map((input) => input.getAttribute("data-name") || "")
            .filter(Boolean)
            .join(", ") || "---";
        const teamEmails = selected.map((input) => input.value).join(", ");

        saveButton.innerText = "Salvando...";
        saveButton.disabled = true;

        const save = async (override?: {
          override: boolean;
          override_reason: string;
        }): Promise<boolean> => {
          const response = await apiFetch(
            `/wp-json/1ipim/v1/escalas/${id}/equipe`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                names: teamNames,
                emails: teamEmails,
                ...(override || {}),
              }),
            },
          );

          if (response.status === 409) {
            const payload = await parseError(response);
            const authorization = askOverride(
              payload,
              Boolean(payload.data?.can_override),
            );
            if (!authorization) return false;

            return save({
              override: true,
              override_reason: authorization.reason,
            });
          }

          if (!response.ok) throw new Error("Falha ao atualizar");
          return true;
        };

        try {
          const saved = await save();
          if (!saved) {
            saveButton.innerText = "Salvar Alterações";
            saveButton.disabled = false;
            return;
          }
          showToast("Escala atualizada!", "success");
          modal.classList.add("hidden");
          await loadSchedules();
        } catch {
          showToast("Erro ao atualizar", "error");
          saveButton.innerText = "Salvar Alterações";
          saveButton.disabled = false;
        }
      };
    }
  }

  function setupModal(): void {
    if (closeModalButton && modal) {
      closeModalButton.onclick = () => modal.classList.add("hidden");
    }
    window.onclick = (event) => {
      if (event.target === modal) modal?.classList.add("hidden");
    };
  }

  function setupFilters(): void {
    filterTabs.forEach((tab) => {
      tab.onclick = () => {
        filterTabs.forEach((item) => {
          item.classList.remove(...FILTER_ACTIVE_CLASSES);
          item.classList.add(...FILTER_INACTIVE_CLASSES);
        });
        tab.classList.add(...FILTER_ACTIVE_CLASSES);
        tab.classList.remove(...FILTER_INACTIVE_CLASSES);
        filterState.active = tab.getAttribute("data-filter") || "all";
        renderSchedules(schedules);
      };
    });
  }

  function setupViewToggles(): void {
    viewToggles.forEach((toggle) => {
      toggle.onclick = () => {
        const view = toggle.getAttribute("data-view");
        viewToggles.forEach((item) => {
          item.classList.remove(...VIEW_ACTIVE_CLASSES);
          item.classList.add(...VIEW_INACTIVE_CLASSES);
        });
        toggle.classList.add(...VIEW_ACTIVE_CLASSES);
        toggle.classList.remove(...VIEW_INACTIVE_CLASSES);

        if (view === "calendar") {
          listView?.classList.add("hidden");
          calendarView?.classList.remove("hidden");
        } else {
          listView?.classList.remove("hidden");
          calendarView?.classList.add("hidden");
        }
      };
    });
  }

  function setupAddForm(): void {
    if (!addScaleForm) return;

    addScaleForm.onsubmit = async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById(
        "scale-add-btn",
      ) as HTMLButtonElement | null;
      const submitLabel = document.getElementById("scale-add-text");
      const submitLoader = document.getElementById("scale-add-loader");

      if (submitButton) submitButton.disabled = true;
      if (submitLabel) submitLabel.innerText = "Agendando...";
      submitLoader?.classList.remove("hidden");

      const title =
        (document.getElementById("scale-title") as HTMLInputElement | null)
          ?.value || "";
      const date =
        (document.getElementById("scale-date") as HTMLInputElement | null)
          ?.value || "";
      const time =
        (document.getElementById("scale-time") as HTMLInputElement | null)
          ?.value || "";
      const ministry =
        (document.getElementById("scale-ministry") as HTMLSelectElement | null)
          ?.value || "";
      const recurrence =
        parseInt(
          (
            document.getElementById(
              "scale-recurrence",
            ) as HTMLInputElement | null
          )?.value || "1",
          10,
        ) || 1;

      const selected = document.querySelectorAll<HTMLInputElement>(
        'input[name="volunteers"]:checked',
      );
      const names = Array.from(selected)
        .map((input) => input.getAttribute("data-name") || "")
        .join(", ");
      const emails = Array.from(selected)
        .map((input) => input.value)
        .join(", ");

      const createOne = async (
        isoDate: string,
        override?: { override: boolean; override_reason: string },
      ): Promise<"created" | "skipped"> => {
        const content = `<p>${isoDate}|${emails}|${time}|${names}|${ministry}</p>`;
        const response = await apiFetch("/wp-json/wp/v2/escala/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            summary: names,
            content,
            status: "publish",
            ipim_override: override?.override || false,
            ipim_override_reason: override?.override_reason || "",
            meta: {
              data_da_escala: isoDate,
              ministerio_id: ministry,
              equipe_nomes: names,
              equipe_emails: emails,
              horario: time,
            },
          }),
        });

        if (response.status === 409) {
          const payload = await parseError(response);
          const authorization = askOverride(
            payload,
            Boolean(payload.data?.can_override),
          );
          if (!authorization) return "skipped";

          return createOne(isoDate, {
            override: true,
            override_reason: authorization.reason,
          });
        }

        if (!response.ok) throw new Error("Falha ao criar escala");
        return "created";
      };

      try {
        const currentDate = new Date(`${date}T12:00:00`);
        let created = 0;

        for (let index = 0; index < recurrence; index++) {
          const isoDate = currentDate.toISOString().split("T")[0];
          const result = await createOne(isoDate);
          if (result === "skipped") {
            showToast(
              created > 0
                ? `Criadas ${created} de ${recurrence} escalas.`
                : "Criação cancelada por conflito de escala.",
              "info",
            );
            if (created > 0) await loadSchedules();
            return;
          }
          created++;
          currentDate.setDate(currentDate.getDate() + 7);
        }

        showToast(
          recurrence > 1
            ? `Criadas ${recurrence} Escalas Recorrentes!`
            : "Escala agendada com sucesso!",
          "success",
        );
        addScaleForm.reset();
        await loadSchedules();
      } catch {
        showToast("Erro ao salvar escala(s)", "error");
      } finally {
        if (submitButton) submitButton.disabled = false;
        if (submitLabel) submitLabel.innerText = "Agendar Escala";
        submitLoader?.classList.add("hidden");
      }
    };
  }

  async function initialize(): Promise<void> {
    await Promise.all([loadMinistries(), loadVolunteers()]);
    await loadSchedules();
  }

  setupModal();
  setupFilters();
  setupViewToggles();
  setupAddForm();
  void initialize();
});
