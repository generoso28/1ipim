import{o as ve,a as te,g as ye,s as g,b as $,e as x,d as o}from"./ui.Btndgru2.js";const ae=["active","bg-[var(--color-brand)]","text-white","shadow-lg","shadow-[var(--color-brand)]/20"],re=["text-gray-500","hover:bg-gray-50","dark:hover:bg-slate-700"],se=["active","bg-white","dark:bg-slate-700","text-gray-900","dark:text-white","shadow-sm"],ne=["text-gray-500","hover:text-gray-900","dark:hover:text-white"];function he(p){return(p||"").replace(/<[^>]*>/g,"").replace(/\\n/g,"").trim()}function we(p){return he(p.content?.rendered).split("|")}async function V(p){return await p.json().catch(()=>({}))}function ie(p){const E=p.data?.conflicts||[];if(E.length===0)return p.message||"Conflito de escala.";const y=E.map(A=>`• ${A.ministry||"Ministério"} — ${A.date||""} às ${A.start||""}`);return`${p.message||"Conflito de escala."}

${y.join(`
`)}`}function z(p,E){if(!E)return g(ie(p),"error"),null;if(!confirm(`${ie(p)}

Autorizar mesmo assim?`))return null;const y=prompt("Justificativa para autorizar o conflito (obrigatória):");return!y||!y.trim()?(g("A autorização exige justificativa.","error"),null):{reason:y.trim()}}ve("#form-container",async()=>{const p=document.getElementById("form-container"),E=document.getElementById("list-container"),y=document.getElementById("list-view"),A=document.getElementById("loading-scales"),R=document.getElementById("scale-ministry"),M=document.getElementById("volunteers-select"),J=document.querySelectorAll(".filter-tab"),P=document.getElementById("add-scale-form"),v=document.getElementById("scale-modal"),C=document.getElementById("modal-content"),q=document.getElementById("modal-title"),G=document.getElementById("close-modal"),S=document.getElementById("calendar-view"),W=document.querySelectorAll(".view-toggle"),Q=document.getElementById("page-title"),I=await te.ensureSession()??te.getUser(),U=ye(I),B=U.isAdmin||U.isPrivileged,D={};let _=[],Y=[],F=new Date;const O={active:"all"},oe=document.querySelector(".filter-tab.active");O.active=oe?.getAttribute("data-filter")||"all",B||(p&&(p.style.display="none"),E&&(E.className="lg:col-span-12 space-y-4"),Q&&(Q.innerText="Minhas Participações"));async function de(){try{const r=await(await $(B?"/wp-json/1ipim/v1/ministries?manage=1":"/wp-json/wp/v2/ministerio/?per_page=100")).json();r.forEach(a=>{D[a.id]=a.title.rendered}),R&&(R.innerHTML='<option value="">Selecione...</option>'+r.map(a=>`<option value="${a.id}">${x(a.title.rendered)}</option>`).join(""))}catch(e){console.error(e)}}async function le(){try{const t=await(await $("/wp-json/1ipim/v1/users")).json();Y=t,M&&(M.innerHTML=t.map(r=>`
              <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-700 shadow-sm shadow-transparent hover:shadow-black/5">
                <div class="relative flex items-center">
                  <input type="checkbox" name="volunteers" value="${o(r.email)}" data-name="${o(r.name)}" class="peer w-5 h-5 rounded-md border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] transition-all">
                </div>
                <span class="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">${x(r.name)}</span>
              </label>
            `).join(""))}catch{M&&(M.innerHTML='<p class="text-xs text-red-500">Erro ao carregar</p>')}}async function L(){try{A?.classList.remove("hidden");const t=await(await $("/wp-json/wp/v2/escala/?per_page=100",{})).json();A?.classList.add("hidden"),_=Array.isArray(t)?t.sort((r,a)=>{const l=d=>new Date(d.meta?.data_da_escala||d.date||0).getTime();return l(r)-l(a)}):[],X(_)}catch{g("Erro ao carregar escalas","error")}}function N(e){const t=we(e);return{parts:t,date:e.meta?.data_da_escala||t[0]||"---",names:e.meta?.equipe_nomes||t[3]||"---",emails:e.meta?.equipe_emails||t[1]||"",time:e.meta?.horario||t[2]||"",ministryId:e.meta?.ministerio_id||t[4]||""}}function ce(e){return O.active!=="mine"?e:e.filter(t=>{const r=N(t),a=r.emails.toLowerCase(),l=(I.email||"").toLowerCase(),d=String(r.ministryId);return a.includes(l)||I.ministries.includes(Number(d))})}function H(e){if(!S)return;const t={};e.forEach(n=>{const m=N(n),h=m.date;t[h]=t[h]||[],t[h].push({...n,minId:m.ministryId})});const r=F,a=r.getMonth(),l=r.getFullYear(),d=new Date,i=new Date(l,a,1).getDay(),f=new Date(l,a+1,0).getDate();let c=`
      <div class="flex items-center justify-between mb-4">
        <button id="calendar-prev" type="button" aria-label="Mês anterior" class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-500 hover:text-[var(--color-brand)]">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <h4 class="font-black text-gray-900 dark:text-white text-lg uppercase">${r.toLocaleString("pt-BR",{month:"long"})} ${l}</h4>
        <button id="calendar-next" type="button" aria-label="Próximo mês" class="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-500 hover:text-[var(--color-brand)]">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
        ${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(n=>`<div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${n}</div>`).join("")}
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-2">
    `;for(let n=0;n<i;n++)c+='<div class="p-2 sm:p-4 rounded-xl border border-dashed border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/20 opacity-50"></div>';for(let n=1;n<=f;n++){const m=`${l}-${String(a+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`,h=t[m]||[],b=m===d.toISOString().split("T")[0];c+=`
        <div class="calendar-day p-1 sm:p-2 rounded-xl border ${b?"border-[var(--color-brand)]/50 bg-indigo-50/30 dark:bg-indigo-900/10":"border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800"} min-h-[80px] sm:min-h-[100px] flex flex-col items-center cursor-pointer hover:border-[var(--color-brand)] transition-all" data-date="${m}">
          <span class="text-xs sm:text-sm font-black ${b?"text-[var(--color-brand)]":"text-gray-400 dark:text-gray-500"} mb-1">${n}</span>
          <div class="w-full flex flex-col gap-1 overflow-y-auto max-h-[100px]">
            ${h.map(s=>`
                  <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded-md truncate w-full text-center tooltip" title="${o(s.title?.rendered)}">
                    ${x((D[Number(s.minId)]||"GERAL").substring(0,6))}
                  </div>
                `).join("")}
          </div>
        </div>
      `}c+="</div>",S.innerHTML=c,S.querySelectorAll(".calendar-day").forEach(n=>{n.onclick=()=>{const m=n.getAttribute("data-date");m&&me(m,t[m]||[])}}),S.querySelector("#calendar-prev")?.addEventListener("click",()=>{F=new Date(l,a-1,1),H(_)}),S.querySelector("#calendar-next")?.addEventListener("click",()=>{F=new Date(l,a+1,1),H(_)})}function K(){document.querySelectorAll(".delete-scale-btn").forEach(e=>{e.onclick=async()=>{if(!confirm("Deseja cancelar esta escala permanentemente?"))return;const t=e.getAttribute("data-id");try{if(!(await $(`/wp-json/wp/v2/escala/${t}/?force=true`,{method:"DELETE"})).ok)throw new Error("Falha ao cancelar");g("Escala cancelada","success"),await L()}catch{g("Erro ao cancelar","error")}}}),document.querySelectorAll(".join-scale-btn").forEach(e=>{e.onclick=async()=>{const t=e.getAttribute("data-id");if(e.getAttribute("data-names"),(e.getAttribute("data-emails")||"").toLowerCase().includes((I.email||"").toLowerCase())){g("Você já está escalado para este dia!","error");return}if(!confirm("Colocar o seu nome à disposição nesta escala?"))return;e.disabled=!0,e.innerHTML='<i class="fa-solid fa-circle-notch animate-spin"></i>';const a=async l=>{const d=await $(`/wp-json/1ipim/v1/escalas/${t}/participar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l||{})});if(d.status===409){const i=await V(d),f=z(i,!!i.data?.can_override&&B);return f?a({override:!0,override_reason:f.reason}):!1}if(!d.ok)throw new Error("Falha ao participar");return!0};try{if(!await a()){e.disabled=!1,e.innerHTML='<i class="fa-solid fa-user-plus"></i> Participar';return}g("Seu nome foi adicionado à equipe!","success"),v?.classList.add("hidden"),await L()}catch{g("Erro ao participar","error"),e.disabled=!1,e.innerHTML='<i class="fa-solid fa-user-plus"></i> Participar'}}}),document.querySelectorAll(".leave-scale-btn").forEach(e=>{e.onclick=async()=>{const t=e.getAttribute("data-id");if(t&&confirm("Sair desta escala?")){e.disabled=!0;try{if(!(await $(`/wp-json/1ipim/v1/escalas/${t}/sair`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})).ok)throw new Error("Falha ao sair");g("Você saiu da escala","success"),v?.classList.add("hidden"),await L()}catch{g("Erro ao sair da escala","error"),e.disabled=!1}}}}),document.querySelectorAll(".edit-scale-btn").forEach(e=>{e.onclick=()=>{const t=e.getAttribute("data-id");t&&ue(t,e.getAttribute("data-names")||"",e.getAttribute("data-emails")||"",e.getAttribute("data-date")||"",e.getAttribute("data-time")||"",e.getAttribute("data-minid")||"")}})}function X(e){if(!y)return;const t=ce(e);if(t.length===0){y.innerHTML=`
        <div class="text-center py-20 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-700 animate-slide-up">
          <i class="fa-regular fa-calendar-xmark text-5xl text-gray-200 mb-4"></i>
          <p class="text-gray-500 font-bold">Nenhuma escala encontrada para este filtro.</p>
        </div>
      `,H(t);return}y.innerHTML=t.map(r=>{const a=N(r),l=D[Number(a.ministryId)]||"Geral",d=new Date(`${a.date}T12:00:00`),i=d.getDate(),f=d.toLocaleString("pt-BR",{month:"short"}).toUpperCase().replace(".",""),c=a.emails.split(",").map(n=>n.trim().toLowerCase()).includes((I.email||"").toLowerCase());return`
          <div class="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6 group hover:shadow-xl transition-all animate-slide-up">
            <div class="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-gray-100 dark:border-slate-700 flex-shrink-0 shadow-inner group-hover:bg-[var(--color-brand)] group-hover:border-[var(--color-brand)] transition-colors">
              <span class="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white">${i}</span>
              <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase group-hover:text-white/80">${f}</span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <h4 class="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg leading-none">${x(r.title?.rendered||"Escala")}</h4>
                <span class="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">${x(l)}</span>
              </div>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  <i class="fa-regular fa-clock text-[var(--color-brand)]"></i> ${x(a.time||"Horário não definido")}
                </div>
                <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold max-w-full">
                  <i class="fa-solid fa-users text-[var(--color-brand)]"></i>
                  <span class="truncate italic font-medium">${x(a.names)}</span>
                </div>
              </div>
            </div>

            <div class="sm:ml-auto flex items-center gap-2">
              ${c?`<button class="leave-scale-btn px-4 py-2 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-600 hover:text-white transition-all font-bold text-xs gap-2 border border-transparent hover:border-red-600" data-id="${r.id}">
                      <i class="fa-solid fa-user-minus"></i> Sair
                    </button>`:`<button class="join-scale-btn px-4 py-2 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-[var(--color-brand)] hover:text-white transition-all font-bold text-xs gap-2 border border-transparent hover:border-[var(--color-brand)]" data-id="${r.id}" data-names="${o(a.names)}" data-emails="${o(a.emails)}" data-time="${o(a.time)}" data-date="${o(a.date)}" data-minid="${o(a.ministryId)}">
                      <i class="fa-solid fa-user-plus"></i> Participar
                    </button>`}

              ${B?`
                    <button aria-label="Editar equipe" class="edit-scale-btn w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900" data-id="${r.id}" data-names="${o(a.names)}" data-emails="${o(a.emails)}" data-time="${o(a.time)}" data-date="${o(a.date)}" data-minid="${o(a.ministryId)}" title="Editar Equipe">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button aria-label="Excluir escala" class="delete-scale-btn w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900" data-id="${r.id}">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  `:""}
            </div>
          </div>
        `}).join(""),H(t),K()}function me(e,t){if(!v||!C||!q)return;const[r,a,l]=e.split("-");q.innerText=`Escalas: ${l}/${a}/${r}`,t.length===0?C.innerHTML='<p class="text-center py-10 text-gray-400 font-bold">Nenhuma escala para este dia.</p>':C.innerHTML=t.map(d=>{const i=N(d),f=D[Number(i.ministryId)]||"Geral",c=i.emails.split(",").map(n=>n.trim().toLowerCase()).includes((I.email||"").toLowerCase());return`
            <div class="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-700/50">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-black text-gray-900 dark:text-white uppercase text-sm">${x(d.title?.rendered||"Escala")}</h4>
                <span class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">${x(f)}</span>
              </div>
              <div class="space-y-2 mb-4">
                <p class="text-[10px] text-gray-500 font-bold flex items-center gap-2"><i class="fa-regular fa-clock text-[var(--color-brand)]"></i> ${x(i.time||"SH")}</p>
                <p class="text-[10px] text-gray-500 font-bold flex items-center gap-2"><i class="fa-solid fa-users text-[var(--color-brand)]"></i> ${x(i.names)}</p>
              </div>
              <div class="flex items-center gap-2">
                ${c?`<button class="leave-scale-btn flex-1 bg-red-600 text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-600/20" data-id="${d.id}">Sair da escala</button>`:`<button class="join-scale-btn flex-1 bg-[var(--color-brand)] text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[var(--color-brand)]/20" data-id="${d.id}" data-names="${o(i.names)}" data-emails="${o(i.emails)}" data-time="${o(i.time)}" data-date="${o(e)}" data-minid="${o(i.ministryId)}">Participar</button>`}
                ${B?`
                      <button aria-label="Editar equipe" class="edit-scale-btn w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-blue-500 border border-gray-100 dark:border-slate-600" data-id="${d.id}" data-names="${o(i.names)}" data-emails="${o(i.emails)}" data-time="${o(i.time)}" data-date="${o(e)}" data-minid="${o(i.ministryId)}"><i class="fa-solid fa-pen text-xs"></i></button>
                      <button aria-label="Excluir escala" class="delete-scale-btn w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-red-500 border border-gray-100 dark:border-slate-600" data-id="${d.id}"><i class="fa-solid fa-trash-can text-xs"></i></button>
                    `:""}
              </div>
            </div>
          `}).join(""),v.classList.remove("hidden"),K()}function ue(e,t,r,a,l,d){if(!v||!C||!q)return;const i=r.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean),f=t.split(",").map(s=>s.trim()),c=new Set,n=[];Y.forEach(s=>{const u=(s.email||"").toLowerCase();u&&!c.has(u)&&(c.add(u),n.push({name:s.name,email:u}))}),i.forEach((s,u)=>{c.has(s)||(c.add(s),n.push({name:f[u]||s,email:s}))});const m=n.length?n.map(s=>`
              <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                <input type="checkbox" name="edit-volunteers" value="${o(s.email)}" data-name="${o(s.name)}" ${i.includes(s.email)?"checked":""} class="w-5 h-5 rounded-md border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]">
                <span class="text-xs font-bold text-gray-700 dark:text-gray-300">${x(s.name)} <span class="text-gray-500 font-normal">${x(s.email)}</span></span>
              </label>
            `).join(""):'<p class="text-xs text-gray-500">Nenhum voluntário disponível.</p>';q.innerText=`Editar equipe — ${a} ${l}`.trim(),C.innerHTML=`
      <div class="space-y-4">
        <div>
          <span class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Equipe escalada</span>
          <div id="edit-volunteers" class="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl max-h-64 overflow-y-auto p-2 space-y-1">
            ${m}
          </div>
        </div>
        <div class="flex gap-3">
          <button id="cancel-edit" class="flex-1 py-3 bg-gray-50 dark:bg-slate-700 text-gray-500 font-black rounded-2xl text-xs uppercase">Cancelar</button>
          <button id="save-edit" class="flex-1 py-3 bg-[var(--color-brand)] text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-[var(--color-brand)]/20">Salvar Alterações</button>
        </div>
      </div>
    `,v.classList.remove("hidden");const h=document.getElementById("cancel-edit"),b=document.getElementById("save-edit");h&&(h.onclick=()=>v.classList.add("hidden")),b&&(b.onclick=async()=>{const s=Array.from(document.querySelectorAll('input[name="edit-volunteers"]:checked')),u=s.map(w=>w.getAttribute("data-name")||"").filter(Boolean).join(", ")||"---",T=s.map(w=>w.value).join(", ");b.innerText="Salvando...",b.disabled=!0;const k=async w=>{const j=await $(`/wp-json/1ipim/v1/escalas/${e}/equipe`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({names:u,emails:T,...w||{}})});if(j.status===409){const Z=await V(j),ee=z(Z,!!Z.data?.can_override);return ee?k({override:!0,override_reason:ee.reason}):!1}if(!j.ok)throw new Error("Falha ao atualizar");return!0};try{if(!await k()){b.innerText="Salvar Alterações",b.disabled=!1;return}g("Escala atualizada!","success"),v.classList.add("hidden"),await L()}catch{g("Erro ao atualizar","error"),b.innerText="Salvar Alterações",b.disabled=!1}})}function pe(){G&&v&&(G.onclick=()=>v.classList.add("hidden")),window.onclick=e=>{e.target===v&&v?.classList.add("hidden")}}function ge(){J.forEach(e=>{e.onclick=()=>{J.forEach(t=>{t.classList.remove(...ae),t.classList.add(...re)}),e.classList.add(...ae),e.classList.remove(...re),O.active=e.getAttribute("data-filter")||"all",X(_)}})}function be(){W.forEach(e=>{e.onclick=()=>{const t=e.getAttribute("data-view");W.forEach(r=>{r.classList.remove(...se),r.classList.add(...ne)}),e.classList.add(...se),e.classList.remove(...ne),t==="calendar"?(y?.classList.add("hidden"),S?.classList.remove("hidden")):(y?.classList.remove("hidden"),S?.classList.add("hidden"))}})}function fe(){P&&(P.onsubmit=async e=>{e.preventDefault();const t=document.getElementById("scale-add-btn"),r=document.getElementById("scale-add-text"),a=document.getElementById("scale-add-loader");t&&(t.disabled=!0),r&&(r.innerText="Agendando..."),a?.classList.remove("hidden");const l=document.getElementById("scale-title")?.value||"",d=document.getElementById("scale-date")?.value||"",i=document.getElementById("scale-time")?.value||"",f=document.getElementById("scale-ministry")?.value||"",c=parseInt(document.getElementById("scale-recurrence")?.value||"1",10)||1,n=document.querySelectorAll('input[name="volunteers"]:checked'),m=Array.from(n).map(s=>s.getAttribute("data-name")||"").join(", "),h=Array.from(n).map(s=>s.value).join(", "),b=async(s,u)=>{const T=`<p>${s}|${h}|${i}|${m}|${f}</p>`,k=await $("/wp-json/wp/v2/escala/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:l,summary:m,content:T,status:"publish",ipim_override:u?.override||!1,ipim_override_reason:u?.override_reason||"",meta:{data_da_escala:s,ministerio_id:f,equipe_nomes:m,equipe_emails:h,horario:i}})});if(k.status===409){const w=await V(k),j=z(w,!!w.data?.can_override);return j?b(s,{override:!0,override_reason:j.reason}):"skipped"}if(!k.ok)throw new Error("Falha ao criar escala");return"created"};try{const s=new Date(`${d}T12:00:00`);let u=0;for(let T=0;T<c;T++){const k=s.toISOString().split("T")[0];if(await b(k)==="skipped"){g(u>0?`Criadas ${u} de ${c} escalas.`:"Criação cancelada por conflito de escala.","info"),u>0&&await L();return}u++,s.setDate(s.getDate()+7)}g(c>1?`Criadas ${c} Escalas Recorrentes!`:"Escala agendada com sucesso!","success"),P.reset(),await L()}catch{g("Erro ao salvar escala(s)","error")}finally{t&&(t.disabled=!1),r&&(r.innerText="Agendar Escala"),a?.classList.add("hidden")}})}async function xe(){await Promise.all([de(),le()]),await L()}pe(),ge(),be(),fe(),xe()});
