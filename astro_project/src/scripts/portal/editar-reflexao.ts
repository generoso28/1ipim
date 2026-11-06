import { auth } from "./auth";
import { apiFetch, getErrorMessage } from "./api";
import { escapeHtml, showToast, onPageReady } from "./ui";

onPageReady("#edit-form", () => {
  const form = document.getElementById("edit-form") as HTMLFormElement | null;
  const spinner = document.getElementById("loading-spinner");
  const saveButton = document.getElementById(
    "save-btn",
  ) as HTMLButtonElement | null;
  const buttonLabel = document.getElementById("btn-text");
  const buttonLoader = document.getElementById("btn-loader");
  const buttonIcon = document.getElementById("btn-icon");
  const titleInput = document.getElementById(
    "post-title",
  ) as HTMLInputElement | null;
  const contentInput = document.getElementById(
    "post-content",
  ) as HTMLTextAreaElement | null;
  const token = auth.getToken();
  const postId = new URLSearchParams(window.location.search).get("id");

  if (!postId) {
    window.location.href = "/portal/gerenciar-reflexoes";
    return;
  }

  async function loadPost(): Promise<void> {
    try {
      const response = await apiFetch(
        `/wp-json/wp/v2/posts/${postId}/?context=edit`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) throw new Error("Post não encontrado");
      const post = await response.json();

      if (titleInput) titleInput.value = post.title.raw || post.title.rendered;
      if (contentInput)
        contentInput.value = post.content.raw || post.content.rendered;

      spinner?.classList.add("hidden");
      if (form) {
        form.classList.remove("hidden");
        form.classList.add("animate-slide-up");
      }
    } catch (error) {
      if (spinner) {
        spinner.innerHTML = `<p class="text-red-500 font-bold">${escapeHtml(
          getErrorMessage(error, "Erro ao carregar postagem"),
        )}</p>`;
      }
      showToast("Erro ao carregar postagem", "error");
    }
  }

  void loadPost();

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saveButton) saveButton.disabled = true;
    if (buttonLabel) buttonLabel.innerText = "Salvando...";
    buttonLoader?.classList.remove("hidden");
    buttonIcon?.classList.add("hidden");

    try {
      const response = await apiFetch(`/wp-json/wp/v2/posts/${postId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: titleInput?.value || "",
          content: contentInput?.value || "",
        }),
      });

      if (!response.ok) throw new Error("Falha ao salvar");
      showToast("Alterações salvas com sucesso!", "success");
      setTimeout(() => {
        window.location.href = "/portal/gerenciar-reflexoes";
      }, 1500);
    } catch {
      showToast("Erro ao salvar no servidor", "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
      if (buttonLabel) buttonLabel.innerText = "Salvar Alterações";
      buttonLoader?.classList.add("hidden");
      buttonIcon?.classList.remove("hidden");
    }
  });
});
