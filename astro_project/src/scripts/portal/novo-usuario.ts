import { requireAuth } from "./auth";
import { apiFetch } from "./api";
import { escapeAttribute, escapeHtml, onPageReady } from "./ui";
import type { WpMinistry } from "./types";

onPageReady("#new-user-form", () => {
  const guard = document.getElementById("auth-guard");
  const form = document.getElementById(
    "new-user-form",
  ) as HTMLFormElement | null;
  const ministriesGrid = document.getElementById("ministries-grid");
  const submitButton = document.getElementById(
    "submit-btn",
  ) as HTMLButtonElement | null;
  const buttonText = document.getElementById("btn-text");
  const buttonLoader = document.getElementById("btn-loader");
  const feedback = document.getElementById("form-feedback");

  function hideGuard(): void {
    if (!guard) return;
    guard.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => guard.remove(), 500);
  }

  async function loadMinistries(): Promise<void> {
    if (!ministriesGrid) return;

    try {
      const response = await apiFetch(
        "/wp-json/wp/v2/ministerio/?per_page=100",
      );
      const ministries = (await response.json()) as WpMinistry[];

      ministriesGrid.innerHTML = ministries
        .map(
          (ministry) => `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="ministries" value="${ministry.id}" data-name="${escapeAttribute(ministry.title.rendered)}" class="w-4 h-4 rounded border-gray-300 text-[var(--color-brand)]">
              <span class="text-xs text-gray-600 dark:text-gray-400">${escapeHtml(ministry.title.rendered)}</span>
            </label>
          `,
        )
        .join("");
    } catch (error) {
      console.error("Erro ao carregar ministérios:", error);
      ministriesGrid.innerHTML =
        '<p class="text-red-500 text-[10px]">Erro ao carregar.</p>';
    }
  }

  void (async () => {
    const user = await requireAuth();
    if (!user) return;

    const canManageAll =
      Boolean(user.isAdmin || user.isPastor) ||
      user.role === "administrator" ||
      user.role === "pastor";
    if (!canManageAll) {
      window.location.href = "/portal/";
      return;
    }

    hideGuard();
    void loadMinistries();

    if (!form) return;

    form.onsubmit = async (event) => {
      event.preventDefault();

      if (submitButton) submitButton.disabled = true;
      buttonLoader?.classList.remove("hidden");
      if (buttonText) buttonText.innerText = "Processando...";

      const formData = new FormData(form);
      const name = String(formData.get("name") || "");
      const selected = Array.from(
        form.querySelectorAll<HTMLInputElement>(
          'input[name="ministries"]:checked',
        ),
      ).map((input) => input.value);

      const payload = {
        username: formData.get("username"),
        email: formData.get("email"),
        name,
        first_name: name.split(" ")[0],
        password: `Temp!${Math.random().toString(36).slice(2, 8)}!`,
        roles: ["subscriber"],
        meta: {
          ministries_requested: JSON.stringify(selected),
          ministries_approved: JSON.stringify([]),
        },
      };

      try {
        const response = await apiFetch("/wp-json/wp/v2/users/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Erro ao criar usuário.");

        if (feedback) {
          feedback.innerText = "Usuário criado e aprovado!";
          feedback.className =
            "p-5 rounded-xl text-sm font-bold bg-green-50 text-green-600 flex items-center gap-3";
          feedback.classList.remove("hidden");
        }

        setTimeout(() => {
          window.location.href = "/portal/usuarios";
        }, 2000);
      } catch (error) {
        if (feedback) {
          feedback.innerText =
            error instanceof Error ? error.message : "Erro ao criar usuário.";
          feedback.className =
            "p-5 rounded-xl text-sm font-bold bg-red-50 text-red-600 flex items-center gap-3";
          feedback.classList.remove("hidden");
        }
        if (submitButton) submitButton.disabled = false;
        buttonLoader?.classList.add("hidden");
        if (buttonText) buttonText.innerText = "Tentar novamente";
      }
    };
  })();
});
