import { apiFetch } from "./api";
import { auth } from "./auth";
import { getPermissions } from "./permissions";
import { onPageReady, showToast } from "./ui";

onPageReady("#password-form", async () => {
  const session = await auth.ensureSession();
  if (!session) return;

  const name = document.getElementById("profile-name");
  const email = document.getElementById("profile-email");
  const role = document.getElementById("profile-role");
  const permissions = getPermissions(session);
  if (name) name.innerText = session.displayName || "—";
  if (email) email.innerText = session.email || "—";
  if (role) role.innerText = permissions.label;

  const form = document.getElementById(
    "password-form",
  ) as HTMLFormElement | null;
  const feedback = document.getElementById("password-feedback");
  const save = document.getElementById(
    "password-save",
  ) as HTMLButtonElement | null;

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const current = String(data.get("current_password") || "");
    const next = String(data.get("new_password") || "");
    const confirm = String(data.get("confirm_password") || "");

    if (feedback) feedback.classList.add("hidden");
    if (next !== confirm) {
      if (feedback) {
        feedback.innerText = "As senhas novas não coincidem.";
        feedback.className =
          "p-3 rounded-xl text-sm font-bold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300";
        feedback.classList.remove("hidden");
      }
      return;
    }

    if (save) save.disabled = true;
    try {
      const response = await apiFetch("/wp-json/1ipim/v1/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.message || "Falha ao alterar a senha");
      }
      showToast(
        result.message || "Senha alterada. Faça login novamente.",
        "success",
      );
      auth.clear();
      window.setTimeout(() => {
        window.location.href = "/portal/login/";
      }, 1500);
    } catch (error) {
      if (feedback) {
        feedback.innerText =
          error instanceof Error ? error.message : "Erro ao alterar a senha.";
        feedback.className =
          "p-3 rounded-xl text-sm font-bold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300";
        feedback.classList.remove("hidden");
      }
    } finally {
      if (save) save.disabled = false;
    }
  });
});
