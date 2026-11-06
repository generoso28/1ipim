import{a as s}from"./auth-store.Mdv7y9cp.js";import{a as n}from"./portal-config.DrT3V5R5.js";document.addEventListener("astro:page-load",()=>{const o=document.getElementById("dash-user-name"),i=document.getElementById("dashboard-grid"),t=s.getUser(),r=n(t.role||"",t.nicename||"");o&&(o.innerText=t.displayName||"Voluntário");const e=[];r.canReflexoes&&e.push({title:"Reflexões",desc:"Gerencie as mensagens e boletins semanais.",icon:"fa-pen-nib",color:"bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",link:"/portal/gerenciar-reflexoes"}),r.canEscalas&&e.push({title:"Escalas de Serviço",desc:r.isPrivileged?"Gerencie todos os voluntários":"Veja seus dias de serviço",icon:"fa-calendar-check",color:"bg-brand-100 text-[var(--color-brand)] dark:bg-[var(--color-brand)]/10 dark:text-[var(--color-brand)]",link:"/portal/escalas"}),r.canLivraria&&e.push({title:"Livraria",desc:"Gerencie catálogo e estoque da igreja.",icon:"fa-book",color:"bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",link:"/portal/livraria"}),r.isAdmin&&(e.push({title:"Voluntários",desc:"Aprove novos cadastros e defina cargos.",icon:"fa-users-gear",color:"bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",link:"/portal/usuarios"}),e.push({title:"Ministérios",desc:"Crie e organize as equipes de trabalho.",icon:"fa-layer-group",color:"bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",link:"/portal/ministerios"})),i&&(i.innerHTML=e.map(a=>`
                <a href="${a.link}" class="group bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between h-full">
                    <div>
                        <div class="w-14 h-14 ${a.color} rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                            <i class="fa-solid ${a.icon}"></i>
                        </div>
                        <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">${a.title}</h3>
                        <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">${a.desc}</p>
                    </div>
                    <div class="mt-8 flex items-center gap-2 text-[var(--color-brand)] font-bold text-sm">
                        Abrir ferramenta <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </div>
                </a>
            `).join(""))});
