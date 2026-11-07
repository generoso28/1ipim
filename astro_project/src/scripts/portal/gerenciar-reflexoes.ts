import { apiFetch } from "./api";
import { escapeAttribute, escapeHtml, showToast, onPageReady } from "./ui";
import type { WpPost } from "./types";

onPageReady("#posts-table-body", () => {
  const tableBody = document.getElementById("posts-table-body");
  const loading = document.getElementById("loading-posts");
  const emptyState = document.getElementById("no-posts");
  const searchInput = document.getElementById(
    "posts-search",
  ) as HTMLInputElement | null;
  const pageInfo = document.getElementById("posts-page-info");
  const prevButton = document.getElementById(
    "posts-prev",
  ) as HTMLButtonElement | null;
  const nextButton = document.getElementById(
    "posts-next",
  ) as HTMLButtonElement | null;
  const previewModal = document.getElementById("post-preview-modal");
  const previewTitle = document.getElementById("preview-title");
  const previewContent = document.getElementById("preview-content");

  let activeFilter = "publish";
  let query = "";
  let page = 1;
  let pages = 1;
  let total = 0;
  let posts: WpPost[] = [];
  let categoryId: number | null = null;

  async function loadCategory(): Promise<void> {
    try {
      const response = await apiFetch(
        "/wp-json/wp/v2/categories/?slug=reflexoes",
      );
      const categories = await response.json();
      categoryId =
        Array.isArray(categories) && categories.length > 0
          ? categories[0].id
          : null;
    } catch {
      categoryId = null;
    }
  }

  function statusLabel(): string {
    if (activeFilter === "trash") return "Na lixeira";
    if (activeFilter === "draft") return "Rascunho";
    return "Publicado";
  }

  function renderPostRow(post: WpPost): string {
    const date = new Date(
      post.date || post.modified || Date.now(),
    ).toLocaleDateString("pt-BR");
    const isTrash = activeFilter === "trash";
    const isDraft = activeFilter === "draft";

    const previewButton = `<button aria-label="Visualizar reflexão" class="preview-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] text-gray-500 hover:text-[var(--color-brand)] rounded-xl transition-all shadow-sm" data-id="${post.id}" title="Visualizar">
      <i class="fa-solid fa-eye"></i>
    </button>`;

    const editButton = `<a href="/portal/editar-reflexao?id=${post.id}" aria-label="Editar mensagem" class="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] text-gray-500 hover:text-[var(--color-brand)] rounded-xl transition-all shadow-sm" title="Editar Mensagem">
      <i class="fa-solid fa-pen-to-square"></i>
    </a>`;

    const publishButton = `<button aria-label="Publicar reflexão" class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-green-600 text-gray-500 hover:text-green-700 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="publish" title="Publicar">
      <i class="fa-solid fa-upload"></i>
    </button>`;

    const trashButton = `<button aria-label="Enviar para a lixeira" class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-orange-600 text-gray-500 hover:text-orange-700 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="trash" title="Enviar para Lixeira">
      <i class="fa-solid fa-trash-can"></i>
    </button>`;

    const restoreButton = `<button aria-label="Restaurar como rascunho" class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-green-600 text-gray-500 hover:text-green-700 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="restore" title="Restaurar como rascunho">
      <i class="fa-solid fa-rotate-left"></i>
    </button>`;

    const deleteButton = `<button aria-label="Excluir permanentemente" class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-red-700 text-gray-500 hover:text-red-700 rounded-xl transition-all shadow-sm" data-id="${post.id}" data-action="delete" title="Excluir Permanentemente">
      <i class="fa-solid fa-xmark"></i>
    </button>`;

    return `
      <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group">
        <td class="px-8 py-6">
          <div class="font-bold text-gray-900 dark:text-white truncate max-w-md uppercase tracking-tight ${isTrash ? "line-through opacity-70" : ""}">${escapeHtml(post.title?.raw || post.title?.rendered || "(Sem Título)")}</div>
          <div class="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">ID: ${post.id} • ${statusLabel()}</div>
        </td>
        <td class="px-8 py-6 text-center">
          <span class="bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 dark:border-slate-700/50">
            ${date}
          </span>
        </td>
        <td class="px-8 py-6 text-right">
          <div class="flex items-center justify-end gap-2">
            ${previewButton}
            ${isTrash ? `${restoreButton}${deleteButton}` : `${editButton}${isDraft ? publishButton : ""}${trashButton}`}
          </div>
        </td>
      </tr>
    `;
  }

  function renderPosts(): void {
    if (!tableBody) return;
    if (posts.length === 0) {
      tableBody.innerHTML = "";
      emptyState?.classList.remove("hidden");
    } else {
      emptyState?.classList.add("hidden");
      tableBody.innerHTML = posts.map(renderPostRow).join("");
      attachActions();
    }

    if (pageInfo) {
      pageInfo.innerText = `Página ${page} de ${pages} · ${total} reflexões`;
    }
    if (prevButton) prevButton.disabled = page <= 1;
    if (nextButton) nextButton.disabled = page >= pages;
  }

  function attachActions(): void {
    document
      .querySelectorAll<HTMLButtonElement>(".preview-post-btn")
      .forEach((button) => {
        button.onclick = () => {
          const id = Number(button.getAttribute("data-id"));
          const post = posts.find((item) => item.id === id);
          if (post) openPreview(post);
        };
      });

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
            void setPostStatus(postId, "trash");
          } else if (
            action === "publish" &&
            confirm("Publicar esta reflexão no site?")
          ) {
            void setPostStatus(postId, "publish");
          } else if (
            action === "restore" &&
            confirm("Restaurar esta reflexão como rascunho?")
          ) {
            void setPostStatus(postId, "draft");
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
  }

  function openPreview(post: WpPost): void {
    if (!previewModal || !previewTitle || !previewContent) return;
    previewTitle.innerText =
      post.title?.raw || post.title?.rendered || "(Sem título)";
    previewContent.innerHTML =
      post.content?.raw || post.content?.rendered || "<p>Sem conteúdo.</p>";
    previewModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closePreview(): void {
    previewModal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  async function setPostStatus(postId: string, status: string): Promise<void> {
    if (!postId) return;
    try {
      const response = await apiFetch(`/wp-json/wp/v2/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar post");
      showToast(
        status === "trash"
          ? "Movido para a lixeira"
          : status === "publish"
            ? "Publicado no site"
            : "Restaurado como rascunho",
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
      showToast("Reflexão excluída permanentemente", "success");
      await loadPosts();
    } catch {
      showToast("Erro ao excluir reflexão", "error");
    }
  }

  async function loadPosts(): Promise<void> {
    loading?.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    if (tableBody) tableBody.innerHTML = "";

    const params = new URLSearchParams({
      _embed: "1",
      per_page: "20",
      page: String(page),
      status: activeFilter,
      context: "edit",
    });
    if (query) params.set("search", query);
    if (categoryId) params.set("categories", String(categoryId));

    try {
      const response = await apiFetch(
        `/wp-json/wp/v2/posts/?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar postagens");
      const data = (await response.json()) as WpPost[];
      posts = Array.isArray(data) ? data : [];
      total = Number(response.headers.get("X-WP-Total") || posts.length);
      pages = Math.max(1, Number(response.headers.get("X-WP-TotalPages") || 1));
      loading?.classList.add("hidden");
      renderPosts();
    } catch {
      loading?.classList.add("hidden");
      if (loading) loading.innerText = "Erro ao carregar postagens.";
      showToast("Erro ao sincronizar posts", "error");
    }
  }

  document.querySelectorAll<HTMLElement>(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll<HTMLElement>(".filter-tab").forEach((item) => {
        item.classList.remove(
          "bg-[var(--color-brand)]",
          "text-white",
          "active",
        );
        item.classList.add(
          "bg-white",
          "dark:bg-slate-800",
          "text-gray-500",
          "dark:text-gray-400",
        );
      });
      tab.classList.remove(
        "bg-white",
        "dark:bg-slate-800",
        "text-gray-500",
        "dark:text-gray-400",
      );
      tab.classList.add("bg-[var(--color-brand)]", "text-white", "active");
      activeFilter = tab.getAttribute("data-filter") || "publish";
      page = 1;
      void loadPosts();
    });
  });

  let timer = 0;
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      query = searchInput.value.trim();
      page = 1;
      void loadPosts();
    }, 350);
  });

  prevButton?.addEventListener("click", () => {
    if (page <= 1) return;
    page--;
    void loadPosts();
  });
  nextButton?.addEventListener("click", () => {
    if (page >= pages) return;
    page++;
    void loadPosts();
  });

  document
    .getElementById("preview-close")
    ?.addEventListener("click", closePreview);
  previewModal?.addEventListener("click", (event) => {
    if (event.target === previewModal) closePreview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePreview();
  });

  void (async () => {
    await loadCategory();
    await loadPosts();
  })();
});
