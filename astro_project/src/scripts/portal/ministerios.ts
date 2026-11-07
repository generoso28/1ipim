import { apiFetch } from "./api";
import { auth } from "./auth";
import { escapeAttribute, escapeHtml, showToast, onPageReady } from "./ui";
import type { WpMinistry, WpUser } from "./types";

interface MemberAction {
  userId: string;
  ministryId: string;
  action: "add" | "remove" | "leader" | "collaborator";
}

onPageReady("#min-list", async () => {
  const form = document.getElementById(
    "add-min-form",
  ) as HTMLFormElement | null;
  const formColumn = document.getElementById("min-form-column");
  const formTitle = document.getElementById("min-form-title");
  const idInput = document.getElementById("min-id") as HTMLInputElement | null;
  const titleInput = document.getElementById(
    "min-title",
  ) as HTMLInputElement | null;
  const typeInput = document.getElementById(
    "min-type",
  ) as HTMLSelectElement | null;
  const descriptionInput = document.getElementById(
    "min-description",
  ) as HTMLTextAreaElement | null;
  const leaderInput = document.getElementById(
    "min-leader",
  ) as HTMLSelectElement | null;
  const archivedInput = document.getElementById(
    "min-archived",
  ) as HTMLInputElement | null;
  const typeField = document.getElementById("min-type-field");
  const leaderField = document.getElementById("min-leader-field");
  const archivedField = document.getElementById("min-archived-field");
  const list = document.getElementById("min-list");
  const loading = document.getElementById("loading-min");
  const emptyState = document.getElementById("no-min");
  const submitButton = document.getElementById(
    "add-btn",
  ) as HTMLButtonElement | null;
  const submitLabel = document.getElementById("add-text");
  const submitLoader = document.getElementById("add-loader");
  const cancelEdit = document.getElementById(
    "cancel-edit-min",
  ) as HTMLButtonElement | null;

  const memberModal = document.getElementById("member-modal");
  const memberModalTitle = document.getElementById("member-modal-title");
  const memberSearch = document.getElementById(
    "member-search",
  ) as HTMLInputElement | null;
  const memberUser = document.getElementById(
    "member-user",
  ) as HTMLSelectElement | null;
  const memberRole = document.getElementById(
    "member-role",
  ) as HTMLSelectElement | null;
  const memberRoleField = document.getElementById("member-role-field");
  const memberFeedback = document.getElementById("member-feedback");
  const memberSave = document.getElementById(
    "member-save",
  ) as HTMLButtonElement | null;

  const session = (await auth.ensureSession()) ?? auth.getUser();
  const canManageAll = Boolean(
    session.isAdmin ||
      session.isPastor ||
      session.role === "administrator" ||
      session.role === "pastor",
  );

  let users: WpUser[] = [];
  let ministries: WpMinistry[] = [];
  let editingId = 0;
  let memberMinistryId = 0;

  if (!canManageAll) {
    formColumn?.classList.add("hidden");
  }
  typeField?.classList.toggle("hidden", !canManageAll);
  leaderField?.classList.toggle("hidden", !canManageAll);
  archivedField?.classList.toggle("hidden", !canManageAll);

  function membershipFor(
    user: WpUser,
    ministryId: number,
  ): { role: string } | undefined {
    return (user.memberships || []).find(
      (membership) => Number(membership.ministry_id) === ministryId,
    );
  }

  async function loadUsers(): Promise<void> {
    try {
      const response = await apiFetch("/wp-json/1ipim/v1/users");
      users = await response.json();
      if (leaderInput) {
        leaderInput.innerHTML =
          '<option value="">Nenhum</option>' +
          users
            .map(
              (user) =>
                `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`,
            )
            .join("");
      }
    } catch (error) {
      console.error(error);
    }
  }

  function showMemberFeedback(message: string, error = false): void {
    if (!memberFeedback) return;
    memberFeedback.innerText = message;
    memberFeedback.className = error
      ? "p-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
      : "p-3 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300";
    memberFeedback.classList.remove("hidden");
  }

  async function updateMembership({
    userId,
    ministryId,
    action,
  }: MemberAction): Promise<void> {
    if (!userId || !ministryId) return;

    try {
      const endpoint = `/wp-json/1ipim/v1/ministries/${ministryId}/members`;
      const response =
        action === "remove"
          ? await apiFetch(`${endpoint}/${userId}`, { method: "DELETE" })
          : await apiFetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: Number(userId),
                role: action === "leader" ? "lider" : "colaborador",
              }),
            });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Falha ao atualizar vínculo");
      }

      showToast(
        action === "remove"
          ? "Voluntário removido"
          : action === "leader"
            ? "Líder definido!"
            : action === "collaborator"
              ? "Voluntário definido como colaborador"
              : "Voluntário adicionado!",
        "success",
      );
      await loadMinistries();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro de sincronização",
        "error",
      );
    }
  }

  function renderMembers(ministry: WpMinistry): string {
    const members = users.filter((user) => membershipFor(user, ministry.id));

    if (members.length === 0) {
      return '<span class="text-[10px] text-gray-400 italic">Sem membros ativos</span>';
    }

    return members
      .map((member) => {
        const membership = membershipFor(member, ministry.id);
        const isLeader = membership?.role === "lider";
        return `
          <div class="group/member flex items-center gap-1 bg-gray-50 dark:bg-slate-900 pl-3 pr-1 py-1 rounded-full border border-gray-100 dark:border-slate-700">
            <div class="w-4 h-4 rounded-full ${isLeader ? "bg-amber-600" : "bg-indigo-600"} text-[8px] flex items-center justify-center text-white font-bold shrink-0">
              ${isLeader ? '<i class="fa-solid fa-crown"></i>' : escapeHtml(member.name[0])}
            </div>
            <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 mr-1">
              ${escapeHtml(member.name.split(" ")[0])}
            </span>
            ${
              canManageAll
                ? `
                  <button aria-label="${isLeader ? "Tornar colaborador" : "Tornar líder"}" class="role-member-btn w-5 h-5 flex items-center justify-center rounded-full bg-transparent hover:bg-amber-100 dark:hover:bg-amber-900/40 text-gray-400 lg:text-transparent lg:group-hover/member:text-amber-600 transition-all" data-uid="${member.id}" data-mid="${ministry.id}" data-role="${isLeader ? "collaborator" : "leader"}" title="${isLeader ? "Tornar colaborador" : "Tornar líder"}">
                    <i class="fa-solid ${isLeader ? "fa-user" : "fa-crown"} text-[9px]"></i>
                  </button>
                `
                : ""
            }
            <button aria-label="Remover ${escapeAttribute(member.name)}" class="remove-member-btn w-5 h-5 flex items-center justify-center rounded-full bg-transparent hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 lg:text-transparent lg:group-hover/member:text-red-500 transition-all" data-uid="${member.id}" data-mid="${ministry.id}" data-uname="${escapeAttribute(member.name)}" title="Remover do time">
              <i class="fa-solid fa-xmark text-[10px]"></i>
            </button>
          </div>
        `;
      })
      .join("");
  }

  function renderMinistries(): void {
    if (!list) return;
    loading?.classList.add("hidden");

    if (ministries.length === 0) {
      emptyState?.classList.remove("hidden");
      list.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    list.innerHTML = ministries
      .map(
        (ministry) => `
          <div class="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group animate-slide-up ${ministry.arquivado ? "opacity-75" : ""}">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xl overflow-hidden shadow-inner shrink-0">
                  <i class="fa-solid ${ministry.tipo === "livraria" ? "fa-book" : "fa-users"}"></i>
                </div>
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-xl">${escapeHtml(ministry.title.rendered)}</h3>
                    ${ministry.arquivado ? '<span class="text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">Arquivado</span>' : ""}
                  </div>
                  <p class="text-[9px] uppercase font-black text-gray-500 tracking-widest mt-1">${escapeHtml(ministry.tipo || "geral")}</p>
                  ${ministry.descricao ? `<p class="text-[11px] text-gray-500 dark:text-gray-400 mt-2 max-w-xl">${escapeHtml(ministry.descricao)}</p>` : ""}
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button aria-label="Editar ministério ${escapeAttribute(ministry.title.rendered)}" class="edit-min-btn w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-[var(--color-brand)] transition-all" data-id="${ministry.id}">
                  <i class="fa-solid fa-pen"></i>
                </button>
                ${
                  canManageAll
                    ? `
                      <button aria-label="${ministry.arquivado ? "Reativar" : "Arquivar"} ministério ${escapeAttribute(ministry.title.rendered)}" class="archive-min-btn w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-amber-600 transition-all" data-id="${ministry.id}" data-archived="${ministry.arquivado ? "1" : "0"}">
                        <i class="fa-solid ${ministry.arquivado ? "fa-rotate-left" : "fa-box-archive"}"></i>
                      </button>
                    `
                    : ""
                }
              </div>
            </div>

            <div class="flex flex-wrap gap-2 items-center">
              <span class="text-[9px] uppercase font-black text-gray-500 tracking-widest mr-2">Equipe:</span>
              ${renderMembers(ministry)}
              <button aria-label="Adicionar voluntário" class="add-member-btn ml-2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-[var(--color-brand)] hover:text-white transition-all shadow-sm" data-mid="${ministry.id}" title="Adicionar Voluntário">
                <i class="fa-solid fa-plus text-[10px]"></i>
              </button>
            </div>
          </div>
        `,
      )
      .join("");

    document
      .querySelectorAll<HTMLButtonElement>(".edit-min-btn")
      .forEach((button) => {
        button.onclick = () => {
          const id = Number(button.getAttribute("data-id"));
          const ministry = ministries.find((item) => item.id === id);
          if (ministry) openForm(ministry);
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".archive-min-btn")
      .forEach((button) => {
        button.onclick = () => {
          const id = Number(button.getAttribute("data-id"));
          const ministry = ministries.find((item) => item.id === id);
          if (ministry) void toggleArchive(ministry);
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".remove-member-btn")
      .forEach((button) => {
        button.onclick = () => {
          const userId = button.getAttribute("data-uid");
          const ministryId = button.getAttribute("data-mid");
          const userName = button.getAttribute("data-uname");
          if (confirm(`Remover ${userName} deste ministério?`)) {
            void updateMembership({
              userId: userId || "",
              ministryId: ministryId || "",
              action: "remove",
            });
          }
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".role-member-btn")
      .forEach((button) => {
        button.onclick = () => {
          const role = button.getAttribute("data-role");
          void updateMembership({
            userId: button.getAttribute("data-uid") || "",
            ministryId: button.getAttribute("data-mid") || "",
            action: role === "leader" ? "leader" : "collaborator",
          });
        };
      });

    document
      .querySelectorAll<HTMLButtonElement>(".add-member-btn")
      .forEach((button) => {
        button.onclick = () => {
          const ministryId = Number(button.getAttribute("data-mid"));
          const ministry = ministries.find((item) => item.id === ministryId);
          if (ministry) openMemberModal(ministry);
        };
      });
  }

  async function loadMinistries(): Promise<void> {
    loading?.classList.remove("hidden");
    emptyState?.classList.add("hidden");

    try {
      await loadUsers();
      const response = await apiFetch("/wp-json/1ipim/v1/ministries?manage=1");
      if (!response.ok) throw new Error("Falha ao carregar ministérios");
      ministries = await response.json();
      renderMinistries();
    } catch {
      if (loading) loading.innerText = "Erro ao carregar estrutura.";
      showToast("Erro de conexão", "error");
    }
  }

  function setFormFieldVisibility(): void {
    typeField?.classList.toggle("hidden", !canManageAll);
    leaderField?.classList.toggle("hidden", !canManageAll);
    archivedField?.classList.toggle("hidden", !canManageAll);
  }

  function openForm(ministry: WpMinistry | null): void {
    editingId = ministry?.id || 0;
    formColumn?.classList.remove("hidden");
    setFormFieldVisibility();

    if (formTitle) {
      formTitle.innerHTML = `<i class="fa-solid ${ministry ? "fa-pen" : "fa-plus"} text-[var(--color-brand)]"></i> ${ministry ? "Editar Ministério" : "Novo Ministério"}`;
    }
    if (submitLabel)
      submitLabel.innerText = ministry
        ? "Salvar Alterações"
        : "Criar Ministério";
    if (idInput) idInput.value = ministry ? String(ministry.id) : "";
    if (titleInput) titleInput.value = ministry?.title.rendered || "";
    if (typeInput) typeInput.value = ministry?.tipo || "geral";
    if (descriptionInput) descriptionInput.value = ministry?.descricao || "";
    if (archivedInput) archivedInput.checked = Boolean(ministry?.arquivado);
    if (leaderInput) leaderInput.value = "";

    cancelEdit?.classList.toggle("hidden", !ministry && !canManageAll);
    formColumn?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm(): void {
    editingId = 0;
    form?.reset();
    if (idInput) idInput.value = "";
    if (typeInput) typeInput.value = "geral";
    if (archivedInput) archivedInput.checked = false;
    if (submitLabel) submitLabel.innerText = "Criar Ministério";
    if (formTitle) {
      formTitle.innerHTML =
        '<i class="fa-solid fa-plus text-[var(--color-brand)]"></i> Novo Ministério';
    }
    cancelEdit?.classList.add("hidden");
    if (!canManageAll) formColumn?.classList.add("hidden");
  }

  async function toggleArchive(ministry: WpMinistry): Promise<void> {
    const next = !ministry.arquivado;
    if (
      !confirm(
        next
          ? `Arquivar "${ministry.title.rendered}"? Ele deixa de aparecer no catálogo público e nas seleções.`
          : `Reativar "${ministry.title.rendered}"?`,
      )
    ) {
      return;
    }

    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/ministries/${ministry.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ arquivado: next }),
        },
      );
      if (!response.ok) throw new Error("Falha ao atualizar ministério");
      showToast(
        next ? "Ministério arquivado" : "Ministério reativado",
        "success",
      );
      await loadMinistries();
    } catch {
      showToast("Erro ao atualizar ministério", "error");
    }
  }

  function renderMemberOptions(): void {
    if (!memberUser) return;
    const query = (memberSearch?.value || "").toLowerCase().trim();
    const ministry = ministries.find((item) => item.id === memberMinistryId);
    const candidates = users.filter((user) => {
      if (!ministry) return false;
      if (membershipFor(user, ministry.id)) return false;
      if (!query) return true;
      return `${user.name} ${user.email}`.toLowerCase().includes(query);
    });

    memberUser.innerHTML =
      '<option value="">Selecione...</option>' +
      candidates
        .map(
          (user) =>
            `<option value="${user.id}">${escapeHtml(user.name)} — ${escapeHtml(user.email)}</option>`,
        )
        .join("");
  }

  function openMemberModal(ministry: WpMinistry): void {
    memberMinistryId = ministry.id;
    if (memberModalTitle)
      memberModalTitle.innerText = `Adicionar em ${ministry.title.rendered}`;
    if (memberSearch) memberSearch.value = "";
    if (memberRole) memberRole.value = "colaborador";
    memberRoleField?.classList.toggle("hidden", !canManageAll);
    memberFeedback?.classList.add("hidden");
    renderMemberOptions();
    memberModal?.classList.remove("hidden");
  }

  function closeMemberModal(): void {
    memberModal?.classList.add("hidden");
    memberMinistryId = 0;
  }

  async function saveMember(): Promise<void> {
    if (!memberUser || memberMinistryId <= 0) return;
    const userId = memberUser.value;
    const role = canManageAll
      ? memberRole?.value || "colaborador"
      : "colaborador";
    if (!userId) {
      showMemberFeedback("Selecione um voluntário.", true);
      return;
    }

    if (memberSave) memberSave.disabled = true;
    try {
      const response = await apiFetch(
        `/wp-json/1ipim/v1/ministries/${memberMinistryId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: Number(userId), role }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Falha ao adicionar voluntário");
      }
      showToast("Voluntário adicionado!", "success");
      closeMemberModal();
      await loadMinistries();
    } catch (error) {
      showMemberFeedback(
        error instanceof Error ? error.message : "Erro ao adicionar voluntário",
        true,
      );
    } finally {
      if (memberSave) memberSave.disabled = false;
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton) submitButton.disabled = true;
    submitLoader?.classList.remove("hidden");
    if (submitLabel) submitLabel.innerText = "Salvando...";

    const payload: Record<string, unknown> = {
      title: titleInput?.value.trim() || "",
      descricao: descriptionInput?.value.trim() || "",
    };
    if (canManageAll) {
      payload.tipo = typeInput?.value || "geral";
      payload.leader_id = leaderInput?.value ? Number(leaderInput.value) : 0;
      payload.arquivado = Boolean(archivedInput?.checked);
    }

    try {
      const response = await apiFetch(
        editingId > 0
          ? `/wp-json/1ipim/v1/ministries/${editingId}`
          : "/wp-json/1ipim/v1/ministries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || "Falha ao salvar ministério");
      }
      showToast(
        editingId ? "Ministério atualizado!" : "Ministério criado!",
        "success",
      );
      resetForm();
      await loadMinistries();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar ministério",
        "error",
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
      submitLoader?.classList.add("hidden");
      if (submitLabel)
        submitLabel.innerText = editingId
          ? "Salvar Alterações"
          : "Criar Ministério";
    }
  });

  cancelEdit?.addEventListener("click", resetForm);
  document
    .getElementById("member-modal-close")
    ?.addEventListener("click", closeMemberModal);
  document
    .getElementById("member-cancel")
    ?.addEventListener("click", closeMemberModal);
  memberModal?.addEventListener("click", (event) => {
    if (event.target === memberModal) closeMemberModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMemberModal();
  });
  memberSearch?.addEventListener("input", renderMemberOptions);
  memberSave?.addEventListener("click", () => {
    void saveMember();
  });

  await loadMinistries();
});
