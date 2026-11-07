import{B as v,a as E}from"./api.BQZs3I30.js";let o=null,p=null;function z(){const e=localStorage.getItem("1ipim_auth_nonce");e&&(p=e)}function $(e){return`${E}${e}`}async function c(e,t={}){const a={Accept:"application/json",...t.headers};p&&(a["X-WP-Nonce"]=p);const r=await fetch($(e),{credentials:"include",...t,headers:a});if(r.status===401||r.status===403)throw window.location.href=`${v.replace("berea","portal")}/login?redirect=${encodeURIComponent(window.location.href)}`,new Error("Sessão expirada");if(!r.ok){const n=await r.json().catch(()=>({}));throw new Error(n.message||`Erro ${r.status}`)}return r.json()}async function L(){try{const e=await c("/me");return o=e,p=e.user?localStorage.getItem("1ipim_auth_nonce")||"":null,!0}catch(e){return e instanceof Error&&e.message==="Sessão expirada",!1}}function l(e){document.querySelectorAll(".view").forEach(a=>a.classList.add("hidden")),document.querySelectorAll(".view").forEach(a=>a.classList.remove("active"));const t=document.getElementById(`view-${e}`);switch(t&&(t.classList.remove("hidden"),t.classList.add("active")),document.querySelectorAll("[data-tab]").forEach(a=>{a.getAttribute("data-tab")===e?(a.classList.add("active"),a.setAttribute("aria-current","page")):(a.classList.remove("active"),a.removeAttribute("aria-current"))}),e){case"feed":C();break;case"diario":T();break;case"plano":y();break;case"salas":f();break;case"perfil":R();break}}function S(){if(!o)return;const e=document.getElementById("user-initials"),t=document.getElementById("user-name"),a=document.getElementById("user-streak");e&&(e.textContent=o.user.iniciais),t&&(t.textContent=o.user.nome),a&&(a.textContent=`Streak: ${o.streak.atual} dias`)}async function C(){if(!o)return;const e=document.getElementById("feed-list");if(e){e.innerHTML='<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl animate-spin">refresh</span></div>';try{const t=await c("/feed");I(t.items,e)}catch(t){console.error("Erro ao carregar feed:",t),e.innerHTML='<div class="text-center py-8 text-red-500">Erro ao carregar feed</div>'}}}function I(e,t){if(e.length===0){t.innerHTML=`
      <div class="empty-state">
        <span class="material-symbols-outlined">menu_book</span>
        <p>Nenhum check-in ainda. Seja o primeiro a compartilhar!</p>
      </div>
    `;return}t.innerHTML=e.map(a=>_(a)).join(""),t.querySelectorAll("[data-reaction]").forEach(a=>{a.addEventListener("click",A)})}function _(e){const t=e.tipo==="encontro",a=new Date(e.data).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}),r=new Date(e.created_at||e.data).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});let n="";t?n=`
      <div class="mb-3 p-3 bg-berea-comunhao/10 dark:bg-berea-comunhao/20 rounded-xl border border-berea-comunhao/20">
        <div class="flex items-center gap-2 text-sm text-berea-comunhao dark:text-berea-comunhao font-medium mb-2">
          <span class="material-symbols-outlined text-base">event</span>
          <span>Encontro - ${e.grupo_nome||"Grupo"}</span>
        </div>
        ${e.texto_lido?`<p class="font-cormorant text-zinc-700 dark:text-zinc-300 mb-1"><strong>Texto:</strong> ${i(e.texto_lido)}</p>`:""}
        ${e.tema?`<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-1"><strong>Tema:</strong> ${i(e.tema)}</p>`:""}
        ${e.preletor?`<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-1"><strong>Preletor:</strong> ${i(e.preletor)}</p>`:""}
        ${e.publico_presente?`<p class="text-sm text-zinc-600 dark:text-zinc-400"><strong>Presentes:</strong> ${e.publico_presente} pessoas</p>`:""}
      </div>
    `:n=`
      <p class="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mb-3">${i(e.texto||"")}</p>
      ${e.foto_url?`<img src="${e.foto_url}" alt="Foto do check-in" class="rounded-xl max-h-64 w-auto mb-3">`:""}
      ${e.plan_titulo?`<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-berea-partir-pao text-zinc-900 rounded-full mb-2">${i(e.plan_titulo)} - Dia ${e.plan_day}</span>`:""}
    `;const s=e.reacoes?Object.entries(e.reacoes).map(([d,m])=>{const w=B(d),x=e.minha_reacao===d;return`<button type="button" data-reaction="${d}" data-checkin="${e.id}" class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${x?"bg-berea-doutrina/20 text-berea-doutrina":"text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"} transition-colors" ${x?'aria-pressed="true"':""}>
      <span class="material-symbols-outlined text-base">${w}</span>
      <span>${m}</span>
    </button>`}).join(""):"";return`
    <article class="berea-card checkin-card animate-slide-up" data-checkin-id="${e.id}">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-berea-doutrina flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
          ${e.autor.iniciais}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-zinc-900 dark:text-white">${i(e.autor.nome)}</span>
              ${e.is_own?'<span class="text-xs text-zinc-400 dark:text-zinc-500">(você)</span>':""}
            </div>
            <span class="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">${a} ${r}</span>
          </div>
          ${n}
          <div class="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <div class="flex items-center gap-1">${s}</div>
            <button type="button" data-comment="${e.id}" class="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <span class="material-symbols-outlined text-base">chat</span>
              <span>${e.comentarios||0}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `}function B(e){switch(e){case"amem":return"favorite";case"oracao":return"self_improvement";case"coracao":return"favorite_border";case"fogo":return"local_fire_department";default:return"favorite"}}async function A(e){const t=e.currentTarget,a=t.getAttribute("data-checkin"),r=t.getAttribute("data-reaction");if(!(!a||!r))try{await c("/reaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:parseInt(a),tipo:r})});const n=t.querySelector("span:last-child");if(n){const s=parseInt(n.textContent||"0");t.getAttribute("aria-pressed")==="true"?(n.textContent=String(s-1),t.setAttribute("aria-pressed","false"),t.classList.remove("bg-berea-doutrina/20","text-berea-doutrina"),t.classList.add("text-zinc-500","dark:text-zinc-400")):(n.textContent=String(s+1),t.setAttribute("aria-pressed","true"),t.classList.add("bg-berea-doutrina/20","text-berea-doutrina"),t.classList.remove("text-zinc-500","dark:text-zinc-400"))}}catch(n){console.error("Erro ao reagir:",n)}}async function T(){const e=document.getElementById("view-diario");e&&(e.innerHTML='<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl mb-2 block">book</span><p>Seus check-ins privados aparecerão aqui.</p></div>')}async function y(){const e=document.getElementById("view-plano");if(e){e.innerHTML='<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl mb-2 block">calendar_month</span><p>Carregando plano...</p></div>';try{const t=await c("/plan");j(t.plan,t.available,e)}catch(t){console.error("Erro ao carregar plano:",t),e.innerHTML='<div class="text-center py-8 text-red-500">Erro ao carregar plano</div>'}}}function j(e,t,a){if(!e){a.innerHTML=`
      <div class="space-y-4">
        <div class="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <span class="material-symbols-outlined text-4xl mb-2 block">calendar_month</span>
          <p>Nenhum plano ativo. Escolha um para começar:</p>
        </div>
        <div class="grid gap-4">${t.map(n=>`
          <button type="button" data-plan-start="${n.id}" class="berea-card p-6 text-left hover:border-berea-doutrina transition-colors">
            <h3 class="font-cormorant text-xl font-bold text-zinc-900 dark:text-white mb-1">${i(n.titulo)}</h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">${i(n.descricao)}</p>
            <div class="flex items-center gap-4 text-sm text-zinc-500">
              <span>${n.dias} dias</span>
              <span>${n.traducao}</span>
            </div>
          </button>
        `).join("")}</div>
      </div>
    `,a.querySelectorAll("[data-plan-start]").forEach(n=>{n.addEventListener("click",async s=>{const d=s.currentTarget.getAttribute("data-plan-start");d&&await M(parseInt(d))})});return}const r=e.current_day>e.dias?100:Math.round(e.current_day/e.dias*100);a.innerHTML=`
    <div class="space-y-6">
      <div class="berea-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-cormorant text-xl font-bold text-zinc-900 dark:text-white">${i(e.titulo)}</h3>
          <span class="badge-streak"><span class="material-symbols-outlined">local_fire_department</span> ${o?.streak.atual||0} dias</span>
        </div>
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
          <div class="h-full bg-berea-amber-500 rounded-full transition-all duration-500" style="width: ${r}%"></div>
        </div>
        <div class="flex justify-between text-sm text-zinc-500">
          <span>Dia ${e.current_day} de ${e.dias}</span>
          <span>${r}% concluído</span>
        </div>
      </div>
      <div>
        <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-3">Dias do plano</h4>
        <div class="grid gap-2">${e.days.map(n=>`
          <button type="button" data-plan-day="${n.dia}" class="berea-card p-4 text-left ${n.concluido?"border-berea-amber-500 bg-berea-amber-500/5":"hover:border-berea-doutrina"} transition-colors">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-zinc-900 dark:text-white">Dia ${n.dia}</span>
                <span class="text-sm text-zinc-500 ml-2">${i(n.passagem)}</span>
              </div>
              ${n.concluido?'<span class="material-symbols-outlined text-berea-amber-500">check_circle</span>':'<span class="material-symbols-outlined text-zinc-400">radio_button_unchecked</span>'}
            </div>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">${i(n.reflexao)}</p>
          </button>
        `).join("")}</div>
      </div>
    </div>
  `,a.querySelectorAll("[data-plan-day]").forEach(n=>{n.addEventListener("click",()=>{n.getAttribute("data-plan-day")&&b()})})}async function M(e){try{await c("/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan_id:e})}),y()}catch(t){console.error("Erro ao iniciar plano:",t)}}function b(e){const t=document.getElementById("checkin-modal"),a=document.getElementById("modal-backdrop"),r=document.getElementById("checkin-rooms");t&&a&&(t.classList.remove("hidden"),a.classList.remove("hidden"),document.body.style.overflow="hidden",r&&o&&(r.innerHTML=o.rooms.map(n=>`
        <label class="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
          <input type="checkbox" name="rooms" value="${n.id}" class="w-5 h-5 text-berea-doutrina rounded border-zinc-300 focus:ring-berea-doutrina">
          <span class="font-medium text-zinc-900 dark:text-white">${i(n.nome)}</span>
          ${n.tipo==="pg"?'<span class="text-xs px-2 py-0.5 bg-berea-comunhao/20 text-berea-comunhao rounded-full">PG</span>':""}
        </label>
      `).join("")))}function u(){const e=document.getElementById("checkin-modal"),t=document.getElementById("modal-backdrop");e&&t&&(e.classList.add("hidden"),t.classList.add("hidden"),document.body.style.overflow="")}async function f(){const e=document.getElementById("view-salas");if(e){e.innerHTML='<div class="text-center py-8 text-zinc-500 dark:text-zinc-400"><span class="material-symbols-outlined text-4xl mb-2 block">groups</span><p>Carregando salas...</p></div>';try{const t=await c("/room");P(t.minhas,t.descobrir,e)}catch(t){console.error("Erro ao carregar salas:",t),e.innerHTML='<div class="text-center py-8 text-red-500">Erro ao carregar salas</div>'}}}function P(e,t,a){let r="";e.length>0&&(r+=`
      <h3 class="font-medium text-zinc-700 dark:text-zinc-300 mb-3">Minhas salas</h3>
      <div class="grid gap-3 mb-6">${e.map(s=>g(s,!0)).join("")}</div>
    `),t.length>0&&(r+=`
      <h3 class="font-medium text-zinc-700 dark:text-zinc-300 mb-3">Descobrir salas</h3>
      <div class="grid gap-3">${t.map(s=>g(s,!1)).join("")}</div>
    `),e.length===0&&t.length===0&&(r=`
      <div class="empty-state">
        <span class="material-symbols-outlined">groups</span>
        <p>Você não participa de nenhuma sala ainda.</p>
        <button type="button" id="create-room-btn" class="mt-4 btn-primary px-6 py-3">
          <span class="material-symbols-outlined mr-2">add</span> Criar sala
        </button>
      </div>
    `),a.innerHTML=r,a.querySelectorAll("[data-room-join]").forEach(s=>{s.addEventListener("click",async d=>{const m=d.currentTarget.getAttribute("data-room-join");m&&await D(parseInt(m))})});const n=document.getElementById("create-room-btn");n&&n.addEventListener("click",()=>H())}function g(e,t){return`
    <article class="berea-card p-4 flex items-center gap-4">
      <div class="room-avatar ${q(e.tipo)}" style="width: 48px; height: 48px; font-size: 1.125rem;">
        ${i(e.nome.charAt(0).toUpperCase())}
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-zinc-900 dark:text-white truncate">${i(e.nome)}</h4>
        <div class="flex items-center gap-2 text-sm text-zinc-500 mt-1">
          <span class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">${e.membros} membros</span>
          ${e.tipo==="pg"?'<span class="px-2 py-0.5 bg-berea-comunhao/20 text-berea-comunhao rounded-full text-xs">PG</span>':""}
          ${e.tipo==="ministerio"?'<span class="px-2 py-0.5 bg-berea-doutrina/20 text-berea-doutrina rounded-full text-xs">Ministério</span>':""}
        </div>
      </div>
      ${t?`
        <span class="text-sm font-medium text-berea-doutrina">Você participa</span>
      `:`
        <button type="button" data-room-join="${e.id}" class="btn-secondary px-4 py-2 text-sm">Entrar</button>
      `}
    </article>
  `}function q(e){switch(e){case"pg":return"bg-berea-comunhao";case"ministerio":return"bg-berea-doutrina";default:return"bg-berea-oracoes"}}async function D(e){try{await c(`/room/${e}/join`,{method:"POST"}),f()}catch(t){console.error("Erro ao entrar na sala:",t)}}function H(){const e=prompt("Nome da nova sala:");e&&O(e)}async function O(e){try{await c("/room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome:e})}),f()}catch(t){console.error("Erro ao criar sala:",t)}}async function R(){const e=document.getElementById("view-perfil");if(!e||!o)return;e.innerHTML=`
    <div class="space-y-6">
      <div class="berea-card p-6 text-center">
        <div class="w-24 h-24 rounded-full bg-berea-doutrina flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          ${o.user.iniciais}
        </div>
        <h3 class="font-cormorant text-2xl font-bold text-zinc-900 dark:text-white">${i(o.user.nome)}</h3>
        <p class="text-zinc-500 dark:text-zinc-400 mt-1">ID: ${o.user.id}</p>
      </div>

      <div class="berea-card p-6">
        <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined">local_fire_department</span>
          Streak
        </h4>
        <div class="flex items-center gap-4">
          <div class="streak-display">
            <span class="material-symbols-outlined">local_fire_department</span>
            <span>${o.streak.atual} dias</span>
          </div>
          <div class="text-zinc-600 dark:text-zinc-400">
            Recorde: ${o.streak.recorde} dias
          </div>
        </div>
      </div>

      ${o.badges.length>0?`
        <div class="berea-card p-6">
          <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined">workspace_premium</span>
            Conquistas
          </h4>
          <div class="flex flex-wrap gap-2">
            ${o.badges.map(r=>`
              <span class="badge-streak">
                <span class="material-symbols-outlined">${r.icon}</span>
                ${i(r.label)}
              </span>
            `).join("")}
          </div>
        </div>
      `:""}

      <div class="berea-card p-6">
        <h4 class="font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined">settings</span>
          Configurações
        </h4>
        <div class="space-y-4">
          <label class="flex items-center justify-between">
            <span class="text-zinc-700 dark:text-zinc-300">Modo escuro</span>
            <button type="button" id="theme-toggle-profile" class="w-12 h-7 rounded-full bg-zinc-300 dark:bg-zinc-600 relative transition-colors" role="switch" aria-checked="${document.documentElement.classList.contains("dark")}">
              <span class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${document.documentElement.classList.contains("dark")?"translate-x-5":""}"></span>
            </button>
          </label>
          <label class="flex items-center justify-between">
            <span class="text-zinc-700 dark:text-zinc-300">Participar do ranking</span>
            <input type="checkbox" id="ranking-optin" ${o.profile.ranking_optin?"checked":""} class="w-5 h-5 text-berea-doutrina rounded border-zinc-300 focus:ring-berea-doutrina">
          </label>
        </div>
      </div>
    </div>
  `;const t=document.getElementById("theme-toggle-profile");t&&t.addEventListener("click",k);const a=document.getElementById("ranking-optin");a&&a.addEventListener("change",N)}function k(){document.documentElement.classList.toggle("dark"),localStorage.setItem("berea-theme",document.documentElement.classList.contains("dark")?"dark":"light")}function N(){}function i(e){return e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function F(){document.querySelectorAll("[data-tab]").forEach(a=>{a.addEventListener("click",r=>{r.preventDefault();const n=r.currentTarget.getAttribute("data-tab");n&&(l(n),history.pushState({view:n},"",`/${n}`))})}),document.querySelectorAll("#bottom-tabs a[data-tab]").forEach(a=>{a.addEventListener("click",r=>{const n=r.currentTarget.getAttribute("data-tab");n&&n!=="checkin"&&(r.preventDefault(),l(n),history.pushState({view:n},"",`/${n}`))})});const e=document.getElementById("fab-checkin");e&&e.addEventListener("click",a=>{a.preventDefault(),b()}),document.getElementById("close-modal")?.addEventListener("click",u),document.getElementById("modal-backdrop")?.addEventListener("click",u),document.getElementById("cancel-checkin")?.addEventListener("click",u);const t=document.getElementById("checkin-form");t&&t.addEventListener("submit",G),document.getElementById("theme-toggle")?.addEventListener("click",k),document.getElementById("menu-toggle")?.addEventListener("click",U),document.getElementById("sidebar-backdrop")?.addEventListener("click",V)}function U(){const e=document.getElementById("left-rail"),t=document.getElementById("sidebar-backdrop");if(e&&t){const a=e.classList.toggle("translate-x-0");e.classList.toggle("-translate-x-full",!a),t.classList.toggle("hidden",!a)}}function V(){const e=document.getElementById("left-rail"),t=document.getElementById("sidebar-backdrop");e&&t&&(e.classList.add("-translate-x-full"),e.classList.remove("translate-x-0"),t.classList.add("hidden"))}async function G(e){e.preventDefault();const t=e.target,a=t.querySelector("#checkin-texto").value.trim(),r=t.querySelectorAll('input[name="rooms"]:checked');if(!a)return;const n=Array.from(r).map(s=>parseInt(s.value));try{const s=t.querySelector('button[type="submit"]');s.disabled=!0,s.textContent="Publicando...",await c("/checkin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto:a,room_ids:n})}),u(),l("feed")}catch(s){console.error("Erro ao fazer check-in:",s),alert("Erro ao publicar check-in. Tente novamente.")}finally{const s=t.querySelector('button[type="submit"]');s.disabled=!1,s.textContent="Publicar"}}async function h(){const e=localStorage.getItem("berea-theme");if((e==="dark"||!e&&window.matchMedia("(prefers-color-scheme: dark)").matches)&&document.documentElement.classList.add("dark"),z(),!await L()){const s=v.replace("berea","portal")+"/login";window.location.href=`${s}?redirect=${encodeURIComponent(window.location.href)}`;return}S(),F();const a=window.location.pathname.replace(/^\//,"")||"feed",n=["feed","diario","plano","salas","perfil"].includes(a)?a:"feed";l(n),window.addEventListener("popstate",s=>{s.state?.view&&l(s.state.view)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",h):h();window.bereaApp={showView:l,openCheckinModal:b,closeCheckinModal:u,apiFetch:c};
