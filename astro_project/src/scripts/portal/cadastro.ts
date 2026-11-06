import { apiFetch, getErrorMessage } from "./api";
import { escapeAttribute, escapeHtml } from "./ui";
import type { WpMinistry } from "./types";

interface RegistrationPayload {
  username: string;
  email: string;
  password: string;
  display_name: string;
  description: string;
  meta_input: { ministries_requested: string };
}

async function loadMinistries(): Promise<void> {
  const grid = document.getElementById("ministries-grid");
  if (!grid) return;

  try {
    const response = await apiFetch("/wp-json/wp/v2/ministerio/?per_page=100");
    const ministries = (await response.json()) as WpMinistry[];

    grid.innerHTML = ministries
      .map(
        (ministry) => `
          <label class="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" name="ministries" value="${ministry.id}" data-name="${escapeAttribute(ministry.title.rendered)}" class="w-4 h-4 rounded border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]">
            <span class="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">${escapeHtml(ministry.title.rendered)}</span>
          </label>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Erro ao carregar ministérios:", error);
    grid.innerHTML =
      '<p class="text-red-500 text-[10px]">Erro ao carregar.</p>';
  }
}

function showFeedback(
  type: "success" | "error",
  message: string,
  icon: HTMLElement | null,
  box: HTMLElement | null,
  messageEl: HTMLElement | null,
): void {
  box?.classList.remove(
    "hidden",
    "bg-red-50",
    "text-red-600",
    "bg-green-50",
    "text-green-600",
    "dark:bg-green-900/20",
    "dark:text-green-400",
    "dark:bg-red-900/20",
    "dark:text-red-400",
  );

  if (type === "success") {
    box?.classList.add(
      "bg-green-50",
      "text-green-600",
      "dark:bg-green-900/20",
      "dark:text-green-400",
      "animate-bounce",
    );
    if (icon) icon.className = "fa-solid fa-circle-check mt-0.5";
  } else {
    box?.classList.add(
      "bg-red-50",
      "text-red-600",
      "dark:bg-red-900/20",
      "dark:text-red-400",
    );
    if (icon) icon.className = "fa-solid fa-circle-exclamation mt-0.5";
  }

  if (messageEl) messageEl.innerText = message;
}

document.addEventListener("astro:page-load", () => {
  const form = document.getElementById(
    "register-form",
  ) as HTMLFormElement | null;
  const feedbackBox = document.getElementById("reg-feedback");
  const feedbackMessage = document.getElementById("feedback-message");
  const feedbackIcon = document.getElementById("feedback-icon");
  const submitButton = document.getElementById(
    "reg-submit-btn",
  ) as HTMLButtonElement | null;
  const submitLabel = document.getElementById("reg-btn-text");
  const submitLoader = document.getElementById("reg-btn-loader");

  void loadMinistries();

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedbackBox?.classList.add("hidden");
    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.innerText = "Enviando cadastro...";
    submitLoader?.classList.remove("hidden");

    const data = new FormData(form);
    const selected = Array.from(
      form.querySelectorAll<HTMLInputElement>(
        'input[name="ministries"]:checked',
      ),
    );
    const ministryIds = selected.map((input) => input.value);
    const ministryNames = selected.map(
      (input) => input.getAttribute("data-name") || "",
    );

    const payload: RegistrationPayload = {
      username: String(data.get("username") || ""),
      email: String(data.get("email") || ""),
      password: String(data.get("password") || ""),
      display_name: String(data.get("name") || ""),
      description: `Interessado em: ${ministryNames.join(", ")}`,
      meta_input: { ministries_requested: JSON.stringify(ministryIds) },
    };

    try {
      const response = await apiFetch("/wp-json/wp/v2/users/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro ao realizar cadastro");
      }

      showFeedback(
        "success",
        "Conta criada com sucesso! Aguarde a liberação do acesso pelo gestor.",
        feedbackIcon,
        feedbackBox,
        feedbackMessage,
      );
      form.reset();
      submitButton?.classList.add("hidden");

      setTimeout(() => {
        window.location.href = "/portal/login";
      }, 3000);
    } catch (error) {
      console.error(error);
      showFeedback(
        "error",
        getErrorMessage(error, "Houve um erro. Tente novamente."),
        feedbackIcon,
        feedbackBox,
        feedbackMessage,
      );
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.innerText = "Criar minha conta";
      submitLoader?.classList.add("hidden");
    }
  });
});
