import { apiFetch } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { escapeAttribute, escapeHtml, onPageReady, showToast } from "./ui";

interface Book {
  id: number;
  slug: string;
  titulo: string;
  subtitulo?: string;
  autor?: string;
  editora?: string;
  categoria?: string;
  isbn?: string;
  sinopse?: string;
  capa?: string;
  preco_dinheiro?: number | null;
  preco_cartao?: number | null;
  preco_capa?: number | null;
  estoque?: number;
  estoque_minimo?: number;
  ativo?: boolean;
  destaque?: boolean;
  legacy_code?: string;
}

interface BookList {
  items: Book[];
  total: number;
  page: number;
  pages: number;
  categorias: string[];
  stats?: {
    total: number;
    ativos: number;
    com_capa: number;
    estoque: number;
  };
}

interface CoverResult {
  titulo: string;
  autores: string;
  editora: string;
  ano: string;
  capa: string;
  fonte: string;
}

const PLACEHOLDER = "/assets/img/livraria/placeholder.svg";
const API = "/wp-json/1ipim/v1";
const PER_PAGE = 30;

const money = (value?: number | null): string =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

const cover = (book: Book): string => {
  if (!book.capa) return PLACEHOLDER;
  if (book.capa.startsWith("http") || book.capa.startsWith("/")) {
    return book.capa;
  }
  return `/${book.capa}`;
};

