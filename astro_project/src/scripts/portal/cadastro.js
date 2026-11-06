import { g as f } from "./portal-config.js";
document.addEventListener("astro:page-load", () => {
  const t = document.getElementById("register-form"),
    r = document.getElementById("reg-feedback"),
    o = document.getElementById("feedback-message"),
    d = document.getElementById("feedback-icon"),
    n = document.getElementById("reg-submit-btn"),
    c = document.getElementById("reg-btn-text"),
    g = document.getElementById("reg-btn-loader"),
    m = document.getElementById("ministries-grid"),
    u = "https://1ipim.online/admin";
  async function b() {
    try {
      const a = f(u),
        l = await (
          await fetch(`${a}/wp-json/wp/v2/ministerio/?per_page=100`)
        ).json();
      m &&
        (m.innerHTML = l
          .map(
            (i) => `
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" name="ministries" value="${i.id}" data-name="${i.title.rendered}" class="w-4 h-4 rounded border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]">
                                <span class="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">${i.title.rendered}</span>
                            </label>
                        `,
          )
          .join(""));
    } catch (a) {
      (console.error("Erro ao carregar ministérios:", a),
        m &&
          (m.innerHTML =
            '<p class="text-red-500 text-[10px]">Erro ao carregar.</p>'));
    }
  }
  (b(),
    t &&
      t.addEventListener("submit", async (a) => {
        (a.preventDefault(),
          r?.classList.add("hidden"),
          n && (n.disabled = !0),
          c && (c.innerText = "Enviando cadastro..."),
          g?.classList.remove("hidden"));
        const s = new FormData(t),
          l = Array.from(
            t.querySelectorAll('input[name="ministries"]:checked'),
          ).map((e) => e.value),
          i = Array.from(
            t.querySelectorAll('input[name="ministries"]:checked'),
          ).map((e) => e.getAttribute("data-name")),
          y = {
            username: s.get("username"),
            email: s.get("email"),
            password: s.get("password"),
            display_name: s.get("name"),
            description: `Interessado em: ${i.join(", ")}`,
            meta_input: { ministries_requested: JSON.stringify(l) },
          };
        try {
          const e = f(u),
            p = await fetch(`${e}/wp-json/wp/v2/users/register/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(y),
            }),
            h = await p.json();
          if (!p.ok) throw new Error(h.message || "Erro ao realizar cadastro");
          (r?.classList.remove("hidden", "bg-red-50", "text-red-600"),
            r?.classList.add(
              "bg-green-50",
              "text-green-600",
              "dark:bg-green-900/20",
              "dark:text-green-400",
              "animate-bounce",
            ),
            d && (d.className = "fa-solid fa-circle-check mt-0.5"),
            o &&
              (o.innerText =
                "Conta criada com sucesso! Aguarde a liberação do acesso pelo gestor."),
            t.reset(),
            n?.classList.add("hidden"),
            setTimeout(() => {
              window.location.href = "/portal/login";
            }, 3e3));
        } catch (e) {
          (console.error(e),
            r?.classList.remove("hidden", "bg-green-50", "text-green-600"),
            r?.classList.add(
              "bg-red-50",
              "text-red-600",
              "dark:bg-red-900/20",
              "dark:text-red-400",
            ),
            d && (d.className = "fa-solid fa-circle-exclamation mt-0.5"),
            o && (o.innerText = e.message || "Houve um erro. Tente novamente."),
            n && (n.disabled = !1),
            c && (c.innerText = "Criar minha conta"),
            g?.classList.add("hidden"));
        }
      }));
});
