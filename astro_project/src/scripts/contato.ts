/**
 * Formulário de contato do site.
 *
 * Envia para o endpoint PHP que usa o wp_mail() do WordPress (SMTP já
 * configurado). Mantém o endpoint absoluto para funcionar também no staging.
 */
const CONTACT_ENDPOINT = "https://1ipim.online/api/contato.php";

interface FeedbackOptions {
  type: "success" | "error";
  message: string;
}

function showFeedback({ type, message }: FeedbackOptions): void {
  const box = document.getElementById("contact-feedback");
  const icon = document.getElementById("contact-feedback-icon");
  const text = document.getElementById("contact-feedback-message");
  if (!box || !icon || !text) return;

  box.classList.remove(
    "hidden",
    "bg-green-50",
    "text-green-700",
    "dark:bg-green-900/20",
    "dark:text-green-300",
    "bg-red-50",
    "text-red-600",
    "dark:bg-red-900/20",
    "dark:text-red-400",
  );

  if (type === "success") {
    box.classList.add(
      "bg-green-50",
      "text-green-700",
      "dark:bg-green-900/20",
      "dark:text-green-300",
    );
    icon.className = "fa-solid fa-circle-check mt-0.5";
  } else {
    box.classList.add(
      "bg-red-50",
      "text-red-600",
      "dark:bg-red-900/20",
      "dark:text-red-400",
    );
    icon.className = "fa-solid fa-circle-exclamation mt-0.5";
  }

  text.textContent = message;
  box.classList.remove("hidden");
}

function setLoading(loading: boolean): void {
  const button = document.getElementById(
    "contact-submit",
  ) as HTMLButtonElement | null;
  const label = document.getElementById("contact-btn-text");
  const loader = document.getElementById("contact-btn-loader");

  if (button) button.disabled = loading;
  if (label) label.textContent = loading ? "Enviando..." : "Enviar mensagem";
  loader?.classList.toggle("hidden", !loading);
}

function initContactForm(): void {
  const form = document.getElementById(
    "contact-form",
  ) as HTMLFormElement | null;
  if (!form || form.dataset.ready === "1") return;
  form.dataset.ready = "1";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      subject: String(data.get("subject") || "Contato"),
      message: String(data.get("message") || "").trim(),
      website: String(data.get("website") || ""),
    };

    if (payload.message.length < 10) {
      showFeedback({
        type: "error",
        message: "Escreva uma mensagem com pelo menos 10 caracteres.",
      });
      return;
    }

    setLoading(true);
    const feedbackBox = document.getElementById("contact-feedback");
    feedbackBox?.classList.add("hidden");

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
            "Não foi possível enviar sua mensagem. Tente novamente.",
        );
      }

      form.reset();
      showFeedback({
        type: "success",
        message:
          "Mensagem enviada! A secretaria responderá no e-mail informado.",
      });
    } catch (error) {
      showFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar sua mensagem. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  });
}

document.addEventListener("astro:page-load", initContactForm);
if (document.readyState !== "loading") initContactForm();
