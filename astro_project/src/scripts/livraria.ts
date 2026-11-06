interface CatalogBook {
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
}

interface CatalogResponse {
  items: CatalogBook[];
  total: number;
  page: number;
  pages: number;
  categorias: string[];
}

const API_BASE = "https://1ipim.online/admin/wp-json/1ipim/v1";
const PLACEHOLDER = "/assets/img/livraria/placeholder.svg";
const PER_PAGE = 24;

const esc = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const money = (value?: number | null): string =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";

const coverUrl = (book: CatalogBook): string => {
  if (!book.capa) return PLACEHOLDER;
  if (book.capa.startsWith("http") || book.capa.startsWith("/")) {
    return book.capa;
  }
  return `/${book.capa}`;
};

const state = {
  page: 1,
  pages: 1,
  total: 0,
  q: "",
  categoria: "",
  items: [] as CatalogBook[],
  categories: [] as string[],
  loading: false,
};

function initCatalog(): void {
  const root = document.getElementById("catalog-grid");
  if (!root || root.dataset.ready === "1") return;
  root.dataset.ready = "1";

  const grid = root;
  const search = document.getElementById(
    "catalog-search",
  ) as HTMLInputElement | null;
  const category = document.getElementById(
    "catalog-category",
  ) as HTMLSelectElement | null;
  const loading = document.getElementById("catalog-loading");
  const errorBox = document.getElementById("catalog-error");
  const empty = document.getElementById("catalog-empty");
  const more = document.getElementById(
    "catalog-more",
  ) as HTMLButtonElement | null;
  const count = document.getElementById("catalog-count");
  const modal = document.getElementById("book-detail-modal");
  const modalContent = document.getElementById("book-detail-content");

  const renderCategories = (): void => {
    if (!category) return;
    const current = state.categoria;
    category.innerHTML =
      '<option value="">Todas as categorias</option>' +
      state.categories
        .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
        .join("");
    category.value = current;
  };

  const renderCard = (book: CatalogBook): string => {
    const cash = money(book.preco_dinheiro);
    const card = money(book.preco_cartao);
    return `
      <button type="button" class="catalog-card group text-left bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full" data-id="${book.id}">
        <div class="aspect-[3/4] bg-gray-50 dark:bg-slate-900 overflow-hidden relative">
          <img src="${esc(coverUrl(book))}" alt="Capa de ${esc(book.titulo)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          ${book.categoria ? `<span class="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-[var(--color-brand)]">${esc(book.categoria)}</span>` : ""}
        </div>
        <div class="p-4 md:p-5 flex flex-col flex-1">
          <h2 class="font-black text-gray-900 dark:text-white text-sm md:text-base leading-tight mb-1">${esc(book.titulo)}</h2>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-3">${esc(book.autor || "Autor não informado")}</p>
          <div class="mt-auto flex items-end justify-between gap-2">
            <div>
              ${cash ? `<p class="text-base font-black text-[var(--color-brand)]">${esc(cash)}</p><p class="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold">à vista</p>` : '<p class="text-[11px] text-gray-500">Consulte o preço</p>'}
            </div>
            ${card ? `<p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold">${esc(card)} no cartão</p>` : ""}
          </div>
        </div>
      </button>
    `;
  };

  const render = (append: boolean): void => {
    if (!append) grid.innerHTML = "";
    grid.innerHTML += state.items.map(renderCard).join("");
    grid.classList.toggle("hidden", state.items.length === 0);
    empty?.classList.toggle("hidden", state.items.length > 0);
    if (more) more.classList.toggle("hidden", state.page >= state.pages);
    if (count) {
      count.innerText = `${state.items.length} de ${state.total} livros exibidos`;
    }
    grid
      .querySelectorAll<HTMLButtonElement>(".catalog-card")
      .forEach((card) => {
        card.onclick = () => {
          const id = Number(card.getAttribute("data-id"));
          const book = state.items.find((item) => item.id === id);
          if (book) openDetail(book);
        };
      });
  };

  const openDetail = (book: CatalogBook): void => {
    if (!modal || !modalContent) return;
    const cash = money(book.preco_dinheiro);
    const card = money(book.preco_cartao);
    modalContent.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-[280px,1fr]">
        <div class="bg-gray-50 dark:bg-slate-800 p-6 md:p-8 flex items-center justify-center">
          <img src="${esc(coverUrl(book))}" alt="Capa de ${esc(book.titulo)}" class="w-full max-w-[220px] aspect-[3/4] object-cover rounded-2xl shadow-xl">
        </div>
        <div class="p-6 md:p-10">
          ${book.categoria ? `<p class="text-[10px] font-black uppercase tracking-widest text-[var(--color-brand)] mb-2">${esc(book.categoria)}</p>` : ""}
          <h2 class="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-2">${esc(book.titulo)}</h2>
          ${book.subtitulo ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${esc(book.subtitulo)}</p>` : ""}
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">${esc(book.autor || "Autor não informado")}</p>
          ${book.editora ? `<p class="text-xs text-gray-400 mb-4">${esc(book.editora)}</p>` : ""}
          <div class="flex flex-wrap items-end gap-4 my-6">
            ${cash ? `<div><p class="text-3xl font-black text-[var(--color-brand)]">${esc(cash)}</p><p class="text-[10px] uppercase font-bold text-gray-400">à vista</p></div>` : ""}
            ${card ? `<p class="text-sm text-gray-500">${esc(card)} no cartão</p>` : ""}
          </div>
          ${book.sinopse ? `<div class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-64 overflow-y-auto pr-2">${book.sinopse}</div>` : ""}
          <p class="mt-6 text-[11px] text-gray-400">Para comprar, procure o ministério de Livraria da 1IPIM após o culto.</p>
        </div>
      </div>
    `;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  };

  const closeDetail = (): void => {
    modal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  };

  const updateJsonLd = (): void => {
    const items = state.items.slice(0, 24).map((book) => ({
      "@type": "Book",
      name: book.titulo,
      author: book.autor ? { "@type": "Person", name: book.autor } : undefined,
      publisher: book.editora
        ? { "@type": "Organization", name: book.editora }
        : undefined,
      image: new URL(coverUrl(book), window.location.origin).href,
      url: `${window.location.origin}/livraria/`,
    }));

    let script = document.getElementById("livraria-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.id = "livraria-jsonld";
      script.setAttribute("type", "application/ld+json");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Catálogo da Livraria 1IPIM",
      numberOfItems: state.total,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item,
      })),
    });
  };

  const load = async (append = false): Promise<void> => {
    if (state.loading) return;
    state.loading = true;
    if (!append) {
      loading?.classList.remove("hidden");
      errorBox?.classList.add("hidden");
      empty?.classList.add("hidden");
      grid.classList.add("hidden");
    }
    if (more) more.disabled = true;

    const params = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(state.page),
    });
    if (state.q) params.set("q", state.q);
    if (state.categoria) params.set("categoria", state.categoria);

    try {
      const response = await fetch(
        `${API_BASE}/livraria?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) throw new Error("catalog_unavailable");
      const data = (await response.json()) as CatalogResponse;
      state.items = append
        ? [...state.items, ...(data.items || [])]
        : data.items || [];
      state.total = data.total || 0;
      state.pages = Math.max(1, data.pages || 1);
      state.categories = data.categorias || [];
      renderCategories();
      render(append);
      updateJsonLd();
    } catch {
      errorBox?.classList.remove("hidden");
    } finally {
      state.loading = false;
      loading?.classList.add("hidden");
      if (more) more.disabled = false;
    }
  };

  let timer = 0;
  search?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.q = search.value.trim();
      state.page = 1;
      void load(false);
    }, 350);
  });

  category?.addEventListener("change", () => {
    state.categoria = category.value;
    state.page = 1;
    void load(false);
  });

  more?.addEventListener("click", () => {
    if (state.page >= state.pages) return;
    state.page++;
    void load(true);
  });

  document
    .getElementById("book-detail-close")
    ?.addEventListener("click", closeDetail);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeDetail();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal?.classList.contains("hidden")) {
      closeDetail();
    }
  });

  void load(false);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCatalog);
} else {
  initCatalog();
}
document.addEventListener("astro:page-load", initCatalog);
