import type { BrowserContext, Page, Route } from "@playwright/test";

export const SESSION = {
  "1ipim_auth_token": "e2e-token",
  "1ipim_user_role": "administrator",
  "1ipim_user_id": "1",
  "1ipim_user_display_name": "Teste E2E",
  "1ipim_user_email": "teste@example.com",
  "1ipim_user_ministries_approved": '["1"]',
} as const;

export async function seedSession(context: BrowserContext): Promise<void> {
  await context.addInitScript((session) => {
    Object.entries(session).forEach(([key, value]) =>
      localStorage.setItem(key, value as string),
    );
  }, SESSION);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-WP-Nonce",
};

export function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    headers: CORS_HEADERS,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export function corsPreflight(route: Route): Promise<void> {
  return route.fulfill({ status: 204, headers: CORS_HEADERS });
}

export function getApiPath(route: Route): { path: string; method: string } {
  const url = new URL(route.request().url());
  return {
    path: url.pathname.replace("/admin/wp-json", ""),
    method: route.request().method(),
  };
}

export const MINISTRIES = [
  { id: 1, title: { rendered: "Mídia" } },
  { id: 2, title: { rendered: "Louvor" } },
];

export const USERS = [
  {
    id: 1,
    name: "Teste E2E",
    email: "teste@example.com",
    roles: ["administrator"],
    meta: { ministries_approved: '["1"]', ministries_requested: "[]" },
  },
  {
    id: 2,
    name: "Maria Souza",
    email: "maria@example.com",
    roles: ["subscriber"],
    meta: { ministries_approved: "[]", ministries_requested: '["1"]' },
  },
];

export const POSTS = [
  {
    id: 1,
    date: "2026-04-13T12:00:00",
    modified: "2026-04-13T12:00:00",
    status: "publish",
    title: { rendered: "Saúde Física e Espiritual" },
    content: { rendered: "<p>Texto</p>" },
  },
  {
    id: 2,
    date: "2026-04-12T12:00:00",
    modified: "2026-04-12T12:00:00",
    status: "publish",
    title: { rendered: "A Páscoa" },
    content: { rendered: "<p>Texto</p>" },
  },
];

/** Data de teste no mês atual, para o calendário de escalas. */
export function currentMonthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function scheduleFor(date: string) {
  return {
    id: 1,
    title: { rendered: "Culto" },
    date: `${date}T12:00:00`,
    content: { rendered: `<p>${date}|outro@example.com|19:30|Equipe E2E|1</p>` },
    meta: {
      data_da_escala: date,
      ministerio_id: "1",
      equipe_nomes: "Equipe E2E",
      equipe_emails: "outro@example.com",
      horario: "19:30",
    },
  };
}

export function acceptDialogs(page: Page, promptValue = "1"): void {
  page.on("dialog", async (dialog) => {
    await dialog.accept(dialog.type() === "prompt" ? promptValue : undefined);
  });
}
