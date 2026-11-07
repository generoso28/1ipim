import{o as h,a as $,g as j,b,c as m,s as L,e as o}from"./ui.Btndgru2.js";const d=e=>document.getElementById(e);let g=!1;function y(e,s){const t=d("requests-feedback");t&&(t.className="mb-6 p-4 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",t.textContent=s,t.classList.remove("hidden"))}function q(e){return e==="aprovado"?'<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aprovada</span>':e==="recusado"?'<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Recusada</span>':'<span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pendente</span>'}function _(e){const s=g?`<option value="colaborador" ${e.requested_role==="colaborador"?"selected":""}>Colaborador</option>
       <option value="lider" ${e.requested_role==="lider"?"selected":""}>Líder</option>`:'<option value="colaborador">Colaborador</option>';return`
    <article class="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="min-w-0">
          <h2 class="text-base font-black text-gray-900 dark:text-white truncate">${o(e.user_name)}</h2>
          <p class="text-xs text-gray-500 truncate">${o(e.user_email)}</p>
        </div>
        ${q(e.status)}
      </div>

      <div class="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-3">
        <p><span class="font-bold text-gray-900 dark:text-white">Ministério:</span> ${o(e.ministry_name)}</p>
        <p><span class="font-bold text-gray-900 dark:text-white">Enviada em:</span> ${o(e.created_at)}</p>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 mb-4">${o(e.motivo||"Sem justificativa.")}</p>

      ${e.review_note?`<p class="text-xs text-gray-500 mb-4"><span class="font-bold">Observação:</span> ${o(e.review_note)}</p>`:""}

      ${e.status==="pendente"?`
        <div class="flex flex-wrap items-center gap-2">
          <select data-role="${e.id}" class="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none">
            ${s}
          </select>
          <button data-approve="${e.id}" class="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            <i class="fa-solid fa-check mr-1"></i> Aprovar
          </button>
          <button data-reject="${e.id}" class="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">
            Recusar
          </button>
        </div>
      `:""}
    </article>
  `}h("#requests-list",()=>{(async()=>{const e=await $.ensureSession();if(!e)return;const s=j(e);if(!s.canApproveAccess){window.location.href="/portal/";return}const t=d("requests-list"),l=d("requests-empty"),x=d("requests-loading"),f=d("requests-status");let p=[];try{const a=await b("/wp-json/1ipim/v1/me/portal-access");a.ok&&(g=!!(await a.json()).is_global)}catch{g=s.isAdmin}function k(){if(t){if(p.length===0){t.innerHTML="",l?.classList.remove("hidden");return}l?.classList.add("hidden"),t.innerHTML=p.map(_).join("")}}async function u(){x?.classList.remove("hidden"),l?.classList.add("hidden"),t&&(t.innerHTML="");try{const a=f?.value||"pendente",r=await b(`/wp-json/1ipim/v1/admin/access-requests?status=${a}`);if(!r.ok)throw new Error("Não foi possível carregar as solicitações.");p=await r.json(),k()}catch(a){y("error",m(a,"Não foi possível carregar as solicitações."))}finally{x?.classList.add("hidden")}}async function v(a,r){const i=document.querySelector(`[data-role="${a}"]`)?.value||"colaborador";let n="";r==="reject"&&(n=window.prompt("Motivo da recusa (opcional):")||"");try{const c=await b(`/wp-json/1ipim/v1/admin/access-requests/${a}/${r}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:i,note:n})});if(!c.ok){const w=await c.json().catch(()=>({}));throw new Error(w.error==="role_forbidden"?"Apenas admin/pastor pode aprovar como líder.":"Não foi possível concluir a ação.")}L(r==="approve"?"Solicitação aprovada.":"Solicitação recusada.","success"),await u()}catch(c){y("error",m(c,"Não foi possível concluir a ação."))}}t?.addEventListener("click",a=>{const r=a.target,i=r.closest("[data-approve]"),n=r.closest("[data-reject]");i?v(Number(i.dataset.approve),"approve"):n&&v(Number(n.dataset.reject),"reject")}),f?.addEventListener("change",()=>{u()}),await u()})()});
