import { auth } from "./auth";
import { apiFetch } from "./api";
import { escapeAttribute, escapeHtml, showToast, onPageReady } from "./ui";
import type { WpMinistry, WpUser } from "./types";

interface RoleVisual {
  badgeClass: string;
  label: string;
}

interface UsersResponse {
  items: WpUser[];
  total: number;
  page: number;
  pages: number;
  stats: {
    total?: number;
    pending?: number;
    bible_rats?: number;
    unverified?: number;
  };
}

const ROLE_VISUALS: Record<string, RoleVisual> = {
  administrator: { badgeClass: "bg-red-700 text-white", label: "Admin" },
  pastor: { badgeClass: "bg-blue-700 text-white", label: "Pastor" },
  editor: { badgeClass: "bg-purple-700 text-white", label: "Líder" },
  lider_ministerio: { badgeClass: "bg-purple-700 text-white", label: "Líder" },
  contributor: { badgeClass: "bg-green-700 text-white", label: "Voluntário" },
  colaborador_ministerio: {
    badgeClass: "bg-green-700 text-white",
    label: "Voluntário",
  },
  subscriber: { badgeClass: "bg-slate-700 text-white", label: "Membro" },
  assinante: { badgeClass: "bg-slate-700 text-white", label: "Membro" },
};

function getRoleVisual(roles: string[] | undefined): RoleVisual {
  const list = roles || [];
  if (list.includes("administrator")) return ROLE_VISUALS.administrator;
  if (list.includes("pastor")) return ROLE_VISUALS.pastor;
  if (list.includes("editor") || list.includes("lider_ministerio")) {
    return ROLE_VISUALS.lider_ministerio;
  }
  if (list.includes("contributor") || list.includes("colaborador_ministerio")) {
    return ROLE_VISUALS.colaborador_ministerio;
  }
  return ROLE_VISUALS.subscriber;
}

