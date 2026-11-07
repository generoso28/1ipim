document.addEventListener("astro:page-load",()=>{const r={camp:{gradient:"linear-gradient(135deg,#f97316,#dc2626)",label:"Acampamento"},worship:{gradient:"linear-gradient(135deg,#059669,#0d9488)",label:"Culto Especial"},education:{gradient:"linear-gradient(135deg,#2563eb,#4f46e5)",label:"Educação"},special:{gradient:"linear-gradient(135deg,#7c3aed,#6d28d9)",label:"Visita Especial"},ministry:{gradient:"linear-gradient(135deg,#db2777,#e11d48)",label:"Ministério"},youth:{gradient:"linear-gradient(135deg,#0891b2,#0284c7)",label:"Juventude"},conference:{gradient:"linear-gradient(135deg,#0f766e,#047857)",label:"Conferência"},celebration:{gradient:"linear-gradient(135deg,#d97706,#b45309)",label:"Celebração"}},y=[{date:"2026-02-14",endDate:"2026-02-17",label:"Acampamento Maanaim",sub:"Temporada de Verão",type:"camp",url:"https://acampamaanaim.com.br"},{date:"2026-03-14",label:"Encontro da Família",sub:"c/ Rachel Novaes",type:"special",url:"/eventos"},{date:"2026-04-02",endDate:"2026-04-05",label:"Acampamento Maanaim",sub:"Temporada de Páscoa",type:"camp",url:"https://acampamaanaim.com.br"},{date:"2026-04-29",label:"Culto Especial",sub:"c/ Hernandes Dias Lopes",type:"worship",url:"/eventos"},{date:"2026-05-16",endDate:"2026-05-17",label:"Visita do Rev. Sergio Gini",sub:"Presidente da IPI do Brasil",type:"special",url:"/eventos"},{date:"2026-06-15",label:"Congresso de Casais",sub:null,type:"ministry",url:"/eventos"},{date:"2026-07-04",endDate:"2026-07-05",label:"Educação Reformada",sub:"c/ Pr. Davi Manso",type:"education",url:"/eventos"},{date:"2026-07-20",endDate:"2026-07-25",label:"Semana Jovem 2026",sub:null,type:"youth",url:"/eventos"},{date:"2026-08-22",endDate:"2026-08-25",label:"Acampamento Maanaim",sub:"Temporada de Festa",type:"camp",url:"https://acampamaanaim.com.br"},{date:"2026-09-04",endDate:"2026-09-06",label:"Conferência da Fé Reformada",sub:null,type:"conference",url:"/eventos"},{date:"2026-09-15",label:"152 Anos da 1IPIM",sub:"Culto especial c/ Vitor Quevedo",type:"celebration",url:"/eventos"},{date:"2026-10-01",label:"Acampamento Maanaim",sub:"Temporada Kids",type:"camp",url:"https://acampamaanaim.com.br"},{date:"2026-10-23",endDate:"2026-10-25",label:"Conferência Missionária",sub:null,type:"conference",url:"/eventos"},{date:"2026-11-20",label:"Cultos de Formatura",sub:null,type:"celebration",url:"/eventos"},{date:"2026-12-25",label:"Culto de Natal",sub:null,type:"celebration",url:"/eventos"},{date:"2026-12-31",label:"Culto de Ano Novo",sub:null,type:"celebration",url:"/eventos"}],n=e=>{const[a,i,o]=e.split("-").map(Number);return new Date(a,i-1,o)},l=document.getElementById("next-event-card");if(!l)return;const c=new Date;c.setHours(0,0,0,0);const t=y.map(e=>({...e,_end:n(e.endDate||e.date)})).filter(e=>e._end>=c).sort((e,a)=>n(e.date).getTime()-n(a.date).getTime())[0];if(!t){l.parentElement?.closest("section")?.remove();return}const m=r[t.type]||r.celebration,p=n(t.date),u=e=>e.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),w=t.endDate?`${p.getDate()} a ${u(n(t.endDate))}`:u(p);l.innerHTML=`
            <div style="background:${m.gradient}" class="text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div class="absolute right-0 top-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/3 translate-x-1/3"></div>
                <div class="absolute left-0 bottom-0 w-64 h-64 bg-black/10 rounded-full blur-[60px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                <div class="text-center md:text-left relative z-10">
                    <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white/90 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">
                        <span class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        ${m.label} &nbsp;·&nbsp; Próximo Evento
                    </div>
                    <h3 class="font-extrabold text-3xl md:text-4xl lg:text-5xl mb-2 drop-shadow leading-tight">${t.label}</h3>
                    ${t.sub?`<p class="text-white/75 text-lg font-medium mb-3">${t.sub}</p>`:""}
                    <p class="text-white/60 text-sm font-semibold tracking-wide mt-2"><i class="fa-regular fa-calendar mr-2"></i>${w}</p>
                </div>

                    <div class="flex flex-col items-center gap-4 relative z-10 shrink-0">
                        <div class="flex items-end gap-3 md:gap-4">
                            <div class="text-center">
                                <div id="cnt-days" class="font-black text-5xl md:text-6xl tabular-nums leading-none drop-shadow-xl">--</div>
                                <div class="text-white/55 text-[10px] font-bold uppercase tracking-widest mt-1.5">dias</div>
                            </div>
                            <div class="font-black text-3xl text-white/30 mb-3">:</div>
                            <div class="text-center">
                                <div id="cnt-hours" class="font-black text-5xl md:text-6xl tabular-nums leading-none drop-shadow-xl">--</div>
                                <div class="text-white/55 text-[10px] font-bold uppercase tracking-widest mt-1.5">horas</div>
                            </div>
                            <div class="font-black text-3xl text-white/30 mb-3">:</div>
                            <div class="text-center">
                                <div id="cnt-mins" class="font-black text-5xl md:text-6xl tabular-nums leading-none drop-shadow-xl">--</div>
                                <div class="text-white/55 text-[10px] font-bold uppercase tracking-widest mt-1.5">min</div>
                            </div>
                        </div>

                        ${t.url.startsWith("http")?`
                            <div class="flex flex-col items-center gap-3">
                                <a href="${t.url}" target="_blank" rel="nofollow" class="inline-flex items-center gap-2 bg-white text-gray-900 border border-transparent px-8 py-3.5 rounded-full font-bold transition-all duration-300 text-sm hover:-translate-y-0.5 shadow-xl hover:bg-gray-100">
                                    Inscrições e Informações <i class="fa-solid fa-arrow-up-right-from-square text-xs opacity-70"></i>
                                </a>
                                <a href="/eventos" class="text-white/60 hover:text-white text-xs font-bold transition-colors border-b border-white/20 hover:border-white pb-0.5">
                                    Ver calendário completo da igreja
                                </a>
                            </div>
                        `:`
                            <a href="/eventos" class="inline-flex items-center gap-2 bg-white/15 hover:bg-white text-white hover:text-gray-900 backdrop-blur-sm border border-white/30 hover:border-transparent px-7 py-3 rounded-full font-bold transition-all duration-300 text-sm hover:-translate-y-0.5 shadow-lg">
                                Ver calendário completo <i class="fa-solid fa-arrow-right"></i>
                            </a>
                        `}
                    </div>
            </div>
        `,l.style.opacity="1";function b(){const e=n(t.date);e.setHours(19,0,0,0);const a=e.getTime()-Date.now();if(a<=0){const s=document.getElementById("cnt-days"),v=document.getElementById("cnt-hours"),h=document.getElementById("cnt-mins");s&&(s.textContent="00"),v&&(v.textContent="00"),h&&(h.textContent="00");return}const i=Math.floor(a/864e5),o=Math.floor(a%864e5/36e5),E=Math.floor(a%36e5/6e4),d=s=>String(s).padStart(2,"0"),x=document.getElementById("cnt-days"),g=document.getElementById("cnt-hours"),f=document.getElementById("cnt-mins");x&&(x.textContent=d(i)),g&&(g.textContent=d(o)),f&&(f.textContent=d(E))}b(),window._nextEventTimer||(window._nextEventTimer=setInterval(b,3e4))});
