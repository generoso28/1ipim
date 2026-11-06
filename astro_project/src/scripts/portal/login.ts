import { auth } from "./auth";
import { apiFetch, getErrorMessage } from "./api";
import { setLoadingState, onPageReady } from "./ui";

const LOGIN_ERROR_FALLBACK = "Verifique seus dados e tente novamente.";

async function loadProfile(token: string, fallbackRole: string): Promise<void> {
  try {
    const [settingsResponse, meResponse] = await Promise.all([
      apiFetch("/wp-json/wp/v2/settings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiFetch("/wp-json/wp/v2/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const me = await meResponse.json();

    if (me?.id) {
      auth.setId(me.id);

      if (settingsResponse.ok) {
        auth.setRole("administrator");
      } else if (me.roles && me.roles.length > 0) {
        auth.setRole(me.roles[0]);
      } else if (fallbackRole && fallbackRole !== "subscriber") {
        auth.setRole(fallbackRole);
      } else {
        auth.setRole("contributor");
      }

      try {
        const ministries = JSON.parse(me.meta?.ministries_approved || "[]");
        auth.setMinistries(
          Array.isArray(ministries) ? ministries.map(Number) : [],
        );
      } catch {
        auth.setMinistries([]);
      }
    }
  } catch (error) {
    console.error("Erro ao buscar metadados:", error);
  }

  window.location.href = "/portal";
}

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
      const response = await apiFetch("/wp-json/jwt-auth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Erro ao realizar login");
      }

      const role =
        payload.role ||
        (payload.user_nicename === "admin" ? "administrator" : "subscriber");

      auth.setSession({
        token: payload.token,
        email: payload.user_email,
        nicename: payload.user_nicename,
        displayName: payload.user_display_name,
        role,
        id: payload.id || "",
      });

      await loadProfile(payload.token, role);
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