function parseStringArray(raw: string | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

onPageReady("#users-table-body", async () => {
  const tableBody = document.getElementById("users-table-body");
  const loading = document.getElementById("loading-users");
  const emptyState = document.getElementById("no-users");
  const statsBox = document.getElementById("users-stats");
  const searchInput = document.getElementById(
    "users-search",
  ) as HTMLInputElement | null;
  const roleFilter = document.getElementById(
    "users-role",
  ) as HTMLSelectElement | null;
  const ministryFilter = document.getElementById(
    "users-ministry",
  ) as HTMLSelectElement | null;
  const pendingFilter = document.getElementById(
    "users-pending",
  ) as HTMLInputElement | null;
  const pageInfo = document.getElementById("users-page-info");
  const prevButton = document.getElementById(
    "users-prev",
  ) as HTMLButtonElement | null;
  const nextButton = document.getElementById(
    "users-next",
  ) as HTMLButtonElement | null;

  const roleModal = document.getElementById("role-modal");
  const roleModalTitle = document.getElementById("role-modal-title");
  const roleSelect = document.getElementById(
    "role-select",
  ) as HTMLSelectElement | null;
  const roleMinistry = document.getElementById(
    "role-ministry",
  ) as HTMLSelectElement | null;
  const roleMinistryField = document.getElementById("role-ministry-field");
  const roleFeedback = document.getElementById("role-feedback");
  const roleSave = document.getElementById(
    "role-save",
  ) as HTMLButtonElement | null;

  const currentUser = (await auth.ensureSession()) ?? auth.getUser();
  const canManageAll =
    Boolean(currentUser.isAdmin || currentUser.isPastor) ||
    currentUser.role === "administrator" ||
    currentUser.role === "pastor";

  if (!canManageAll) {
    window.location.href = "/portal/";
    return;
  }

  let users: WpUser[] = [];
  let ministries: WpMinistry[] = [];
  const ministryNames: Record<number, string> = {};
  let pendingRoleUser: WpUser | null = null;

  const state = {
    q: "",
    role: "",
    ministry: "",
    pending: false,
    page: 1,
    pages: 1,
    total: 0,
    stats: {} as UsersResponse["stats"],
  };

  async function loadMinistries(): Promise<void> {
    try {
      const response = await apiFetch("/wp-json/1ipim/v1/ministries?manage=1");
      ministries = await response.json();
      ministries.forEach((ministry) => {
        ministryNames[ministry.id] = ministry.title.rendered;
      });

      if (ministryFilter) {
        ministryFilter.innerHTML =
          '<option value="">Todos os ministérios</option>' +
          ministries
            .map(
              (ministry) =>
                `<option value="${ministry.id}">${escapeHtml(ministry.title.rendered)}</option>`,
            )
            .join("");
      }
      if (roleMinistry) {
        roleMinistry.innerHTML = ministries
          .map(
            (ministry) =>
              `<option value="${ministry.id}">${escapeHtml(ministry.title.rendered)}</option>`,
          )
          .join("");
      }
    } catch (error) {
      console.error("Erro ao mapear ministérios:", error);
    }
  }

  function renderApproved(ministryId: string): string {
    return `<span class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-green-200 dark:border-green-800/50 whitespace-nowrap">✓ ${escapeHtml(
      ministryNames[Number(ministryId)] || ministryId,
    )}</span>`;
  }

  function renderRequested(user: WpUser, ministryId: string): string {
    return `
      <button class="approve-min-btn bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-amber-200 dark:border-amber-800/50 hover:bg-amber-600 hover:text-white transition-all shadow-sm" data-uid="${user.id}" data-mid="${escapeAttribute(ministryId)}">
        Aprovar ${escapeHtml(ministryNames[Number(ministryId)] || ministryId)}
      </button>
    `;
  }

  function renderUserRow(user: WpUser): string {
    const requested = parseStringArray(user.meta?.ministries_requested);
    const approved = parseStringArray(user.meta?.ministries_approved);
    const visual = getRoleVisual(user.roles);
    const isSelf = String(user.id) === String(currentUser.id);
    const unverified =
      user.account_type === "bible_rats" && !user.email_verified;

    return `
      <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group">
        <td class="px-8 py-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold overflow-hidden shadow-inner text-lg">
              ${escapeHtml((user.name || "?").charAt(0).toUpperCase())}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-white">${escapeHtml(user.name)}</span>
                ${isSelf ? '<span class="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase">Você</span>' : ""}
                ${unverified ? '<span class="text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-black uppercase">E-mail pendente</span>' : ""}
              </div>
              <div class="text-[10px] text-gray-500 font-medium">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td class="px-8 py-6">
          <div class="flex flex-wrap gap-1.5">
            ${approved.map((id) => renderApproved(id)).join("")}
            ${requested
              .filter((id) => !approved.includes(id))
              .map((id) => renderRequested(user, id))
              .join("")}
            ${approved.length === 0 && requested.length === 0 ? '<span class="text-[10px] text-gray-500 italic">Nenhum vínculo</span>' : ""}
          </div>
        </td>
        <td class="px-8 py-6 text-center">
          <span class="${visual.badgeClass} px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm shadow-black/10">${visual.label}</span>
        </td>
        <td class="px-8 py-6 text-right">
          <div class="flex items-center justify-end gap-2">
            ${
              isSelf
                ? '<span class="text-[10px] text-gray-500 italic px-2">Gerenciado pelo WP</span>'
                : `
                  <div class="relative group/menu">
                    <button aria-label="Ações de ${escapeAttribute(user.name)}" aria-haspopup="true" class="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] p-2 rounded-xl text-gray-500 hover:text-[var(--color-brand)] transition-all shadow-sm">
                      <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 py-3 min-w-[220px] hidden group-hover/menu:block group-focus-within/menu:block z-50 animate-slide-up">
                      <p class="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 mb-2">Alterar papel</p>
                      <button class="role-action-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${user.id}" data-role="administrator">
                        <i class="fa-solid fa-crown mr-2 text-amber-600"></i> Tornar Admin
                      </button>
                      <button class="role-action-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${user.id}" data-role="lider_ministerio">
                        <i class="fa-solid fa-user-shield mr-2 text-purple-600"></i> Tornar Líder
                      </button>
                      <button class="role-action-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${user.id}" data-role="assinante">
                        <i class="fa-solid fa-user mr-2 text-gray-500"></i> Rebaixar Membro
                      </button>
                      ${
                        unverified
                          ? `
                            <div class="h-px bg-gray-50 dark:bg-slate-700 my-2 mx-4"></div>
                            <button class="verify-email-btn w-full text-left px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20" data-id="${user.id}">
                              <i class="fa-solid fa-envelope-circle-check mr-2"></i> Verificar e-mail
                            </button>
                            <button class="resend-email-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700" data-id="${user.id}">
                              <i class="fa-solid fa-rotate-right mr-2"></i> Reenviar confirmação
                            </button>
                          `
                          : ""
                      }
                      <div class="h-px bg-gray-50 dark:bg-slate-700 my-2 mx-4"></div>
                      <button class="delete-user-btn w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" data-id="${user.id}">
                        <i class="fa-solid fa-trash-can mr-2"></i> Excluir Conta
                      </button>
                    </div>
                  </div>
                `
            }
          </div>
        </td>
      </tr>
    `;
  }

  function renderStats(): void {
    if (!statsBox) return;
    const cards = [
      ["Total", state.stats.total ?? 0, "fa-users"],
      ["Pendentes", state.stats.pending ?? 0, "fa-triangle-exclamation"],
      ["Bible Rats", state.stats.bible_rats ?? 0, "fa-book-open"],
      ["E-mail pendente", state.stats.unverified ?? 0, "fa-envelope"],
    ];
    statsBox.innerHTML = cards
      .map(
        ([label, value, icon]) => `
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">${escapeHtml(label)}</span>
              <i class="fa-solid ${escapeAttribute(icon)} text-[var(--color-brand)]"></i>
            </div>
            <p class="text-2xl font-black text-gray-900 dark:text-white">${escapeHtml(value)}</p>
          </div>
        `,
      )
      .join("");
  }

  function renderPagination(): void {
    if (pageInfo) {
      pageInfo.innerText = `Página ${state.page} de ${state.pages} · ${state.total} voluntários`;
    }
    if (prevButton) prevButton.disabled = state.page <= 1;
    if (nextButton) nextButton.disabled = state.page >= state.pages;
  }

  function attachActions(): void {
    document
      .querySelectorAll<HTMLButtonElement>(".approve-min-btn")
      .forEach((button) => {
        button.onclick = () => {
          void approveMinistry(
            button.getAttribute("data-uid") || "",
            button.getAttribute("data-mid") || "",
          );
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".role-action-btn")
      .forEach((button) => {
        button.onclick = () => {
          const userId = button.getAttribute("data-id") || "";
          const role = button.getAttribute("data-role") || "assinante";
          const user = users.find((item) => String(item.id) === userId);
          if (user) openRoleModal(user, role);
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".verify-email-btn")
      .forEach((button) => {
        button.onclick = () => {
          void verifyEmail(button.getAttribute("data-id") || "");
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".resend-email-btn")
      .forEach((button) => {
        button.onclick = () => {
          void resendEmail(button.getAttribute("data-id") || "");
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".delete-user-btn")
      .forEach((button) => {
        button.onclick = () => {
          if (confirm("Excluir este usuário permanentemente?")) {
            void deleteUser(button.getAttribute("data-id") || "");
          }
        };
      });
  }

  async function loadUsers(): Promise<void> {
    loading?.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    if (tableBody) tableBody.innerHTML = "";

    const params = new URLSearchParams({
      per_page: "20",
      page: String(state.page),
    });
    if (state.q) params.set("q", state.q);
    if (state.role) params.set("role", state.role);
    if (state.ministry) params.set("ministry", state.ministry);
    if (state.pending) params.set("pending", "1");

    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/admin/users?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar voluntários");
      const data = (await response.json()) as UsersResponse;
      users = data.items || [];
      state.total = data.total || 0;
      state.pages = Math.max(1, data.pages || 1);
      state.stats = data.stats || {};
      loading?.classList.add("hidden");
      renderStats();
      renderPagination();

      if (users.length === 0) {
        emptyState?.classList.remove("hidden");
        return;
      }

      if (tableBody) tableBody.innerHTML = users.map(renderUserRow).join("");
      attachActions();
    } catch (error) {
      console.error(error);
      if (loading) loading.innerText = "Erro ao carregar voluntários.";
      showToast("Erro ao carregar voluntários", "error");
    }
  }

  function openRoleModal(user: WpUser, role: string): void {
    pendingRoleUser = user;
    if (roleModalTitle)
      roleModalTitle.innerText = `Alterar papel de ${user.name}`;
    if (roleSelect) roleSelect.value = role;
    roleMinistryField?.classList.toggle(
      "hidden",
      !["lider_ministerio", "colaborador_ministerio"].includes(role),
    );
    roleFeedback?.classList.add("hidden");
    roleModal?.classList.remove("hidden");
  }

  function closeRoleModal(): void {
    roleModal?.classList.add("hidden");
    pendingRoleUser = null;
  }

  function showRoleFeedback(message: string): void {
    if (!roleFeedback) return;
    roleFeedback.innerText = message;
    roleFeedback.className =
      "p-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    roleFeedback.classList.remove("hidden");
  }

  async function saveRole(): Promise<void> {
    if (!pendingRoleUser || !roleSelect) return;
    const role = roleSelect.value;
    const ministryId = ["lider_ministerio", "colaborador_ministerio"].includes(
      role,
    )
      ? Number(roleMinistry?.value || 0)
      : 0;
    if (
      ["lider_ministerio", "colaborador_ministerio"].includes(role) &&
      !ministryId
    ) {
      showRoleFeedback("Selecione o ministério.");
      return;
    }

    if (roleSave) roleSave.disabled = true;
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/users/${pendingRoleUser.id}/role`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, ministry_id: ministryId }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Falha ao atualizar papel");
      }
      showToast("Papel atualizado!", "success");
      closeRoleModal();
      await loadUsers();
    } catch (error) {
      showRoleFeedback(
        error instanceof Error ? error.message : "Erro ao atualizar papel",
      );
    } finally {
      if (roleSave) roleSave.disabled = false;
    }
  }

  async function verifyEmail(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/admin/users/${userId}/verify-email`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Falha ao verificar e-mail");
      showToast("E-mail verificado manualmente", "success");
      await loadUsers();
    } catch {
      showToast("Erro ao verificar e-mail", "error");
    }
  }

  async function resendEmail(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/admin/users/${userId}/resend-verification`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Falha ao reenviar");
      showToast(
        data.sent
          ? "Confirmação reenviada"
          : "O envio falhou; use a verificação manual.",
        data.sent ? "success" : "error",
      );
      await loadUsers();
    } catch {
      showToast("Erro ao reenviar confirmação", "error");
    }
  }

  async function approveMinistry(
    userId: string,
    ministryId: string,
  ): Promise<void> {
    if (!userId || !ministryId) return;

    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/ministries/${ministryId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: Number(userId),
            role: "colaborador",
          }),
        },
      );
      if (!response.ok) throw new Error("Falha ao aprovar vínculo");
      showToast("Vínculo aprovado com sucesso!", "success");
      await loadUsers();
    } catch {
      showToast("Erro ao aprovar ministério", "error");
    }
  }

  async function deleteUser(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const response = await apiFetch(`/wp-json/1ipim/v1/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao excluir usuário");
      showToast("Usuário excluído", "success");
      await loadUsers();
    } catch {
      showToast("Erro ao excluir usuário", "error");
    }
  }

  let timer = 0;
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.q = searchInput.value.trim();
      state.page = 1;
      void loadUsers();
    }, 350);
  });
  roleFilter?.addEventListener("change", () => {
    state.role = roleFilter.value;
    state.page = 1;
    void loadUsers();
  });
  ministryFilter?.addEventListener("change", () => {
    state.ministry = ministryFilter.value;
    state.page = 1;
    void loadUsers();
  });
  pendingFilter?.addEventListener("change", () => {
    state.pending = pendingFilter.checked;
    state.page = 1;
    void loadUsers();
  });
  prevButton?.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page--;
    void loadUsers();
  });
  nextButton?.addEventListener("click", () => {
    if (state.page >= state.pages) return;
    state.page++;
    void loadUsers();
  });

  roleSelect?.addEventListener("change", () => {
    roleMinistryField?.classList.toggle(
      "hidden",
      !["lider_ministerio", "colaborador_ministerio"].includes(
        roleSelect.value,
      ),
    );
  });
  document
    .getElementById("role-modal-close")
    ?.addEventListener("click", closeRoleModal);
  document
    .getElementById("role-cancel")
    ?.addEventListener("click", closeRoleModal);
  roleModal?.addEventListener("click", (event) => {
    if (event.target === roleModal) closeRoleModal();
  });
  roleSave?.addEventListener("click", () => {
    void saveRole();
  });

  await loadMinistries();
  await loadUsers();
});
