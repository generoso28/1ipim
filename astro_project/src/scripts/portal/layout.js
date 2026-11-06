import { a as l } from "./auth-store.js";
import { a as k } from "./portal-config.js";
document.addEventListener("astro:page-load", () => {
  const s = document.getElementById("auth-guard"),
    c = document.getElementById("portal-logout-btn"),
    d = document.getElementById("nav-dynamic-links"),
    m = document.getElementById("user-nav-name"),
    u = document.getElementById("user-nav-role"),
    f = document.getElementById("user-initials");
  if (!l.getToken()) {
    window.location.href = "/portal/login";
    return;
  }
  const n = l.getUser(),
    o = k(n.role || "", n.nicename || "");
  if (
    (m && (m.innerText = n.displayName || "Usuário"),
    u && (u.innerText = o.label),
    f &&
      n.displayName &&
      (f.innerText = n.displayName
        .split(" ")
        .map((e) => e[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()),
    d)
  ) {
    const e = [];
    (o.canReflexoes &&
      e.push({
        h: "/portal/gerenciar-reflexoes",
        i: "fa-solid fa-pen-nib",
        t: "Reflexões",
      }),
      o.canEscalas &&
        e.push({
          h: "/portal/escalas",
          i: "fa-solid fa-calendar-check",
          t: "Escalas",
        }),
      o.canLivraria &&
        e.push({ h: "/portal/livraria", i: "fa-solid fa-book", t: "Livraria" }),
      o.isAdmin &&
        (e.push({
          h: "/portal/usuarios",
          i: "fa-solid fa-users-gear",
          t: "Voluntários",
        }),
        e.push({
          h: "/portal/ministerios",
          i: "fa-solid fa-layer-group",
          t: "Ministérios",
        }),
        e.push({
          h: "https://1ipim.online/admin" + "/wp-admin",
          i: "fa-brands fa-wordpress text-blue-500",
          t: "WP Admin",
          external: !0,
        })),
      (d.innerHTML = e
        .map(
          (t) => `
                    <a href="${t.h}" ${t.external ? 'target="_blank" rel="nofollow"' : ""} class="nav-link flex items-center gap-4 px-3 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-[var(--color-brand)] transition-all group/link overflow-hidden whitespace-nowrap ${!t.external && window.location.pathname.startsWith(t.h) ? "bg-gray-50 dark:bg-slate-700/50 text-[var(--color-brand)]" : ""}">
                        <div class="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                            <i class="${t.i}"></i>
                        </div>
                        <span class="font-bold text-sm lg:opacity-100 lg:group-hover:opacity-100 opacity-0 transition-opacity">${t.t}</span>
                    </a>
                `,
        )
        .join("")));
  }
  const p = document.getElementById("portal-theme-toggle"),
    i = document.getElementById("portal-theme-icon"),
    r = document.getElementById("portal-theme-text");
  function g() {
    if (!i || !r) return;
    document.documentElement.classList.contains("dark")
      ? ((i.className = "fa-solid fa-sun"), (r.innerText = "Modo Claro"))
      : ((i.className = "fa-solid fa-moon"), (r.innerText = "Modo Escuro"));
  }
  (g(),
    p &&
      (p.onclick = () => {
        const e = document.documentElement.classList.toggle("dark");
        (localStorage.setItem("theme", e ? "dark" : "light"), g());
      }));
  const h = document.getElementById("mobile-menu-btn"),
    x = document.getElementById("portal-sidebar");
  (h &&
    x &&
    (h.onclick = () => {
      x.classList.toggle("-translate-x-full");
    }),
    s &&
      setTimeout(() => {
        (s.classList.add("opacity-0", "pointer-events-none"),
          setTimeout(() => s.remove(), 500));
      }, 300),
    c &&
      (c.onclick = () => {
        (l.clear(), (window.location.href = "/portal/login"));
      }),
    (window.showToast = (e, t = "info") => {
      const y = document.getElementById("toast-container");
      if (!y) return;
      const a = document.createElement("div"),
        b = {
          success: "bg-green-500 text-white",
          error: "bg-red-500 text-white",
          info: "bg-[var(--color-brand)] text-white",
        };
      ((a.className = `${b[t]} px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up transform transition-all duration-300 translate-y-12 opacity-0 font-bold text-sm min-w-[280px]`),
        (a.innerHTML = `
                    <i class="fa-solid ${t === "success" ? "fa-circle-check" : t === "error" ? "fa-circle-exclamation" : "fa-circle-info"} text-xl"></i>
                    <span>${e}</span>
                `),
        y.appendChild(a),
        setTimeout(() => {
          a.classList.remove("translate-y-12", "opacity-0");
        }, 10),
        setTimeout(() => {
          (a.classList.add("translate-y-12", "opacity-0"),
            setTimeout(() => a.remove(), 400));
        }, 4e3));
    }));
});
