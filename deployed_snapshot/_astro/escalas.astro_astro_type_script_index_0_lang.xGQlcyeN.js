import{a as z}from"./auth-store.Mdv7y9cp.js";import{a as W,g as y}from"./portal-config.DrT3V5R5.js";document.addEventListener("astro:page-load",()=>{const C=document.getElementById("form-container"),M=document.getElementById("list-container"),f=document.getElementById("list-view"),A=document.getElementById("loading-scales"),N=document.getElementById("scale-ministry"),S=document.getElementById("volunteers-select"),H=document.querySelectorAll(".filter-tab"),D=document.getElementById("add-scale-form"),b=document.getElementById("scale-modal"),E=document.getElementById("modal-content"),B=document.getElementById("modal-title"),P=document.getElementById("close-modal"),w=z.getToken(),x=z.getUser(),k=W(x.role||"",x.nicename||""),h="https://1ipim.online/admin";if(!k.isAdmin&&!k.isPrivileged){C&&(C.style.display="none"),M&&(M.className="lg:col-span-12 space-y-4");const t=document.getElementById("page-title");t&&(t.innerText="Minhas Participações")}let I=[],j={};async function R(){await Promise.all([V(),F(),T()])}async function V(){try{const t=y(h),d=await(await fetch(`${t}/wp-json/wp/v2/ministerio/?per_page=100`)).json();d.forEach(l=>{j[l.id]=l.title.rendered}),N&&(N.innerHTML='<option value="">Selecione...</option>'+d.map(l=>`<option value="${l.id}">${l.title.rendered}</option>`).join(""))}catch(t){console.error(t)}}async function F(){try{const t=y(h),d=await(await fetch(`${t}/wp-json/wp/v2/users/?per_page=100`,{headers:{Authorization:`Bearer ${w}`}})).json();S&&(S.innerHTML=d.map(l=>`
                        <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-700 shadow-sm shadow-transparent hover:shadow-black/5">
                            <div class="relative flex items-center">
                                <input type="checkbox" name="volunteers" value="${l.email}" data-name="${l.name}" class="peer w-5 h-5 rounded-md border-gray-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] transition-all">
                            </div>
                            <span class="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">${l.name}</span>
                        </label>
                    `).join(""))}catch{S&&(S.innerHTML='<p class="text-xs text-red-500">Erro ao carregar</p>')}}async function T(){try{A&&A.classList.remove("hidden");const t=y(h);let d=await(await fetch(`${t}/wp-json/wp/v2/escala/?per_page=100`,{headers:{Authorization:`Bearer ${w}`}})).json();A&&A.classList.add("hidden"),I=Array.isArray(d)?d.sort((l,e)=>{const r=s=>new Date(s.meta?.data_da_escala||s.date||0).getTime();return r(l)-r(e)}):[],q(I)}catch{window.showToast("Erro ao carregar escalas","error")}}function q(t){if(!f)return;const m=document.querySelector(".filter-tab.active")?.getAttribute("data-filter"),d=t.filter(e=>{if(m==="mine"){const r=e.meta?.equipe_emails||"",s=e.meta?.ministerio_id;let a="",n="";return!r&&e.content?.rendered&&(a=e.content.rendered.replace(/<[^>]*>/g,""),n=a.split("|")[1]||""),(r||n).toLowerCase().includes(x.email?.toLowerCase())||x.ministries.includes(String(s))}return!0});if(d.length===0){f.innerHTML=`
                    <div class="text-center py-20 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-700 animate-slide-up">
                        <i class="fa-regular fa-calendar-xmark text-5xl text-gray-200 mb-4"></i>
                        <p class="text-gray-500 font-bold">Nenhuma escala encontrada para este filtro.</p>
                    </div>
                `;return}f.innerHTML=d.map(e=>{const s=(e.content?.rendered||"").replace(/<[^>]*>/g,"").replace(/\\n/g,"").split("|"),a=e.meta?.data_da_escala||s[0]||"---",n=e.meta?.equipe_nomes||s[3]||"---",o=e.meta?.horario||s[2]||"",g=e.meta?.ministerio_id||s[4]||"",p=e.meta?.equipe_emails||s[1]||"",i=j[Number(g)]||"Geral",c=new Date(a+"T12:00:00"),u=c.getDate(),v=c.toLocaleString("pt-BR",{month:"short"}).toUpperCase().replace(".","");return`
                <div class="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6 group hover:shadow-xl transition-all animate-slide-up">
                    <!-- Data Badge -->
                    <div class="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-gray-100 dark:border-slate-700 flex-shrink-0 shadow-inner group-hover:bg-[var(--color-brand)] group-hover:border-[var(--color-brand)] transition-colors">
                        <span class="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white">${u}</span>
                        <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase group-hover:text-white/80">${v}</span>
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                             <h4 class="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg leading-none">${e.title?.rendered||"Escala"}</h4>
                             <span class="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">${i}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                <i class="fa-regular fa-clock text-[var(--color-brand)]"></i> ${o||"Horário não definido"}
                            </div>
                            <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold max-w-full">
                                <i class="fa-solid fa-users text-[var(--color-brand)]"></i> 
                                <span class="truncate italic font-medium">${n}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="sm:ml-auto flex items-center gap-2">
                        <button class="join-scale-btn px-4 py-2 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-[var(--color-brand)] hover:text-white transition-all font-bold text-xs gap-2 border border-transparent hover:border-[var(--color-brand)]" data-id="${e.id}" data-names="${n}" data-emails="${p}" data-time="${o}" data-date="${a}" data-minid="${g}">
                            <i class="fa-solid fa-user-plus"></i> Participar
                        </button>
                        
                        ${k.isAdmin||k.isPrivileged?`
                            <button class="edit-scale-btn w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900" data-id="${e.id}" data-names="${n}" data-emails="${p}" data-time="${o}" data-date="${a}" data-minid="${g}" title="Editar Equipe">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="delete-scale-btn w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900" data-id="${e.id}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        `:""}
                    </div>
                </div>
                `}).join("");const l=document.getElementById("calendar-view");if(l){let e={};d.forEach(i=>{const c=(i.content?.rendered||"").replace(/<[^>]*>/g,"").replace(/\\n/g,"").split("|"),u=i.meta?.data_da_escala||c[0]||"";u&&(e[u]||(e[u]=[]),e[u].push({...i,minId:i.meta?.ministerio_id||c[4]||""}))});const r=new Date,s=r.getMonth(),a=r.getFullYear(),o=new Date(a,s,1).getDay(),g=new Date(a,s+1,0).getDate();let p=`
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="font-black text-gray-900 dark:text-white text-lg uppercase">${r.toLocaleString("pt-BR",{month:"long"})} ${a}</h4>
                    </div>
                    <div class="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dom</div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seg</div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ter</div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qua</div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qui</div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sex</div>
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sáb</div>
                    </div>
                    <div class="grid grid-cols-7 gap-1 sm:gap-2">
                `;for(let i=0;i<o;i++)p+='<div class="p-2 sm:p-4 rounded-xl border border-dashed border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/20 opacity-50"></div>';for(let i=1;i<=g;i++){const c=`${a}-${String(s+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`,u=e[c]||[],v=c===r.toISOString().split("T")[0];p+=`
                        <div class="calendar-day p-1 sm:p-2 rounded-xl border ${v?"border-[var(--color-brand)]/50 bg-indigo-50/30 dark:bg-indigo-900/10":"border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800"} min-h-[80px] sm:min-h-[100px] flex flex-col items-center cursor-pointer hover:border-[var(--color-brand)] transition-all" data-date="${c}">
                            <span class="text-xs sm:text-sm font-black ${v?"text-[var(--color-brand)]":"text-gray-400 dark:text-gray-500"} mb-1">${i}</span>
                            <div class="w-full flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                                ${u.map($=>`
                                    <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded-md truncate w-full text-center tooltip" title="${$.title?.rendered}">
                                        ${j[Number($.minId)]?.substring(0,6)||"GERAL"}
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    `}p+="</div>",l.innerHTML=p,document.querySelectorAll(".calendar-day").forEach(i=>{i.onclick=()=>{const c=i.getAttribute("data-date");c&&G(c,e[c]||[])}})}document.querySelectorAll(".delete-scale-btn").forEach(e=>{e.onclick=async()=>{if(!confirm("Deseja cancelar esta escala permanentemente?"))return;const r=e.getAttribute("data-id");try{const s=y(h);if(!(await fetch(`${s}/wp-json/wp/v2/escala/${r}/?force=true`,{method:"DELETE",headers:{Authorization:`Bearer ${w}`}})).ok)throw new Error;window.showToast("Escala cancelada","success"),T()}catch{window.showToast("Erro ao cancelar","error")}}}),document.querySelectorAll(".join-scale-btn").forEach(e=>{const r=async()=>{const s=e.getAttribute("data-id");e.getAttribute("data-minid");let a=e.getAttribute("data-names")||"",n=e.getAttribute("data-emails")||"";if(n.toLowerCase().includes(x.email?.toLowerCase()||"")){window.showToast("Você já está escalado para este dia!","error");return}if(!confirm("Colocar o seu nome à disposição nesta escala?"))return;const o=e;o.disabled=!0,o.innerHTML='<i class="fa-solid fa-circle-notch animate-spin"></i>';const g=a==="---"||a.trim()===""?x.displayName:a+", "+x.displayName,p=n.trim()===""?x.email:n+", "+x.email,i=e.getAttribute("data-date")||"",c=e.getAttribute("data-minid")||"",u=e.getAttribute("data-time")||"",v=`<p>${i}|${p}|${u}|${g}|${c}</p>`;try{const $=y(h);if(!(await fetch(`${$}/wp-json/wp/v2/escala/${s}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${w}`},body:JSON.stringify({content:v,meta:{equipe_nomes:g,equipe_emails:p}})})).ok)throw new Error;window.showToast("Seu nome foi adicionado à equipe!","success"),b&&b.classList.add("hidden"),T()}catch{window.showToast("Erro ao participar","error"),o.disabled=!1,o.innerHTML='<i class="fa-solid fa-user-plus"></i> Participar'}};e.onclick=r}),document.querySelectorAll(".edit-scale-btn").forEach(e=>{e.onclick=()=>{const r=e.getAttribute("data-id"),s=e.getAttribute("data-names")||"",a=e.getAttribute("data-emails")||"",n=e.getAttribute("data-date")||"",o=e.getAttribute("data-time")||"",g=e.getAttribute("data-minid")||"";r&&J(r,s,a,n,o,g)}})}function G(t,m){if(!b||!E||!B)return;const[d,l,e]=t.split("-");B.innerText=`Escalas: ${e}/${l}/${d}`,m.length===0?E.innerHTML='<p class="text-center py-10 text-gray-400 font-bold">Nenhuma escala para este dia.</p>':E.innerHTML=m.map(r=>{const a=(r.content?.rendered||"").replace(/<[^>]*>/g,"").replace(/\\n/g,"").split("|"),n=r.meta?.equipe_nomes||a[3]||"---",o=r.meta?.horario||a[2]||"",g=r.meta?.ministerio_id||a[4]||"",p=r.meta?.equipe_emails||a[1]||"",i=j[Number(g)]||"Geral";return`
                        <div class="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-700/50">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-black text-gray-900 dark:text-white uppercase text-sm">${r.title?.rendered||"Escala"}</h4>
                                <span class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">${i}</span>
                            </div>
                            <div class="space-y-2 mb-4">
                                <p class="text-[10px] text-gray-500 font-bold flex items-center gap-2"><i class="fa-regular fa-clock text-[var(--color-brand)]"></i> ${o||"SH"}</p>
                                <p class="text-[10px] text-gray-500 font-bold flex items-center gap-2"><i class="fa-solid fa-users text-[var(--color-brand)]"></i> ${n}</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <button class="join-scale-btn flex-1 bg-[var(--color-brand)] text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[var(--color-brand)]/20" data-id="${r.id}" data-names="${n}" data-emails="${p}" data-time="${o}" data-date="${t}" data-minid="${g}">Participar</button>
                                ${k.isAdmin||k.isPrivileged?`
                                    <button class="edit-scale-btn w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-blue-500 border border-gray-100 dark:border-slate-600" data-id="${r.id}" data-names="${n}" data-emails="${p}" data-time="${o}" data-date="${t}" data-minid="${g}"><i class="fa-solid fa-pen text-xs"></i></button>
                                    <button class="delete-scale-btn w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-red-500 border border-gray-100 dark:border-slate-600" data-id="${r.id}"><i class="fa-solid fa-trash-can text-xs"></i></button>
                                `:""}
                            </div>
                        </div>
                    `}).join(""),b.classList.remove("hidden"),q(I)}async function J(t,m,d,l,e,r){if(!b||!E||!B)return;B.innerText="Editar Equipe Escala",E.innerHTML=`
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Equipe (Nomes separados por vírgula)</label>
                        <textarea id="edit-names" class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none h-24">${m==="---"?"":m}</textarea>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mails (Separados por vírgula - Opcional)</label>
                        <textarea id="edit-emails" class="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none h-24">${d}</textarea>
                    </div>
                    <div class="flex gap-3">
                        <button id="cancel-edit" class="flex-1 py-3 bg-gray-50 dark:bg-slate-700 text-gray-500 font-black rounded-2xl text-xs uppercase">Cancelar</button>
                        <button id="save-edit" class="flex-1 py-3 bg-[var(--color-brand)] text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-[var(--color-brand)]/20">Salvar Alterações</button>
                    </div>
                </div>
            `,b.classList.remove("hidden");const s=document.getElementById("cancel-edit"),a=document.getElementById("save-edit");s&&(s.onclick=()=>b.classList.add("hidden")),a&&(a.onclick=async()=>{const n=document.getElementById("edit-names").value||"---",o=document.getElementById("edit-emails").value||"";a.innerText="Salvando...",a.disabled=!0;const g=`<p>${l}|${o}|${e}|${n}|${r}</p>`;try{const p=y(h);if(!(await fetch(`${p}/wp-json/wp/v2/escala/${t}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${w}`},body:JSON.stringify({content:g,meta:{equipe_nomes:n,equipe_emails:o}})})).ok)throw new Error;window.showToast("Escala atualizada!","success"),b.classList.add("hidden"),T()}catch{window.showToast("Erro ao atualizar","error"),a.innerText="Salvar Alterações",a.disabled=!1}})}P&&b&&(P.onclick=()=>b.classList.add("hidden"),window.onclick=t=>{t.target===b&&b.classList.add("hidden")}),H.forEach(t=>{t.onclick=()=>{H.forEach(m=>{m.classList.remove("active","bg-[var(--color-brand)]","text-white","shadow-lg","shadow-[var(--color-brand)]/20"),m.classList.add("text-gray-500","hover:bg-gray-50","dark:hover:bg-slate-700")}),t.classList.add("active","bg-[var(--color-brand)]","text-white","shadow-lg","shadow-[var(--color-brand)]/20"),t.classList.remove("text-gray-500","hover:bg-gray-50","dark:hover:bg-slate-700"),q(I)}});const U=document.querySelectorAll(".view-toggle"),_=document.getElementById("calendar-view");U.forEach(t=>{t.onclick=()=>{const m=t.getAttribute("data-view");U.forEach(d=>{d.classList.remove("active","bg-white","dark:bg-slate-700","text-gray-900","dark:text-white","shadow-sm"),d.classList.add("text-gray-500","hover:text-gray-900","dark:hover:text-white")}),t.classList.add("active","bg-white","dark:bg-slate-700","text-gray-900","dark:text-white","shadow-sm"),t.classList.remove("text-gray-500","hover:text-gray-900","dark:hover:text-white"),m==="calendar"?(f&&f.classList.add("hidden"),_&&_.classList.remove("hidden")):(f&&f.classList.remove("hidden"),_&&_.classList.add("hidden"))}}),D&&(D.onsubmit=async t=>{t.preventDefault();const m=document.getElementById("scale-add-btn"),d=document.getElementById("scale-add-text"),l=document.getElementById("scale-add-loader");m&&(m.disabled=!0),d&&(d.innerText="Agendando..."),l&&l.classList.remove("hidden");const e=document.getElementById("scale-title").value,r=document.getElementById("scale-date").value,s=document.getElementById("scale-time").value,a=document.getElementById("scale-ministry").value,n=parseInt(document.getElementById("scale-recurrence").value,10)||1,o=document.querySelectorAll('input[name="volunteers"]:checked'),g=Array.from(o).map(c=>c.getAttribute("data-name")).join(", "),p=Array.from(o).map(c=>c.value).join(", "),i=y(h);try{const c=[];let u=new Date(r+"T12:00:00");for(let L=0;L<n;L++){const O=u.toISOString().split("T")[0],Q=`<p>${O}|${p}|${s}|${g}|${a}</p>`;c.push(fetch(`${i}/wp-json/wp/v2/escala/`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${w}`},body:JSON.stringify({title:e,summary:g,content:Q,status:"publish",meta:{data_da_escala:O,ministerio_id:a,equipe_nomes:g,equipe_emails:p,horario:s}})})),u.setDate(u.getDate()+7)}if((await Promise.all(c)).some(L=>!L.ok))throw new Error("Falha em uma ou mais inserções");window.showToast(n>1?`Criadas ${n} Escalas Recorrentes!`:"Escala agendada com sucesso!","success"),D.reset(),T()}catch{window.showToast("Erro ao salvar escala(s)","error")}finally{m&&(m.disabled=!1),d&&(d.innerText="Agendar Escala"),l&&l.classList.add("hidden")}}),R()});
