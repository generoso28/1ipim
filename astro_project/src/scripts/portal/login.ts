import { AUTH_BASE, auth, type SessionInput } from "./auth";
import { getErrorMessage } from "./api";
import { setLoadingState, onPageReady } from "./ui";

const LOGIN_ERROR_FALLBACK = "Verifique seus dados e tente novamente.";

onPageReady("#login-form", () => {
  const form = document.getElementById("login-form") as HTMLFormElement | null;
  if (!form) return;

  const errorBox = document.getElementById("login-error");
  const errorMessage = document.getElementById("error-message");
  const button = document.getElementById(
    "submit-btn",
  ) as HTMLButtonElement | null;
  const buttonLabel = document.getElementById("btn-text");
  const buttonLoader = document.getElementById("btn-loader");
  const buttonArrow = document.getElementById("btn-arrow");
  const notice = document.getElementById("login-notice");
  const params = new URLSearchParams(window.location.search);

  if (notice && params.get("verified") === "1") {
    notice.className =
      "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl text-green-700 dark:text-green-300 text-sm font-bold";
    notice.innerText =
      "E-mail confirmado! Sua conta Bible Rats está ativa. Faça login para continuar.";
    notice.classList.remove("hidden");
  } else if (notice && params.get("verify_error")) {
    notice.className =
      "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold";
    notice.innerText =
      "Não foi possível confirmar o e-mail. O link pode ter expirado; solicite um novo cadastro.";
    notice.classList.remove("hidden");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox?.classList.add("hidden");

    setLoadingState({
      button,
      label: buttonLabel,
      loader: buttonLoader,
      arrow: buttonArrow,
      loading: true,
      idleText: "Entrar no Portal",
      busyText: "Autenticando...",
    });

    const data = new FormData(form);
    const username = String(data.get("username") || "");
    const password = String(data.get("password") || "");

    try {
      const response = await fetch(`${AUTH_BASE}/login.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        user?: SessionInput;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.message || "Erro ao realizar login");
      }

      auth.setSession(payload.user);
      window.location.href = "/portal";
    } catch (error) {
      console.error(error);
      if (errorMessage) {
        errorMessage.innerText = getErrorMessage(error, LOGIN_ERROR_FALLBACK);
      }
      errorBox?.classList.remove("hidden");

      setLoadingState({
        button,
        label: buttonLabel,
        loader: buttonLoader,
        arrow: buttonArrow,
        loading: false,
        idleText: "Entrar no Portal",
        busyText: "Autenticando...",
      });
    }
  });
});
