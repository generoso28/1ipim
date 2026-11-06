import { a as f } from "./auth-store.js";
import { g as u } from "./portal-config.js";
document.addEventListener("astro:page-load", () => {
  const b = document.getElementById("users-table-body"),
    g = document.getElementById("loading-users"),
    m = document.getElementById("no-users"),
    l = f.getToken(),
    w = f.getUser(),
    c = "https://1ipim.online/admin",
    x = w.id;
  let p = {};
  async function v() {
    try {
      const r = u(c);
      (
        await (
          await fetch(`${r}/wp-json/wp/v2/ministerio/?per_page=100`)
        ).json()
      ).forEach((e) => {
        p[e.id] = e.title.rendered;
      });
    } catch (r) {
      console.error("Erro ao mapear ministérios:", r);
    }
  }
  async function h() {
    try {
      (g && g.classList.remove("hidden"),
        m && m.classList.add("hidden"),
        b && (b.innerHTML = ""),
        await v());
      const r = u(c),
        s = await (
          await fetch(`${r}/wp-json/wp/v2/users/?context=edit&per_page=100`, {
            headers: { Authorization: `Bearer ${l}` },
          })
        ).json();
      if ((g && g.classList.add("hidden"), !s || s.length === 0)) {
        m && m.classList.remove("hidden");
        return;
      }
      b &&
        ((b.innerHTML = s
          .map((e) => {
            let a = [],
              t = [];
            try {
              ((a = JSON.parse(e.meta.ministries_requested || "[]")),
                (t = JSON.parse(e.meta.ministries_approved || "[]")));
            } catch {}
            const i = e.roles[0] || "subscriber",
              d = e.id == x,
              E =
                i === "administrator"
                  ? "bg-red-500 text-white"
                  : i === "editor"
                    ? "bg-purple-500 text-white"
                    : "bg-green-500 text-white",
              j =
                i === "administrator"
                  ? "Admin"
                  : i === "editor"
                    ? "Líder"
                    : "Voluntário";
            return `
                            <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 font-bold overflow-hidden shadow-inner text-lg">
                                            ${e.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span class="font-bold text-gray-900 dark:text-white">${e.name}</span>
                                                ${d ? '<span class="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase">Você</span>' : ""}
                                            </div>
                                            <div class="text-[10px] text-gray-400 font-medium">${e.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="flex flex-wrap gap-1.5">
                                        ${t.map((n) => `<span class="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-green-200 dark:border-green-800/50 whitespace-nowrap">✓ ${p[Number(n)] || n}</span>`).join("")}
                                        ${a
                                          .filter((n) => !t.includes(n))
                                          .map(
                                            (n) => `
                                            <button class="approve-min-btn bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-amber-200 dark:border-amber-800/50 hover:bg-amber-500 hover:text-white transition-all shadow-sm" data-uid="${e.id}" data-mid="${n}">
                                                Aprovar ${p[Number(n)] || n}
                                            </button>
                                        `,
                                          )
                                          .join("")}
                                        ${t.length === 0 && a.length === 0 ? '<span class="text-[10px] text-gray-300 italic">Nenhum vínculo</span>' : ""}
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-center">
                                    <span class="${E} px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm shadow-black/10">${j}</span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        ${
                                          d
                                            ? '<span class="text-[10px] text-gray-300 italic px-2">Gerenciado pelo WP</span>'
                                            : `
                                            <div class="relative group/menu">
                                                <button class="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] p-2 rounded-xl text-gray-400 hover:text-[var(--color-brand)] transition-all shadow-sm">
                                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                                </button>
                                                <div class="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 py-3 min-w-[200px] hidden group-hover/menu:block z-50 animate-slide-up">
                                                    <p class="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 mb-2">Alterar Nível</p>
                                                    <button class="promote-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${e.id}" data-to="administrator">
                                                        <i class="fa-solid fa-crown mr-2 text-amber-500"></i> Tornar Admin
                                                    </button>
                                                    <button class="promote-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${e.id}" data-to="editor">
                                                        <i class="fa-solid fa-user-shield mr-2 text-purple-500"></i> Tornar Líder
                                                    </button>
                                                    <button class="promote-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${e.id}" data-to="subscriber">
                                                        <i class="fa-solid fa-user mr-2 text-gray-400"></i> Rebaixar Membro
                                                    </button>
                                                    <div class="h-px bg-gray-50 dark:bg-slate-700 my-2 mx-4"></div>
                                                    <button class="delete-user-btn w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" data-id="${e.id}">
                                                        <i class="fa-solid fa-trash-can mr-2"></i> Excluir Conta
                                                    </button>
                                                </div>
                                            </div>
                                        `
                                        }
                                    </div>
                                </td>
                            </tr>
                        `;
          })
          .join("")),
        document.querySelectorAll(".approve-min-btn").forEach((e) => {
          e.onclick = () =>
            y(e.getAttribute("data-uid"), e.getAttribute("data-mid"));
        }),
        document.querySelectorAll(".promote-btn").forEach((e) => {
          e.onclick = () => {
            const a = e.getAttribute("data-id"),
              t = e.getAttribute("data-to"),
              i = s.find((d) => d.id == a);
            k(a, t, i?.meta?.ministries_approved || "[]");
          };
        }),
        document.querySelectorAll(".delete-user-btn").forEach((e) => {
          e.onclick = () => {
            confirm("Excluir este usuário permanentemente?") &&
              $(e.getAttribute("data-id"));
          };
        }));
    } catch (r) {
      (console.error(r),
        window.showToast("Erro ao carregar voluntários", "error"));
    }
  }
  async function y(r, o) {
    if (!(!r || !o))
      try {
        const s = u(c),
          a = await (
            await fetch(`${s}/wp-json/wp/v2/users/${r}/?context=edit`, {
              headers: { Authorization: `Bearer ${l}` },
            })
          ).json();
        let t = [];
        try {
          t = JSON.parse(a.meta.ministries_approved || "[]");
        } catch {}
        if (
          (t.includes(o) || t.push(o),
          !(
            await fetch(`${s}/wp-json/wp/v2/users/${r}/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${l}`,
              },
              body: JSON.stringify({
                meta: { ministries_approved: JSON.stringify(t) },
                roles: a.roles[0] === "subscriber" ? ["contributor"] : a.roles,
              }),
            })
          ).ok)
        )
          throw new Error();
        (window.showToast("Vínculo aprovado com sucesso!", "success"), h());
      } catch {
        window.showToast("Erro ao aprovar ministério", "error");
      }
  }
  async function k(r, o, s = "[]") {
    if (!r || !o) return;
    let e = JSON.parse(s || "[]");
    if (o === "editor") {
      const a = Object.entries(p)
          .map(([i, d]) => `${i} - ${d}`)
          .join("\\n"),
        t = prompt(
          `Para qual Ministério ele está sendo nomeado Líder?\\nDigite o ID correspondente:\\n\\n${a}`,
        );
      if (!t) {
        window.showToast("Operação cancelada.", "error");
        return;
      }
      if (!p[Number(t)]) {
        window.showToast("ID Inválido.", "error");
        return;
      }
      e.includes(t) || e.push(t);
    } else if (!confirm("Deseja alterar a função deste usuário?")) return;
    try {
      const a = u(c),
        t = { roles: [o] };
      if (
        (o === "editor" &&
          (t.meta = { ministries_approved: JSON.stringify(e) }),
        !(
          await fetch(`${a}/wp-json/wp/v2/users/${r}/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${l}`,
            },
            body: JSON.stringify(t),
          })
        ).ok)
      )
        throw new Error();
      (window.showToast(
        o === "editor"
          ? "Promovido a Líder com Vínculo!"
          : "Função atualizada!",
        "success",
      ),
        h());
    } catch {
      window.showToast("Erro ao atualizar função", "error");
    }
  }
  async function $(r) {
    if (r)
      try {
        const o = u(c);
        if (
          !(
            await fetch(
              `${o}/wp-json/wp/v2/users/${r}/?reassign=${x}&force=true`,
              { method: "DELETE", headers: { Authorization: `Bearer ${l}` } },
            )
          ).ok
        )
          throw new Error();
        (window.showToast("Usuário excluído", "success"), h());
      } catch {
        window.showToast("Erro ao excluir usuário", "error");
      }
  }
  h();
});
