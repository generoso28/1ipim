import { apiFetch } from "./api";
import { auth } from "./auth";
import { showToast, onPageReady } from "./ui";

onPageReady("#post-form", async () => {
  const session = await auth.ensureSession();
  if (!session) return;

  const form = document.getElementById("post-form") as HTMLFormElement | null;
  if (!form) return;

  const publishButton = document.getElementById(
    "publish-btn",
  ) as HTMLButtonElement | null;
  const buttonLabel = document.getElementById("btn-text");
  const buttonLoader = document.getElementById("btn-loader");
  const buttonIcon = document.getElementById("btn-icon");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (publishButton) publishButton.disabled = true;
    if (buttonLabel) buttonLabel.innerText = "Publicando...";
    buttonLoader?.classList.remove("hidden");
    buttonIcon?.classList.add("hidden");

    const title =
      (document.getElementById("post-title") as HTMLInputElement | null)
        ?.value || "";
    const content =
      (document.getElementById("post-content") as HTMLTextAreaElement | null)
        ?.value || "";

    try {
      const categoryResponse = await apiFetch(
        "/wp-json/wp/v2/categories/?slug=reflexoes",
      );
      const categories = await categoryResponse.json();
      const categoryId =
        categories && categories.length > 0 ? categories[0].id : null;

      const response = await apiFetch("/wp-json/wp/v2/posts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          status: "publish",
          categories: categoryId ? [categoryId] : [],
        }),
      });

      if (!response.ok) throw new Error("Falha ao publicar");
      showToast("Reflexão publicada com sucesso!", "success");
      setTimeout(() => {
        window.location.href = "/portal/gerenciar-reflexoes";
      }, 2000);
    } catch {
      showToast("Erro ao publicar mensagem", "error");
    } finally {
      if (publishButton) publishButton.disabled = false;
      if (buttonLabel) buttonLabel.innerText = "Publicar no Site";
      buttonLoader?.classList.add("hidden");
      buttonIcon?.classList.remove("hidden");
    }
  });
});