onPageReady("#livraria-manager", async () => {
  const session = (await auth.ensureSession()) ?? auth.getUser();
  const permissions = getPermissions(session);

  if (!permissions.canLivraria) {
    window.location.href = "/portal/";
    return;
  }

  const loading = document.getElementById("livraria-loading");
  const errorBox = document.getElementById("livraria-error");
  const empty = document.getElementById("livraria-empty");
  const list = document.getElementById("livraria-list");
  const tableBody = document.getElementById("livraria-table-body");
  const statsBox = document.getElementById("livraria-stats");
  const searchInput = document.getElementById(
    "livraria-search",
  ) as HTMLInputElement | null;
  const categorySelect = document.getElementById(
    "livraria-category",
  ) as HTMLSelectElement | null;
  const pageInfo = document.getElementById("livraria-page-info");
  const prevButton = document.getElementById(
    "livraria-prev",
  ) as HTMLButtonElement | null;
  const nextButton = document.getElementById(
    "livraria-next",
  ) as HTMLButtonElement | null;
  const newButton = document.getElementById("livraria-new-btn");
  const modal = document.getElementById("book-modal");
  const modalTitle = document.getElementById("book-modal-title");
  const form = document.getElementById("book-form") as HTMLFormElement | null;
  const feedback = document.getElementById("book-feedback");
  const saveButton = document.getElementById(
    "book-save",
  ) as HTMLButtonElement | null;
  const deleteButton = document.getElementById(
    "book-delete",
  ) as HTMLButtonElement | null;
  const coverPreview = document.getElementById("book-cover-preview");
  const coverFile = document.getElementById(
    "book-cover-file",
  ) as HTMLInputElement | null;
  const coverUrlInput = document.getElementById(
    "book-cover-url",
  ) as HTMLInputElement | null;
  const coverSearchButton = document.getElementById(
    "book-cover-search-btn",
  ) as HTMLButtonElement | null;
  const coverResults = document.getElementById("cover-results");
  const categoryOptions = document.getElementById("book-category-options");

  const state: {
    page: number;
    pages: number;
    total: number;
    q: string;
    categoria: string;
    items: Book[];
    categories: string[];
    stats?: BookList["stats"];
    editing: Book | null;
    selectedCover: string;
  } = {
    page: 1,
    pages: 1,
    total: 0,
    q: "",
    categoria: "",
    items: [],
    categories: [],
    editing: null,
    selectedCover: "",
  };

  const field = <T extends HTMLElement>(id: string): T | null =>
    document.getElementById(id) as T | null;

  function setFeedback(message: string, type: "error" | "success"): void {
    if (!feedback) return;
    feedback.innerText = message;
    feedback.className =
      type === "error"
        ? "p-4 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        : "p-4 rounded-xl text-sm font-bold bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400";
    feedback.classList.remove("hidden");
  }

  function clearFeedback(): void {
    feedback?.classList.add("hidden");
  }

  function renderStats(): void {
    if (!statsBox) return;
    const stats = state.stats;
    if (!stats) {
      statsBox.innerHTML = "";
      return;
    }

    const cards = [
      ["Livros", stats.total, "fa-book"],
      ["Ativos", stats.ativos, "fa-circle-check"],
      ["Com capa", stats.com_capa, "fa-image"],
      ["Estoque", stats.estoque, "fa-boxes-stacked"],
    ];

    statsBox.innerHTML = cards
      .map(
        ([label, value, icon]) => `
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">${escapeHtml(label)}</span>
              <i class="fa-solid ${escapeAttribute(icon)} text-[var(--color-brand)]"></i>
            </div>
            <p class="text-2xl font-black text-gray-900 dark:text-white">${escapeHtml(value)}</p>
          </div>
        `,
      )
      .join("");
  }

  function renderCategories(): void {
    if (categorySelect) {
      const current = state.categoria;
      categorySelect.innerHTML =
        '<option value="">Todas as categorias</option>' +
        state.categories
          .map(
            (category) =>
              `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`,
          )
          .join("");
      categorySelect.value = current;
    }

    if (categoryOptions) {
      categoryOptions.innerHTML = state.categories
        .map(
          (category) =>
            `<option value="${escapeAttribute(category)}"></option>`,
        )
        .join("");
    }
  }

  function renderBooks(): void {
    if (!tableBody || !list) return;

    if (state.items.length === 0) {
      list.classList.add("hidden");
      empty?.classList.remove("hidden");
      return;
    }

    empty?.classList.add("hidden");
    list.classList.remove("hidden");

    tableBody.innerHTML = state.items
      .map((book) => {
        const stock = book.estoque ?? 0;
        const low = stock <= (book.estoque_minimo ?? 0);
        return `
          <tr class="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/60 dark:hover:bg-slate-700/20 transition-colors">
            <td class="px-6 py-4">
              <div class="flex items-center gap-4">
                <div class="w-12 h-16 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <img src="${escapeAttribute(cover(book))}" alt="" loading="lazy" class="w-full h-full object-cover">
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-gray-900 dark:text-white text-sm leading-tight">${escapeHtml(book.titulo)}</p>
                  <p class="text-[11px] text-gray-400 mt-1">${escapeHtml(book.autor || "Autor não informado")}${book.editora ? ` · ${escapeHtml(book.editora)}` : ""}</p>
                  ${book.legacy_code ? `<p class="text-[9px] text-gray-300 mt-1">Cód. ${escapeHtml(book.legacy_code)}</p>` : ""}
                </div>
              </div>
            </td>
            <td class="px-4 py-4">
              <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400">${escapeHtml(book.categoria || "—")}</span>
            </td>
            <td class="px-4 py-4">
              <p class="text-[11px] font-bold text-gray-700 dark:text-gray-300">${money(book.preco_dinheiro)} <span class="text-gray-400 font-normal">dinheiro</span></p>
              <p class="text-[11px] text-gray-400">${money(book.preco_cartao)} cartão</p>
            </td>
            <td class="px-4 py-4 text-center">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${low ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"}">
                ${stock}
              </span>
            </td>
            <td class="px-4 py-4 text-center">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${book.ativo ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300"}">
                ${book.ativo ? "Ativo" : "Inativo"}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button type="button" aria-label="Editar ${escapeAttribute(book.titulo)}" class="edit-book-btn w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-[var(--color-brand)] transition-colors" data-id="${book.id}" title="Editar">
                <i class="fa-solid fa-pen"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    document
      .querySelectorAll<HTMLButtonElement>(".edit-book-btn")
      .forEach((button) => {
        button.onclick = () => {
          const id = Number(button.getAttribute("data-id"));
          const book = state.items.find((item) => item.id === id);
          if (book) openModal(book);
        };
      });

    if (pageInfo) {
      pageInfo.innerText = `Página ${state.page} de ${state.pages} · ${state.total} livros`;
    }
    if (prevButton) prevButton.disabled = state.page <= 1;
    if (nextButton) nextButton.disabled = state.page >= state.pages;
  }

  async function loadBooks(): Promise<void> {
    loading?.classList.remove("hidden");
    errorBox?.classList.add("hidden");
    empty?.classList.add("hidden");
    list?.classList.add("hidden");

    const params = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(state.page),
    });
    if (state.q) params.set("q", state.q);
    if (state.categoria) params.set("categoria", state.categoria);

    try {
      const response = await apiFetch(
        `${API}/admin/livros?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar o catálogo.");
      const data = (await response.json()) as BookList;
      state.items = data.items || [];
      state.total = data.total || 0;
      state.pages = Math.max(1, data.pages || 1);
      state.categories = data.categorias || [];
      state.stats = data.stats;
      renderStats();
      renderCategories();
      renderBooks();
    } catch (error) {
      if (errorBox) {
        errorBox.innerText =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o catálogo.";
        errorBox.classList.remove("hidden");
      }
    } finally {
      loading?.classList.add("hidden");
    }
  }

  function renderCoverPreview(url: string): void {
    if (!coverPreview) return;
    coverPreview.innerHTML = url
      ? `<img src="${escapeAttribute(url)}" alt="Prévia da capa" class="w-full h-full object-cover">`
      : '<i class="fa-solid fa-book-open text-4xl"></i>';
  }

  function setCoverPreview(url: string): void {
    state.selectedCover = url === PLACEHOLDER ? "" : url;
    if (coverUrlInput) coverUrlInput.value = state.selectedCover;
    renderCoverPreview(url || PLACEHOLDER);
  }

  function fillForm(book: Book | null): void {
    state.editing = book;
    if (modalTitle) modalTitle.innerText = book ? "Editar livro" : "Novo livro";
    if (deleteButton) deleteButton.classList.toggle("hidden", !book);

    const values: Array<[string, string]> = [
      ["book-id", book ? String(book.id) : ""],
      ["book-title", book?.titulo || ""],
      ["book-subtitle", book?.subtitulo || ""],
      ["book-author", book?.autor || ""],
      ["book-publisher", book?.editora || ""],
      ["book-category", book?.categoria || ""],
      ["book-isbn", book?.isbn || ""],
      [
        "book-cash",
        book?.preco_dinheiro != null ? String(book.preco_dinheiro) : "",
      ],
      [
        "book-card",
        book?.preco_cartao != null ? String(book.preco_cartao) : "",
      ],
      [
        "book-cover-price",
        book?.preco_capa != null ? String(book.preco_capa) : "",
      ],
      ["book-stock", String(book?.estoque ?? 0)],
      ["book-min-stock", String(book?.estoque_minimo ?? 0)],
      ["book-synopsis", book?.sinopse || ""],
    ];
    values.forEach(([id, value]) => {
      const input = field<HTMLInputElement | HTMLTextAreaElement>(id);
      if (input) input.value = value;
    });

    const active = field<HTMLInputElement>("book-active");
    const featured = field<HTMLInputElement>("book-featured");
    if (active) active.checked = book ? Boolean(book.ativo) : true;
    if (featured) featured.checked = Boolean(book?.destaque);
    if (coverFile) coverFile.value = "";
    if (coverResults) coverResults.innerHTML = "";
    clearFeedback();
    setCoverPreview(book?.capa || "");
  }

  function openModal(book: Book | null): void {
    fillForm(book);
    modal?.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    window.setTimeout(() => field<HTMLInputElement>("book-title")?.focus(), 80);
  }

  function closeModal(): void {
    modal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function readForm(): Record<string, unknown> {
    const value = (id: string): string =>
      field<HTMLInputElement | HTMLTextAreaElement>(id)?.value.trim() || "";

    return {
      titulo: value("book-title"),
      subtitulo: value("book-subtitle"),
      autor: value("book-author"),
      editora: value("book-publisher"),
      categoria: value("book-category"),
      isbn: value("book-isbn"),
      sinopse: value("book-synopsis"),
      preco_dinheiro: value("book-cash") || null,
      preco_cartao: value("book-card") || null,
      preco_capa: value("book-cover-price") || null,
      estoque: Number(value("book-stock") || 0),
      estoque_minimo: Number(value("book-min-stock") || 0),
      ativo: field<HTMLInputElement>("book-active")?.checked ?? true,
      destaque: field<HTMLInputElement>("book-featured")?.checked ?? false,
      capa_url: state.selectedCover,
    };
  }

  async function uploadCover(bookId: number, file: File): Promise<boolean> {
    const formData = new FormData();
    formData.append("capa", file);
    const response = await apiFetch(`${API}/admin/livros/${bookId}/capa`, {
      method: "POST",
      body: formData,
    });
    return response.ok;
  }

  async function saveBook(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!form) return;
    clearFeedback();

    const payload = readForm();
    if (!payload.titulo) {
      setFeedback("Informe o título do livro.", "error");
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.innerText = "Salvando...";
    }

    try {
      const id = state.editing?.id;
      const response = await apiFetch(
        id ? `${API}/admin/livros/${id}` : `${API}/admin/livros`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const saved = (await response.json().catch(() => ({}))) as Book & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(saved.message || "Não foi possível salvar o livro.");
      }

      if (coverFile?.files?.[0] && saved.id) {
        const uploaded = await uploadCover(saved.id, coverFile.files[0]);
        if (!uploaded) {
          showToast("Livro salvo, mas a capa não foi enviada.", "error");
        }
      }

      showToast(id ? "Livro atualizado!" : "Livro cadastrado!", "success");
      closeModal();
      await loadBooks();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao salvar o livro.",
        "error",
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerText = "Salvar livro";
      }
    }
  }

  async function deleteBook(): Promise<void> {
    const id = state.editing?.id;
    if (!id) return;
    if (
      !confirm(
        "Excluir este livro permanentemente? O histórico de auditoria será mantido.",
      )
    ) {
      return;
    }

    try {
      const response = await apiFetch(`${API}/admin/livros/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Não foi possível excluir o livro.");
      showToast("Livro excluído", "success");
      closeModal();
      await loadBooks();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao excluir o livro.",
        "error",
      );
    }
  }

  async function searchCovers(): Promise<void> {
    const title = field<HTMLInputElement>("book-title")?.value.trim() || "";
    const author = field<HTMLInputElement>("book-author")?.value.trim() || "";
    const query = [title, author].filter(Boolean).join(" ");
    if (!query) {
      showToast("Preencha o título ou o autor para buscar capas.", "error");
      return;
    }
    if (coverSearchButton) {
      coverSearchButton.disabled = true;
      coverSearchButton.innerText = "Buscando...";
    }

    try {
      const response = await apiFetch(
        `${API}/admin/livros/capas?q=${encodeURIComponent(query)}`,
      );
      const results = (await response.json().catch(() => [])) as CoverResult[];
      if (!coverResults) return;

      if (!Array.isArray(results) || results.length === 0) {
        coverResults.innerHTML =
          '<p class="col-span-3 text-[11px] text-gray-400 text-center py-2">Nenhuma capa encontrada.</p>';
        return;
      }

      coverResults.innerHTML = results
        .map(
          (result) => `
            <button type="button" class="cover-result group text-left" data-url="${escapeAttribute(result.capa)}">
              <div class="aspect-[3/4] rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 group-hover:ring-2 group-hover:ring-[var(--color-brand)] transition-all">
                <img src="${escapeAttribute(result.capa)}" alt="" loading="lazy" class="w-full h-full object-cover">
              </div>
              <p class="text-[9px] font-bold text-gray-500 mt-1 line-clamp-2">${escapeHtml(result.fonte)}</p>
            </button>
          `,
        )
        .join("");

      coverResults
        .querySelectorAll<HTMLButtonElement>(".cover-result")
        .forEach((button) => {
          button.onclick = () => {
            const url = button.getAttribute("data-url") || "";
            setCoverPreview(url);
            showToast("Capa selecionada. Salve o livro para baixá-la.", "info");
          };
        });
    } catch {
      showToast("Erro ao buscar capas.", "error");
    } finally {
      if (coverSearchButton) {
        coverSearchButton.disabled = false;
        coverSearchButton.innerHTML =
          '<i class="fa-solid fa-magnifying-glass mr-1"></i> Buscar capa';
      }
    }
  }

  let searchTimer = 0;
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.q = searchInput.value.trim();
      state.page = 1;
      void loadBooks();
    }, 350);
  });

  categorySelect?.addEventListener("change", () => {
    state.categoria = categorySelect.value;
    state.page = 1;
    void loadBooks();
  });

  prevButton?.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page--;
    void loadBooks();
  });

  nextButton?.addEventListener("click", () => {
    if (state.page >= state.pages) return;
    state.page++;
    void loadBooks();
  });

  newButton?.addEventListener("click", () => openModal(null));
  document
    .getElementById("book-modal-close")
    ?.addEventListener("click", closeModal);
  document.getElementById("book-cancel")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal?.classList.contains("hidden")) {
      closeModal();
    }
  });

  form?.addEventListener("submit", (event) => {
    void saveBook(event);
  });
  deleteButton?.addEventListener("click", () => {
    void deleteBook();
  });
  coverSearchButton?.addEventListener("click", () => {
    void searchCovers();
  });
  coverFile?.addEventListener("change", () => {
    const file = coverFile.files?.[0];
    if (!file) return;
    // A imagem será enviada depois de salvar o livro; não gravar blob: no banco.
    state.selectedCover = "";
    if (coverUrlInput) coverUrlInput.value = "";
    renderCoverPreview(URL.createObjectURL(file));
  });

  await loadBooks();
});
