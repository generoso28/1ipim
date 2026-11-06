import{a as y}from"./auth-store.Mdv7y9cp.js";import{g as p}from"./portal-config.DrT3V5R5.js";document.addEventListener("astro:page-load",()=>{const d=document.getElementById("posts-table-body"),o=document.getElementById("loading-posts"),n=document.getElementById("no-posts"),u=y.getToken(),b="https://1ipim.online/admin";let f="publish";document.querySelectorAll(".filter-tab").forEach(t=>{t.addEventListener("click",a=>{document.querySelectorAll(".filter-tab").forEach(s=>{s.classList.remove("bg-[var(--color-brand)]","text-white"),s.classList.add("bg-white","dark:bg-slate-800","text-gray-500","dark:text-gray-400")});const r=a.currentTarget;r.classList.remove("bg-white","dark:bg-slate-800","text-gray-500","dark:text-gray-400"),r.classList.add("bg-[var(--color-brand)]","text-white"),f=r.getAttribute("data-filter")||"publish",l()})});async function l(){try{o&&o.classList.remove("hidden"),n&&n.classList.add("hidden"),d&&(d.innerHTML="");const t=p(b),r=await(await fetch(`${t}/wp-json/wp/v2/categories/?slug=reflexoes`)).json();let s=r&&r.length>0?r[0].id:null;const m=s?`&categories=${s}`:"",c=await(await fetch(`${t}/wp-json/wp/v2/posts/?_embed&per_page=100&status=${f}${m}`,{headers:{Authorization:`Bearer ${u}`}})).json();if(o&&o.classList.add("hidden"),!c||c.length===0||c.code){n&&n.classList.remove("hidden");return}d&&(d.innerHTML=c.map(e=>{const i=new Date(e.date||e.modified||new Date).toLocaleDateString("pt-BR"),h=f==="draft";return`
                        <tr class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors group animate-slide-up">
                            <td class="px-8 py-6">
                                <div class="font-bold text-gray-900 dark:text-white truncate max-w-md uppercase tracking-tight ${h?"line-through opacity-70":""}">${e.title.rendered||"(Sem Título)"}</div>
                                <div class="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1">ID: ${e.id} ${h?"• Movido para a lixeira":""}</div>
                            </td>
                            <td class="px-8 py-6 text-center">
                                <span class="bg-gray-100 dark:bg-slate-700/50 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 dark:border-slate-700/50">
                                    ${i}
                                </span>
                            </td>
                            <td class="px-8 py-6 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    ${h?`
                                    <button class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-green-500 text-gray-400 hover:text-green-500 rounded-xl transition-all shadow-sm" data-id="${e.id}" data-action="restore" title="Restaurar Publicação">
                                        <i class="fa-solid fa-rotate-left"></i>
                                    </button>
                                    <button class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-red-600 text-gray-400 hover:text-red-600 rounded-xl transition-all shadow-sm" data-id="${e.id}" data-action="delete" title="Excluir Permanentemente">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                    `:`
                                    <a href="/portal/editar-reflexao?id=${e.id}" class="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-[var(--color-brand)] text-gray-400 hover:text-[var(--color-brand)] rounded-xl transition-all shadow-sm" title="Editar Mensagem">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </a>
                                    <button class="delete-post-btn w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 hover:border-orange-500 text-gray-400 hover:text-orange-500 rounded-xl transition-all shadow-sm" data-id="${e.id}" data-action="trash" title="Enviar para Lixeira">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `}).join(""),document.querySelectorAll(".delete-post-btn").forEach(e=>{e.onclick=()=>{const g=e.getAttribute("data-id"),i=e.getAttribute("data-action");i==="trash"&&confirm("Mover esta reflexão para a lixeira?")?w(g,"draft"):i==="restore"&&confirm("Restaurar publicação no site agora mesmo?")?w(g,"publish"):i==="delete"&&confirm("ALERTA: Essa ação apagará do servidor WordPress e não possui volta. Continuar?")&&x(g)}}))}catch{o&&(o.innerText="Erro ao carregar postagens."),window.showToast("Erro ao sincronizar posts","error")}}async function w(t,a){if(t)try{const r=p(b);if(!(await fetch(`${r}/wp-json/wp/v2/posts/${t}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${u}`},body:JSON.stringify({status:a})})).ok)throw new Error;window.showToast(a==="draft"?"Movido para a lixeira":"Restaurado com sucesso!","success"),l()}catch{window.showToast("Erro ao atualizar reflexão","error")}}async function x(t){if(t)try{const a=p(b);if(!(await fetch(`${a}/wp-json/wp/v2/posts/${t}/?force=true`,{method:"DELETE",headers:{Authorization:`Bearer ${u}`}})).ok)throw new Error;window.showToast("Reflexão evaporada com sucesso!","success"),l()}catch{window.showToast("Erro ao excluir reflexão","error")}}l()});
