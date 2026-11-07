import { apiFetch, getErrorMessage } from "./api";
import { auth } from "./auth";
import { escapeHtml, onPageReady, showToast } from "./ui";

interface AccessRequest {
  id: number;
  ministry_id: number;
  ministry_name: string;
  status: "pendente" | "aprovado" | "recusado";
  motivo: string;
  review_note: string;
  created_at: string;
}

interface AccessResponse {
  has_access: boolean;
  can_approve: boolean;
  request: AccessRequest | null;
  ministries: Array<{ id: number; nome: string }>;
}

const $ = (id: string): HTMLElement | null => document.getElementById(id);

function feedback(
  type: "success" | "error" | "info",
  message: string,
): void {
  const box = $("access-feedback");
  if (!box) return;
  box.className =
    type === "success"
      ? "mb-6 p-4 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
      : type === "error"
        ? "mb-6 p-4 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        : "mb-6 p-4 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300";
  box.textContent = message;
  box.classList.remove("hidden");
}

function renderStatus(request: AccessRequest | null): void {
  const box = $("access-status");
  const form = $("access-request-form");
  if (!box || !form) return;

  if (!request) {
    box.classList.add("hidden");
    form.classList.remove("hidden");
    return;
  }

  if (request.status === "pendente") {
    box.className =
      "mb-6 p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200";
    box.innerHTML = `
      <p class="text-xs font-black uppercase tracking-widest mb-1">Solicitação em análise</p>
      <p class="text-sm">Seu pedido para o ministério <strong>${escapeHtml(request.ministry_name)}</strong> foi enviado e aguarda aprovação.</p>
      <p class="text-xs mt-2 opacity-80">Enviado em ${escapeHtml(request.created_at)}.</p>
    `;
    box.classList.remove("hidden");
    form.classList.add("hidden");
    return;
  }

  if (request.status === "aprovado") {
    window.location.href = "/portal";
    return;
  }

  box.className =
    "mb-6 p-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300";
  box.innerHTML = `
    <p class="text-xs font-black uppercase tracking-widest mb-1">Solicitação recusada</p>
    <p class="text-sm">Você pode enviar uma nova solicitação${request.review_note ? ` (motivo anterior: ${escapeHtml(request.review_note)})` : ""}.</p>
  `;
  box.classList.remove("hidden");
  form.classList.remove("hidden");
}

onPageReady("#access-request-form", () => {
  void (async () => {
    const user = await auth.ensureSession();
    if (!user) {
      window.location.href = "/portal/login";
      return;
    }

    const form = $("access-request-form") as HTMLFormElement | null;
    const ministrySelect = $("access-ministry") as HTMLSelectElement | null;
    const reason = $("access-reason") as HTMLTextAreaElement | null;
    const submit = $("access-submit") as HTMLButtonElement | null;

    let data: AccessResponse | null = null;

    async function load(): Promise<void> {
      try {
        const response = await apiFetch("/wp-json/1ipim/v1/me/portal-access");
        if (!response.ok) throw new Error("Não foi possível consultar seu acesso.");
        data = (await response.json()) as AccessResponse;

        if (data.has_access) {
          window.location.href = "/portal";
          return;
        }

        if (ministrySelect) {
          ministrySelect.innerHTML =
            '<option value="">Selecione o ministério</option>' +
            (data.ministries || [])
              .map(
                (ministry) =>
                  `<option value="${ministry.id}">${escapeHtml(ministry.nome)}</option>`,
              )
              .join("");
        }

        renderStatus(data.request);
        if (reason && data.request) reason.value = data.request.motivo || "";
      } catch (error) {
        feedback(
          "error",
          getErrorMessage(error, "Não foi possível consultar seu acesso."),
        );
      }
    }

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      void (async () => {
        const ministryId = Number(ministrySelect?.value || 0);
        const motivo = reason?.value.trim() || "";

        if (ministryId <= 0) {
          feedback("error", "Selecione o ministério.");
          return;
        }
        if (!motivo) {
          feedback("error", "Explique o motivo da solicitação.");
          return;
        }

        if (submit) {
          submit.disabled = true;
          submit.textContent = "Enviando...";
        }

        try {
          const response = await apiFetch(
            "/wp-json/1ipim/v1/me/portal-access",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ministry_id: ministryId, motivo }),
            },
          );
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(
              payload.error === "already_team"
                ? "Sua conta já tem acesso ao Portal."
                : payload.error === "missing_motivo"
                  ? "Explique o motivo da solicitação."
                  : "Não foi possível enviar a solicitação.",
            );
          }

          showToast("Solicitação enviada. Aguarde a aprovação.", "success");
          $("#access-feedback")?.classList.add("hidden");
          await load();
        } catch (error) {
          feedback(
            "error",
            error instanceof Error ? error.message : "Falha ao enviar.",
          );
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Enviar solicitação";
          }
        }
      })();
    });

    await load();
  })();
});
