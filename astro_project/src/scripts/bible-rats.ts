const ENDPOINT =
  "https://1ipim.online/admin/wp-json/1ipim/v1/registrar-assinante";

function showFeedback(
  box: HTMLElement | null,
  type: "error" | "success",
  message: string,
): void {
  if (!box) return;
  box.innerText = message;
  box.className =
    type === "success"
      ? "p-4 rounded-xl text-sm font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
      : "p-4 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  box.classList.remove("hidden");
}

function init(): void {
  const form = document.getElementById(
    "bible-rats-form",
  ) as HTMLFormElement | null;
  if (!form || form.dataset.ready === "1") return;
  form.dataset.ready = "1";

  const box = document.getElementById("br-feedback");
  const button = document.getElementById(
    "br-submit",
  ) as HTMLButtonElement | null;
  const label = document.getElementById("br-submit-text");
  const loader = document.getElementById("br-loader");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    box?.classList.add("hidden");
    if (button) button.disabled = true;
    if (label) label.innerText = "Criando conta...";
    loader?.classList.remove("hidden");

    const data = new FormData(form);
    const payload = {
      display_name: String(data.get("name") || "").trim(),
      username: String(data.get("username") || "").trim(),
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || ""),
      website: String(data.get("website") || ""),
    };

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };
      if (!response.ok) {
        throw new Error(result.message || "Não foi possível criar a conta.");
      }

      showFeedback(
        box,
        "success",
        result.message ||
          "Conta criada! Confirme seu e-mail para ativar o acesso.",
      );
      form.reset();
      if (button) button.classList.add("hidden");
    } catch (error) {
      showFeedback(
        box,
        "error",
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta.",
      );
      if (button) button.disabled = false;
      if (label) label.innerText = "Criar conta gratuita";
      loader?.classList.add("hidden");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
document.addEventListener("astro:page-load", init);
