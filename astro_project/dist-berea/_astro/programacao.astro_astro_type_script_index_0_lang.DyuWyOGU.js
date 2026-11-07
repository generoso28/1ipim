import{W as c}from"./api.BQZs3I30.js";const d=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"],t=e=>String(e??"").replace(/[&<>"']/g,r=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[r]);function x(e){const r=e.tag?`<span class="text-gray-900 text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider" style="background-color:${t(e.tag_cor||"#7ccece")};">${t(e.tag)}</span>`:"",o=e.link?`<a href="${t(e.link)}" target="_blank" rel="nofollow" class="font-bold text-xl text-gray-900 dark:text-white hover:text-[var(--color-brand)] transition-colors">${t(e.titulo)} <i class="fa-solid fa-arrow-up-right-from-square text-xs opacity-50 ml-1"></i></a>`:`<h6 class="font-bold text-xl text-gray-900 dark:text-white m-0">${t(e.titulo)}</h6>`,l=e.horario?`<strong class="text-gray-900 dark:text-white">${t(e.horario)} · </strong>`:"";return`
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 hover:border-[var(--color-brand)]/30 transition-all duration-300 group/event flex flex-col relative overflow-hidden">
                <div class="absolute right-0 top-0 w-32 h-32 rounded-full blur-[50px] opacity-10 pointer-events-none group-hover/event:opacity-20 transition-opacity" style="background-color:${t(e.tag_cor||"#7ccece")};"></div>
                <div class="flex items-center gap-3 mb-4 relative z-10">${o}${r}</div>
                <div class="flex items-start gap-4 relative z-10">
                    <i class="fa-regular fa-clock text-[var(--color-brand)] text-xl mt-0.5 shrink-0 opacity-80"></i>
                    <p class="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-relaxed">${l}${t(e.descricao)}</p>
                </div>
            </div>
        `}async function g(){const e=document.getElementById("weekly-groups");if(e)try{const r=await fetch(`${c}/programacao?tipo=semanal`,{headers:{Accept:"application/json"}});if(!r.ok)return;const o=await r.json();if(!Array.isArray(o)||o.length===0)return;const l=d.map((a,i)=>({day:a,events:o.filter(s=>s.dia_semana===i).sort((s,n)=>s.ordem-n.ordem||s.horario.localeCompare(n.horario))})).filter(a=>a.events.length>0);e.innerHTML=l.map(a=>`
                <div class="relative">
                    <h3 class="font-extrabold text-3xl text-gray-900 dark:text-white mb-8 flex items-center gap-4">
                        <span class="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700 shrink-0 text-xl text-[var(--color-brand)]">
                            <i class="fa-regular fa-calendar-check text-[var(--color-brand)]"></i>
                        </span>
                        ${t(a.day)}
                    </h3>
                    <div class="space-y-4 md:pl-18">${a.events.map(x).join("")}</div>
                </div>
            `).join("")}catch{}}g();
