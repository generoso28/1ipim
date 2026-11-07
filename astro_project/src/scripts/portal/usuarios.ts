import { auth } from "./auth";
import { apiFetch } from "./api";
import { escapeAttribute, escapeHtml, showToast, onPageReady } from "./ui";
import type { WpMinistry, WpUser } from "./types";

interface RoleVisual {
  badgeClass: string;
  label: string;
}

const ROLE_VISUALS: Record<string, RoleVisual> = {
  administrator: { badgeClass: "bg-red-500 text-white", label: "Admin" },
  pastor: { badgeClass: "bg-blue-600 text-white", label: "Pastor" },
  editor: { badgeClass: "bg-purple-500 text-white", label: "Líder" },
  lider_ministerio: { badgeClass: "bg-purple-500 text-white", label: "Líder" },
  contributor: { badgeClass: "bg-green-500 text-white", label: "Voluntário" },
  colaborador_ministerio: {
    badgeClass: "bg-green-500 text-white",
    label: "Voluntário",
  },
  subscriber: { badgeClass: "bg-slate-500 text-white", label: "Membro" },
  assinante: { badgeClass: "bg-slate-500 text-white", label: "Membro" },
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
  const currentUser = (await auth.ensureSession()) ?? auth.getUser();
  const canManageAll =
    Boolean(currentUser.isAdmin || currentUser.isPastor) ||
    currentUser.role === "administrator" ||
    currentUser.role === "pastor";

  if (!canManageAll) {
    window.location.href = "/portal/";
    return;
  }

  const currentUserId = currentUser.id;

  const ministryNames: Record<number, string> = {};
  let users: WpUser[] = [];

  async function loadMinistryNames(): Promise<void> {
    try {
      const response = await apiFetch("/wp-json/1ipim/v1/ministries");
      const ministries = (await response.json()) as WpMinistry[];
      ministries.forEach((ministry) => {
        ministryNames[ministry.id] = ministry.title.rendered;
      });
    } catch (error) {
      console.error("Erro ao mapear ministérios:", error);
    }
  }

  function renderApproved(ministryId: string): string {
    return `<span class="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-green-200 dark:border-green-800/50 whitespace-nowrap">✓ ${escapeHtml(
      ministryNames[Number(ministryId)] || ministryId,
    )}</span>`;
  }

  function renderRequested(user: WpUser, ministryId: string): string {
    return `
      <button class="approve-min-btn bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-amber-200 dark:border-amber-800/50 hover:bg-amber-500 hover:text-white transition-all shadow-sm" data-uid="${user.id}" data-mid="${escapeAttribute(ministryId)}">
        Aprovar ${escapeHtml(ministryNames[Number(ministryId)] || ministryId)}
      </button>
    `;
  }

  function renderUserRow(user: WpUser): string {
    const requested = parseStringArray(user.meta?.ministries_requested);
    const approved = parseStringArray(user.meta?.ministries_approved);
    const visual = getRoleVisual(user.roles);
    const isSelf = String(user.id) === String(currentUserId);

    return `
      <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group">
        <td class="px-8 py-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 font-bold overflow-hidden shadow-inner text-lg">
              ${escapeHtml((user.name || "?").charAt(0).toUpperCase())}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-white">${escapeHtml(user.name)}</span>
                ${isSelf ? '<span class="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase">Você</span>' : ""}
              </div>
              <div class="text-[10px] text-gray-400 font-medium">${escapeHtml(user.email)}</div>
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
            ${approved.length === 0 && requested.length === 0 ? '<span class="text-[10px] text-gray-300 italic">Nenhum vínculo</span>' : ""}
          </div>
        </td>
        <td class="px-8 py-6 text-center">
          <span class="${visual.badgeClass} px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm shadow-black/10">${visual.label}</span>
        </td>
        <td class="px-8 py-6 text-right">
          <div class="flex items-center justify-end gap-2">
            ${
              isSelf
                ? '<span class="text-[10px] text-gray-300 italic px-2">Gerenciado pelo WP</span>'
                : `
                  <div class="relative group/menu">
                    <button aria-label="Ações de ${escapeAttribute(user.name)}" aria-haspopup="true" class="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] p-2 rounded-xl text-gray-400 hover:text-[var(--color-brand)] transition-all shadow-sm">
                      <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 py-3 min-w-[200px] hidden group-hover/menu:block group-focus-within/menu:block z-50 animate-slide-up">
                      <p class="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 mb-2">Alterar Nível</p>
                      <button class="promote-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${user.id}" data-to="administrator">
                        <i class="fa-solid fa-crown mr-2 text-amber-500"></i> Tornar Admin
                      </button>
                      <button class="promote-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${user.id}" data-to="editor">
                        <i class="fa-solid fa-user-shield mr-2 text-purple-500"></i> Tornar Líder
                      </button>
                      <button class="promote-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${user.id}" data-to="subscriber">
                        <i class="fa-solid fa-user mr-2 text-gray-400"></i> Rebaixar Membro
                      </button>
                      <div class="h-px bg-gray-50 dark:bg-slate-700 my-2 mx-4"></div>
                      <button class="delete-user-btn w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" data-id="${user.id}">
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

  async function loadUsers(): Promise<void> {
    loading?.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    if (tableBody) tableBody.innerHTML = "";

    try {
      await loadMinistryNames();

      const response = await apiFetch("/wp-json/1ipim/v1/users");
      users = await response.json();
      loading?.classList.add("hidden");

      if (!users || users.length === 0) {
        emptyState?.classList.remove("hidden");
        return;
      }

      if (tableBody) {
        tableBody.innerHTML = users.map(renderUserRow).join("");
      }

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
        .querySelectorAll<HTMLButtonElement>(".promote-btn")
        .forEach((button) => {
          button.onclick = () => {
            const userId = button.getAttribute("data-id") || "";
            const role = button.getAttribute("data-to") || "";
            const user = users.find(
              (item) => String(item.id) === String(userId),
            );
            void changeRole(
              userId,
              role,
              user?.meta?.ministries_approved || "[]",
            );
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
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar voluntários", "error");
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

  async function changeRole(
    userId: string,
    role: string,
    approvedJson = "[]",
  ): Promise<void> {
    if (!userId || !role) return;

    if (role === "editor") {
      const options = Object.entries(ministryNames)
        .map(([id, name]) => `${id} - ${name}`)
        .join("\n");
      const chosenId = prompt(
        `Para qual Ministério ele está sendo nomeado Líder?\nDigite o ID correspondente:\n\n${options}`,
      );

      if (!chosenId) {
        showToast("Operação cancelada.", "error");
        return;
      }
      if (!ministryNames[Number(chosenId)]) {
        showToast("ID Inválido.", "error");
        return;
      }
      approvedJson = chosenId;
    } else if (!confirm("Deseja alterar a função deste usuário?")) {
      return;
    }

    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/users/${userId}/role`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            ministry_id: role === "editor" ? Number(approvedJson) : undefined,
          }),
        },
      );

      if (!response.ok) throw new Error("Falha ao atualizar função");
      showToast(
        role === "editor"
          ? "Promovido a Líder com Vínculo!"
          : "Função atualizada!",
        "success",
      );
      await loadUsers();
    } catch {
      showToast("Erro ao atualizar função", "error");
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

  void loadUsers();
});
