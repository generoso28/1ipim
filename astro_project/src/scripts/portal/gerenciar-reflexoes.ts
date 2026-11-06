import { apiFetch } from "./api";
import { escapeHtml, showToast, onPageReady } from "./ui";
import type { WpPost } from "./types";

onPageReady("#posts-table-body", () => {
  const tableBody = document.getElementById("posts-table-body");
  const loading = document.getElementById("loading-posts");
  const emptyState = document.getElementById("no-posts");
  let activeFilter = "publish";

  async function setPostStatus(postId: string, status: string): Promise<void> {
    if (!postId) return;

    try {
      const response = await apiFetch(`/wp-json/wp/v2/posts/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar post");
      showToast(
        status === "draft"
          ? "Movido para a lixeira"
          : "Restaurado com sucesso!",
        "success",
      );
      await loadPosts();
    } catch {
      showToast("Erro ao atualizar reflexão", "error");
    }
  }

  async function deletePost(postId: string): Promise<void> {
    if (!postId) return;

    try {
      const response = await apiFetch(
        `/wp-json/wp/v2/posts/${postId}/?force=true`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Falha ao excluir post");
      showToast("Reflexão evaporada com sucesso!", "success");
      await loadPosts();
    } catch {
      showToast("Erro ao excluir reflexão", "error");
    }
  }

  function renderPostRow(post: WpPost): string {
    const date = new Date(
      post.date || post.modified || Date.now(),
    ).toLocaleDateString("pt-BR");
    const isDraft = activeFilter === "draft";

    return `
      <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group animate-slide-up">
        <td class="px-8 py-6">
          <div class="font-bold text-gray-900 dark:text-white truncate max-w-md uppercase tracking-tight ${isDraft ? "line-through opacity-70" : ""}">${escapeHtml(post.title.rendered || "(Sem Título)")}</div>
          <div class="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1">ID: ${post.id} ${isDraft ? "• Movido para a lixeira" : ""}</div>
        </td>
        <td class="px-8 py-6 text-center">
          <span class="bg-gray-100 dark:bg-slate-700/50 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 dark:border-slate-700/50">
            ${date}
          </span>
        </td>
        <td class="px-8 py-6 text-right">
          <div class="flex items-center justify-end gap-2">
            ${
              isDraft
                ? `
                  <button class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-green-500 text-gray-400 hover:text-green-500 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="restore" title="Restaurar Publicação">
                    <i class="fa-solid fa-rotate-left"></i>
                  </button>
                  <button class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-red-600 text-gray-400 hover:text-red-600 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="delete" title="Excluir Permanentemente">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                `
                : `
                  <a href="/portal/editar-reflexao?id=${post.id}" class="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] text-gray-400 hover:text-[var(--color-brand)] rounded-xl transition-all shadow-sm" title="Editar Mensagem">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </a>
                  <button class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-orange-500 text-gray-400 hover:text-orange-500 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="trash" title="Enviar para Lixeira">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                `
            }
          </div>
        </td>
      </tr>
    `;
  }

  async function loadPosts(): Promise<void> {
    loading?.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    if (tableBody) tableBody.innerHTML = "";

    try {
      const categoryResponse = await apiFetch(
        "/wp-json/wp/v2/categories/?slug=reflexoes",
      );
      const categories = await categoryResponse.json();
      const categoryId =
        categories && categories.length > 0 ? categories[0].id : null;
      const categoryParam = categoryId ? `&categories=${categoryId}` : "";

      const response = await apiFetch(
        `/wp-json/wp/v2/posts/?_embed&per_page=100&status=${activeFilter}${categoryParam}`,
      );
      const posts = await response.json();

      loading?.classList.add("hidden");

      if (!Array.isArray(posts) || posts.length === 0) {
        emptyState?.classList.remove("hidden");
        return;
      }

      if (tableBody) {
        tableBody.innerHTML = posts.map(renderPostRow).join("");
      }

      document
        .querySelectorAll<HTMLButtonElement>(".delete-post-btn")
        .forEach((button) => {
          button.onclick = () => {
            const postId = button.getAttribute("data-id") || "";
            const action = button.getAttribute("data-action");

            if (
              action === "trash" &&
              confirm("Mover esta reflexão para a lixeira?")
            ) {
              void setPostStatus(postId, "draft");
            } else if (
              action === "restore" &&
              confirm("Restaurar publicação no site agora mesmo?")
            ) {
              void setPostStatus(postId, "publish");
            } else if (
              action === "delete" &&
              confirm(
                "ALERTA: Essa ação apagará do servidor WordPress e não possui volta. Continuar?",
              )
            ) {
              void deletePost(postId);
            }
          };
        });
    } catch {
      if (loading) loading.innerText = "Erro ao carregar postagens.";
      showToast("Erro ao sincronizar posts", "error");
    }
  }

  document.querySelectorAll<HTMLElement>(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll<HTMLElement>(".filter-tab").forEach((item) => {
        item.classList.remove("bg-[var(--color-brand)]", "text-white");
        item.classList.add(
          "bg-white",
          "dark:bg-slate-800",
          "text-gray-500",
          "dark:text-gray-400",
        );
      });

      const current = tab;
      current.classList.remove(
        "bg-white",
        "dark:bg-slate-800",
        "text-gray-500",
        "dark:text-gray-400",
      );
      current.classList.add("bg-[var(--color-brand)]", "text-white");
      activeFilter = current.getAttribute("data-filter") || "publish";
      void loadPosts();
    });
  });

  void loadPosts();
});
