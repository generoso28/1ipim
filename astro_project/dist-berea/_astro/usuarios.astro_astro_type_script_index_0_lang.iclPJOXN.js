import{o as te,a as U,b as c,e as d,s as n,d as B}from"./ui.Btndgru2.js";const f={administrator:{badgeClass:"bg-red-700 text-white",label:"Admin"},pastor:{badgeClass:"bg-blue-700 text-white",label:"Pastor"},lider_ministerio:{badgeClass:"bg-purple-700 text-white",label:"Líder"},colaborador_ministerio:{badgeClass:"bg-green-700 text-white",label:"Voluntário"},subscriber:{badgeClass:"bg-slate-700 text-white",label:"Membro"}};function re(l){const i=l||[];return i.includes("administrator")?f.administrator:i.includes("pastor")?f.pastor:i.includes("editor")||i.includes("lider_ministerio")?f.lider_ministerio:i.includes("contributor")||i.includes("colaborador_ministerio")?f.colaborador_ministerio:f.subscriber}function O(l){try{const i=JSON.parse(l||"[]");return Array.isArray(i)?i.map(String):[]}catch{return[]}}te("#users-table-body",async()=>{const l=document.getElementById("users-table-body"),i=document.getElementById("loading-users"),_=document.getElementById("no-users"),T=document.getElementById("users-stats"),j=document.getElementById("users-search"),M=document.getElementById("users-role"),v=document.getElementById("users-ministry"),I=document.getElementById("users-pending"),R=document.getElementById("users-page-info"),$=document.getElementById("users-prev"),L=document.getElementById("users-next"),x=document.getElementById("role-modal"),q=document.getElementById("role-modal-title"),p=document.getElementById("role-select"),A=document.getElementById("role-ministry"),F=document.getElementById("role-ministry-field"),u=document.getElementById("role-feedback"),m=document.getElementById("role-save"),g=await U.ensureSession()??U.getUser();if(!(!!(g.isAdmin||g.isPastor)||g.role==="administrator"||g.role==="pastor")){window.location.href="/portal/";return}let h=[],y=[];const S={};let w=null;const r={q:"",role:"",ministry:"",pending:!1,page:1,pages:1,total:0,stats:{}};async function H(){try{y=await(await c("/wp-json/1ipim/v1/ministries?manage=1")).json(),y.forEach(t=>{S[t.id]=t.title.rendered}),v&&(v.innerHTML='<option value="">Todos os ministérios</option>'+y.map(t=>`<option value="${t.id}">${d(t.title.rendered)}</option>`).join("")),A&&(A.innerHTML=y.map(t=>`<option value="${t.id}">${d(t.title.rendered)}</option>`).join(""))}catch(e){console.error("Erro ao mapear ministérios:",e)}}function V(e){return`<span class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-green-200 dark:border-green-800/50 whitespace-nowrap">✓ ${d(S[Number(e)]||e)}</span>`}function z(e,t){return`
      <button class="approve-min-btn bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-amber-200 dark:border-amber-800/50 hover:bg-amber-600 hover:text-white transition-all shadow-sm" data-uid="${e.id}" data-mid="${B(t)}">
        Aprovar ${d(S[Number(t)]||t)}
      </button>
    `}function J(e){const t=O(e.meta?.ministries_requested),a=O(e.meta?.ministries_approved),s=re(e.roles),E=String(e.id)===String(g.id),N=e.account_type==="bible_rats"&&!e.email_verified;return`
      <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group">
        <td class="px-8 py-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold overflow-hidden shadow-inner text-lg">
              ${d((e.name||"?").charAt(0).toUpperCase())}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-white">${d(e.name)}</span>
                ${E?'<span class="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase">Você</span>':""}
                ${N?'<span class="text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-black uppercase">E-mail pendente</span>':""}
              </div>
              <div class="text-[10px] text-gray-500 font-medium">${d(e.email)}</div>
            </div>
          </div>
        </td>
        <td class="px-8 py-6">
          <div class="flex flex-wrap gap-1.5">
            ${a.map(b=>V(b)).join("")}
            ${t.filter(b=>!a.includes(b)).map(b=>z(e,b)).join("")}
            ${a.length===0&&t.length===0?'<span class="text-[10px] text-gray-500 italic">Nenhum vínculo</span>':""}
          </div>
        </td>
        <td class="px-8 py-6 text-center">
          <span class="${s.badgeClass} px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm shadow-black/10">${s.label}</span>
        </td>
        <td class="px-8 py-6 text-right">
          <div class="flex items-center justify-end gap-2">
            ${E?'<span class="text-[10px] text-gray-500 italic px-2">Gerenciado pelo WP</span>':`
                  <div class="relative group/menu">
                    <button aria-label="Ações de ${B(e.name)}" aria-haspopup="true" class="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] p-2 rounded-xl text-gray-500 hover:text-[var(--color-brand)] transition-all shadow-sm">
                      <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 py-3 min-w-[220px] hidden group-hover/menu:block group-focus-within/menu:block z-50 animate-slide-up">
                      <p class="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-700 mb-2">Alterar papel</p>
                      <button class="role-action-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${e.id}" data-role="administrator">
                        <i class="fa-solid fa-crown mr-2 text-amber-600"></i> Tornar Admin
                      </button>
                      <button class="role-action-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${e.id}" data-role="lider_ministerio">
                        <i class="fa-solid fa-user-shield mr-2 text-purple-600"></i> Tornar Líder
                      </button>
                      <button class="role-action-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-[var(--color-brand)]" data-id="${e.id}" data-role="assinante">
                        <i class="fa-solid fa-user mr-2 text-gray-500"></i> Rebaixar Membro
                      </button>
                      ${N?`
                            <div class="h-px bg-gray-50 dark:bg-slate-700 my-2 mx-4"></div>
                            <button class="verify-email-btn w-full text-left px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20" data-id="${e.id}">
                              <i class="fa-solid fa-envelope-circle-check mr-2"></i> Verificar e-mail
                            </button>
                            <button class="resend-email-btn w-full text-left px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700" data-id="${e.id}">
                              <i class="fa-solid fa-rotate-right mr-2"></i> Reenviar confirmação
                            </button>
                          `:""}
                      <div class="h-px bg-gray-50 dark:bg-slate-700 my-2 mx-4"></div>
                      <button class="delete-user-btn w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" data-id="${e.id}">
                        <i class="fa-solid fa-trash-can mr-2"></i> Excluir Conta
                      </button>
                    </div>
                  </div>
                `}
          </div>
        </td>
      </tr>
    `}function D(){if(!T)return;const e=[["Total",r.stats.total??0,"fa-users"],["Pendentes",r.stats.pending??0,"fa-triangle-exclamation"],["Bible Rats",r.stats.bible_rats??0,"fa-book-open"],["E-mail pendente",r.stats.unverified??0,"fa-envelope"]];T.innerHTML=e.map(([t,a,s])=>`
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">${d(t)}</span>
              <i class="fa-solid ${B(s)} text-[var(--color-brand)]"></i>
            </div>
            <p class="text-2xl font-black text-gray-900 dark:text-white">${d(a)}</p>
          </div>
        `).join("")}function G(){R&&(R.innerText=`Página ${r.page} de ${r.pages} · ${r.total} voluntários`),$&&($.disabled=r.page<=1),L&&(L.disabled=r.page>=r.pages)}function W(){document.querySelectorAll(".approve-min-btn").forEach(e=>{e.onclick=()=>{Z(e.getAttribute("data-uid")||"",e.getAttribute("data-mid")||"")}}),document.querySelectorAll(".role-action-btn").forEach(e=>{e.onclick=()=>{const t=e.getAttribute("data-id")||"",a=e.getAttribute("data-role")||"assinante",s=h.find(E=>String(E.id)===t);s&&K(s,a)}}),document.querySelectorAll(".verify-email-btn").forEach(e=>{e.onclick=()=>{X(e.getAttribute("data-id")||"")}}),document.querySelectorAll(".resend-email-btn").forEach(e=>{e.onclick=()=>{Y(e.getAttribute("data-id")||"")}}),document.querySelectorAll(".delete-user-btn").forEach(e=>{e.onclick=()=>{confirm("Excluir este usuário permanentemente?")&&ee(e.getAttribute("data-id")||"")}})}async function o(){i?.classList.remove("hidden"),_?.classList.add("hidden"),l&&(l.innerHTML="");const e=new URLSearchParams({per_page:"20",page:String(r.page)});r.q&&e.set("q",r.q),r.role&&e.set("role",r.role),r.ministry&&e.set("ministry",r.ministry),r.pending&&e.set("pending","1");try{const t=await c(`/wp-json/1ipim/v1/admin/users?${e.toString()}`);if(!t.ok)throw new Error("Falha ao carregar voluntários");const a=await t.json();if(h=a.items||[],r.total=a.total||0,r.pages=Math.max(1,a.pages||1),r.stats=a.stats||{},i?.classList.add("hidden"),D(),G(),h.length===0){_?.classList.remove("hidden");return}l&&(l.innerHTML=h.map(J).join("")),W()}catch(t){console.error(t),i&&(i.innerText="Erro ao carregar voluntários."),n("Erro ao carregar voluntários","error")}}function K(e,t){w=e,q&&(q.innerText=`Alterar papel de ${e.name}`),p&&(p.value=t),F?.classList.toggle("hidden",!["lider_ministerio","colaborador_ministerio"].includes(t)),u?.classList.add("hidden"),x?.classList.remove("hidden")}function k(){x?.classList.add("hidden"),w=null}function P(e){u&&(u.innerText=e,u.className="p-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",u.classList.remove("hidden"))}async function Q(){if(!w||!p)return;const e=p.value,t=["lider_ministerio","colaborador_ministerio"].includes(e)?Number(A?.value||0):0;if(["lider_ministerio","colaborador_ministerio"].includes(e)&&!t){P("Selecione o ministério.");return}m&&(m.disabled=!0);try{const a=await c(`/wp-json/1ipim/v1/users/${w.id}/role`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:e,ministry_id:t})});if(!a.ok){const s=await a.json().catch(()=>({}));throw new Error(s?.message||"Falha ao atualizar papel")}n("Papel atualizado!","success"),k(),await o()}catch(a){P(a instanceof Error?a.message:"Erro ao atualizar papel")}finally{m&&(m.disabled=!1)}}async function X(e){if(e)try{if(!(await c(`/wp-json/1ipim/v1/admin/users/${e}/verify-email`,{method:"POST"})).ok)throw new Error("Falha ao verificar e-mail");n("E-mail verificado manualmente","success"),await o()}catch{n("Erro ao verificar e-mail","error")}}async function Y(e){if(e)try{const t=await c(`/wp-json/1ipim/v1/admin/users/${e}/resend-verification`,{method:"POST"}),a=await t.json().catch(()=>({}));if(!t.ok)throw new Error(a?.message||"Falha ao reenviar");n(a.sent?"Confirmação reenviada":"O envio falhou; use a verificação manual.",a.sent?"success":"error"),await o()}catch{n("Erro ao reenviar confirmação","error")}}async function Z(e,t){if(!(!e||!t))try{if(!(await c(`/wp-json/1ipim/v1/ministries/${t}/members`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:Number(e),role:"colaborador"})})).ok)throw new Error("Falha ao aprovar vínculo");n("Vínculo aprovado com sucesso!","success"),await o()}catch{n("Erro ao aprovar ministério","error")}}async function ee(e){if(e)try{if(!(await c(`/wp-json/1ipim/v1/users/${e}`,{method:"DELETE"})).ok)throw new Error("Falha ao excluir usuário");n("Usuário excluído","success"),await o()}catch{n("Erro ao excluir usuário","error")}}let C=0;j?.addEventListener("input",()=>{window.clearTimeout(C),C=window.setTimeout(()=>{r.q=j.value.trim(),r.page=1,o()},350)}),M?.addEventListener("change",()=>{r.role=M.value,r.page=1,o()}),v?.addEventListener("change",()=>{r.ministry=v.value,r.page=1,o()}),I?.addEventListener("change",()=>{r.pending=I.checked,r.page=1,o()}),$?.addEventListener("click",()=>{r.page<=1||(r.page--,o())}),L?.addEventListener("click",()=>{r.page>=r.pages||(r.page++,o())}),p?.addEventListener("change",()=>{F?.classList.toggle("hidden",!["lider_ministerio","colaborador_ministerio"].includes(p.value))}),document.getElementById("role-modal-close")?.addEventListener("click",k),document.getElementById("role-cancel")?.addEventListener("click",k),x?.addEventListener("click",e=>{e.target===x&&k()}),m?.addEventListener("click",()=>{Q()}),await H(),await o()});
