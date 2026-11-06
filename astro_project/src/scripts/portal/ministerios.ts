import { auth } from "./auth";
import { apiFetch } from "./api";
import { escapeAttribute, escapeHtml, showToast } from "./ui";
import type { WpMinistry, WpUser } from "./types";

interface MemberAction {
  userId: string;
  ministryId: string;
  action: "add" | "remove";
}

document.addEventListener("astro:page-load", () => {
  const form = document.getElementById(
    "add-min-form",
  ) as HTMLFormElement | null;
  const list = document.getElementById("min-list");
  const loading = document.getElementById("loading-min");
  const emptyState = document.getElementById("no-min");
  const submitButton = document.getElementById(
    "add-btn",
  ) as HTMLButtonElement | null;
  const submitLabel = document.getElementById("add-text");
  const submitLoader = document.getElementById("add-loader");
  const titleInput = document.getElementById(
    "min-title",
  ) as HTMLInputElement | null;
  const token = auth.getToken();

  let users: WpUser[] = [];

  async function loadUsers(): Promise<void> {
    try {
      const response = await apiFetch(
        "/wp-json/wp/v2/users/?context=edit&per_page=100",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      users = await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  async function updateMembership({
    userId,
    ministryId,
    action,
  }: MemberAction): Promise<void> {
    if (!userId || !ministryId) return;

    const user = users.find((item) => String(item.id) === String(userId));
    if (!user) return;

    let approved: string[] = [];
    try {
      approved = JSON.parse(user.meta?.ministries_approved || "[]");
    } catch {
      approved = [];
    }

    if (action === "add" && !approved.includes(ministryId)) {
      approved.push(ministryId);
    } else if (action === "remove") {
      approved = approved.filter((id) => id !== ministryId);
    } else {
      return;
    }

    try {
      const response = await apiFetch(`/wp-json/wp/v2/users/${userId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          meta: { ministries_approved: JSON.stringify(approved) },
        }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar vínculo");
      showToast(
        action === "add" ? "Voluntário adicionado!" : "Voluntário removido",
        "success",
      );
      await loadMinistries();
    } catch {
      showToast("Erro de sincronização", "error");
    }
  }

  function renderMembers(ministryId: number): string {
    const members = users.filter((user) => {
      try {
        const approved = JSON.parse(user.meta?.ministries_approved || "[]");
        return approved.includes(String(ministryId));
      } catch {
        return false;
      }
    });

    if (members.length === 0) {
      return '<span class="text-[10px] text-gray-300 italic">Sem membros ativos</span>';
    }

    return members
      .map(
        (member) => `
          <div class="group/member flex items-center gap-1 bg-gray-50 dark:bg-slate-900 pl-3 pr-1 py-1 rounded-full border border-gray-100 dark:border-slate-700">
            <div class="w-4 h-4 rounded-full bg-indigo-500 text-[8px] flex items-center justify-center text-white font-bold shrink-0">${escapeHtml(member.name[0])}</div>
            <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 mr-1">
              ${escapeHtml(member.name.split(" ")[0])}
            </span>
            <button class="remove-member-btn w-5 h-5 flex items-center justify-center rounded-full bg-transparent hover:bg-red-100 dark:hover:bg-red-900/40 text-transparent group-hover/member:text-red-500 transition-all ml-auto" data-uid="${member.id}" data-mid="${ministryId}" data-uname="${escapeAttribute(member.name)}" title="Remover do time">
              <i class="fa-solid fa-xmark text-[10px]"></i>
            </button>
          </div>
        `,
      )
      .join("");
  }

  async function loadMinistries(): Promise<void> {
    loading?.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    if (list) list.innerHTML = "";

    try {
      await loadUsers();
      const response = await apiFetch(
        "/wp-json/wp/v2/ministerio/?per_page=100",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const ministries = (await response.json()) as WpMinistry[];

      loading?.classList.add("hidden");

      if (!ministries || ministries.length === 0) {
        emptyState?.classList.remove("hidden");
        return;
      }

      if (list) {
        list.innerHTML = ministries
          .map(
            (ministry) => `
              <div class="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group animate-slide-up">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-500 text-xl overflow-hidden shadow-inner">
                      <i class="fa-solid fa-users"></i>
                    </div>
                    <h3 class="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-xl">${escapeHtml(ministry.title.rendered)}</h3>
                  </div>
                  <button class="delete-min-btn text-gray-200 hover:text-red-500 transition-all p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl" data-id="${ministry.id}">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>

                <div class="flex flex-wrap gap-2 items-center">
                  <span class="text-[9px] uppercase font-black text-gray-400 tracking-widest mr-2">Equipe:</span>
                  ${renderMembers(ministry.id)}
                  <button class="add-member-btn ml-2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-400 hover:bg-[var(--color-brand)] hover:text-white transition-all shadow-sm" data-mid="${ministry.id}" title="Adicionar Voluntário">
                    <i class="fa-solid fa-plus text-[10px]"></i>
                  </button>
                </div>
              </div>
            `,
          )
          .join("");
      }

      document
        .querySelectorAll<HTMLButtonElement>(".delete-min-btn")
        .forEach((button) => {
          button.onclick = async () => {
            if (
              !confirm(
                "Excluir este ministério? Esta ação removerá o vínculo de todos os voluntários.",
              )
            ) {
              return;
            }

            const ministryId = button.getAttribute("data-id");
            try {
              const response = await apiFetch(
                `/wp-json/wp/v2/ministerio/${ministryId}/?force=true`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (!response.ok) throw new Error("Falha ao excluir");
              showToast("Ministério removido", "success");
              await loadMinistries();
            } catch {
              showToast("Erro ao remover ministério", "error");
            }
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
        .querySelectorAll<HTMLButtonElement>(".add-member-btn")
        .forEach((button) => {
          button.onclick = () => {
            const ministryId = button.getAttribute("data-mid") || "";
            const email = prompt(
              "Digite o E-MAIL EXATO do voluntário que deseja adicionar:",
            );
            if (!email) return;

            const user = users.find(
              (item) => item.email.toLowerCase() === email.toLowerCase().trim(),
            );

            if (!user) {
              showToast("Usuário não encontrado por este email.", "error");
              return;
            }

            void updateMembership({
              userId: String(user.id),
              ministryId,
              action: "add",
            });
          };
        });
    } catch {
      if (loading) loading.innerText = "Erro ao carregar estrutura.";
      showToast("Erro de conexão", "error");
    }
  }

  void loadMinistries();

  if (form) {
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (submitButton) submitButton.disabled = true;
      submitLoader?.classList.remove("hidden");
      if (submitLabel) submitLabel.innerText = "Processando...";

      const title = titleInput?.value || "";

      try {
        const response = await apiFetch("/wp-json/wp/v2/ministerio/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, status: "publish" }),
        });

        if (!response.ok) throw new Error("Falha ao criar");
        showToast("Ministério criado!", "success");
        form.reset();
        await loadMinistries();
      } catch {
        showToast("Erro ao criar ministério", "error");
      } finally {
        if (submitButton) submitButton.disabled = false;
        submitLoader?.classList.add("hidden");
        if (submitLabel) submitLabel.innerText = "Criar Ministério";
      }
    };
  }
});
