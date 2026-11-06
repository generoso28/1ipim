import { expect, test } from "@playwright/test";
import {
  acceptDialogs,
  json,
  mockAuthSession,
  seedSession,
} from "./helpers/portal";

const BOOKS = [
  {
    id: 1,
    slug: "o-amor-que-mudou-o-mundo",
    titulo: "O amor que mudou o mundo",
    autor: "Autor Teste",
    editora: "Editora Teste",
    categoria: "Devocional",
    sinopse: "Uma sinopse de teste.",
    capa: "/assets/img/livraria/1.webp",
    preco_dinheiro: 20,
    preco_cartao: 22,
    preco_capa: 80,
    estoque: 4,
    estoque_minimo: 1,
    ativo: true,
    destaque: false,
  },
  {
    id: 2,
    slug: "cante",
    titulo: "Cante!",
    autor: "Outro Autor",
    editora: "Editora Teste",
    categoria: "Música",
    sinopse: "Outra sinopse.",
    capa: "",
    preco_dinheiro: 15,
    preco_cartao: 16,
    preco_capa: 30,
    estoque: 0,
    estoque_minimo: 1,
    ativo: true,
    destaque: true,
  },
];

const LIST_PAYLOAD = {
  items: BOOKS,
  total: BOOKS.length,
  page: 1,
  pages: 1,
  categorias: ["Devocional", "Música"],
  stats: { total: 169, ativos: 169, com_capa: 10, estoque: 377 },
};

test.describe("Livraria pública", () => {
  test("lista, busca e abre os detalhes", async ({ page }) => {
    await page.route(/\/wp-json\/1ipim\/v1\/livraria\?/, async (route) => {
      await json(route, {
        ...LIST_PAYLOAD,
        items: BOOKS.map((book) => {
          const { estoque, estoque_minimo, ...publicBook } = book;
          return publicBook;
        }),
      });
    });

    await page.goto("/livraria/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Boas leituras");
    await expect(page.locator(".catalog-card")).toHaveCount(2);
    await expect(page.locator("#catalog-count")).toContainText("2 de 2");

    await page.locator(".catalog-card").first().click();
    await expect(page.locator("#book-detail-modal")).toBeVisible();
    await expect(page.locator("#book-detail-content")).toContainText(
      "O amor que mudou o mundo",
    );
    await expect(page.locator("#book-detail-content")).toContainText("R$");
    await page.locator("#book-detail-close").click();
    await expect(page.locator("#book-detail-modal")).toBeHidden();
  });
});

test.describe("Livraria no portal", () => {
  test.beforeEach(async ({ context, page }) => {
    await seedSession(context);
    await mockAuthSession(page);
  });

  test("lista, cria, edita, busca capa e exclui", async ({ page }) => {
    test.slow();
    acceptDialogs(page);

    await page.route(
      "**/admin/wp-json/1ipim/v1/admin/livros**",
      async (route) => {
        const method = route.request().method();
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/admin/livros") && method === "GET") {
          await json(route, LIST_PAYLOAD);
          return;
        }
        if (url.pathname.endsWith("/admin/livros") && method === "POST") {
          await json(route, { ...BOOKS[0], id: 101 });
          return;
        }
        if (url.pathname.endsWith("/admin/livros/1") && method === "POST") {
          await json(route, BOOKS[0]);
          return;
        }
        if (url.pathname.endsWith("/admin/livros/1") && method === "DELETE") {
          await json(route, { deleted: true });
          return;
        }
        if (url.pathname.endsWith("/admin/livros/capas")) {
          await json(route, [
            {
              titulo: "O amor que mudou o mundo",
              autores: "Autor Teste",
              editora: "Editora Teste",
              ano: "2020",
              capa: "https://covers.openlibrary.org/b/id/1-L.jpg",
              fonte: "Open Library",
            },
          ]);
          return;
        }
        await json(route, { message: "not mocked" }, 404);
      },
    );

    await page.goto("/portal/livraria/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#livraria-table-body tr")).toHaveCount(2);
    await expect(page.locator("#livraria-stats")).toContainText("Livros");
    await expect(page.locator("#livraria-stats")).toContainText("169");

    await page.click("#livraria-new-btn");
    await expect(page.locator("#book-modal")).toBeVisible();
    await page.fill("#book-title", "Livro E2E");
    await page.fill("#book-author", "Autor E2E");
    await page.fill("#book-cash", "20,00");
    await page.fill("#book-stock", "3");
    await page.click("#book-save");
    await expect(page.locator("#toast-container")).toContainText(
      "Livro cadastrado!",
    );

    await page.locator(".edit-book-btn").first().click();
    await expect(page.locator("#book-modal-title")).toContainText("Editar");
    await page.fill("#book-title", "O amor que mudou o mundo (editado)");
    await page.click("#book-cover-search-btn");
    await expect(page.locator(".cover-result")).toHaveCount(1);
    await page.locator(".cover-result").first().click();
    await expect(page.locator("#toast-container")).toContainText(
      "Capa selecionada",
    );
    await page.click("#book-save");
    await expect(page.locator("#toast-container")).toContainText(
      "Livro atualizado!",
    );

    await page.locator(".edit-book-btn").first().click();
    await page.click("#book-delete");
    await expect(page.locator("#toast-container")).toContainText(
      "Livro excluído",
    );
  });
});
