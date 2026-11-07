import{W as l}from"./api.BQZs3I30.js";const o=["","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado","Domingo"],t=e=>String(e??"").replace(/[&<>"']/g,r=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[r]);function c(e){const r=e.dia_semana&&o[e.dia_semana]?o[e.dia_semana]:"Dia a definir",a=e.horario?` às ${t(e.horario)}`:"",s=e.imagem?`<img src="${t(e.imagem)}" alt="${t(e.nome)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 dark:opacity-70" loading="lazy" width="800" height="800" onerror="this.style.display='none'">`:"",i=e.contato||"5535988613046",n=encodeURIComponent(`Olá, gostaria de saber mais sobre o Pequeno Grupo: ${e.nome}`);return`
            <div class="rounded-3xl border border-gray-200 dark:border-slate-700/50 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col group relative min-h-[480px]">
                <div class="absolute inset-0 z-0 bg-gradient-to-br from-[#7ccece] to-[#7bcfa0]">
                    ${s}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10"></div>
                </div>
                <div class="p-6 md:p-8 flex flex-col flex-1 relative z-10 justify-end">
                    <h5 class="font-extrabold text-3xl text-white mb-6 drop-shadow-md">${t(e.nome)}</h5>
                    <div class="space-y-2 mt-auto bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 group-hover:bg-black/50 transition-colors">
                        <p class="text-xs text-gray-300 flex justify-between border-b border-white/10 pb-2"><strong class="text-white uppercase tracking-wider text-[10px]">Público</strong> <span class="text-right">${t(e.publico_alvo||"Todos")}</span></p>
                        <p class="text-xs text-gray-300 flex justify-between border-b border-white/10 pb-2 pt-1"><strong class="text-white uppercase tracking-wider text-[10px]">Líder</strong> <span class="text-right">${t(e.responsavel||"—")}</span></p>
                        <p class="text-xs text-gray-300 flex justify-between border-b border-white/10 pb-2 pt-1"><strong class="text-white uppercase tracking-wider text-[10px]">Horário</strong> <span class="text-right">${t(r)}${a}</span></p>
                        <p class="text-xs text-gray-300 flex justify-between pt-1 mb-2 items-center"><strong class="text-white uppercase tracking-wider text-[10px]">Frequência</strong> <span class="bg-[var(--color-brand)] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">${t(e.frequencia||"—")}</span></p>
                        <a href="https://wa.me/${t(i)}?text=${n}" target="_blank" rel="nofollow" class="mt-4 block w-full text-center bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm shadow">
                            Tenho interesse
                        </a>
                    </div>
                </div>
            </div>
        `}async function d(){const e=document.getElementById("pg-grid");if(e)try{const r=await fetch(`${l}/grupos`,{headers:{Accept:"application/json"}});if(!r.ok)return;const a=await r.json();Array.isArray(a)&&a.length>0&&(e.innerHTML=a.map(c).join(""))}catch{}}d();
