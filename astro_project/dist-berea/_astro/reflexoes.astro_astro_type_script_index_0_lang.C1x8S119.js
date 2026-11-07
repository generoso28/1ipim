import{b as h}from"./api.BQZs3I30.js";(function(){const c=h,g=()=>{const n=document.getElementById("wp-posts-grid");if(!n||n.dataset.loaded)return;n.dataset.loaded="1";const m=document.getElementById("wp-loading"),l=document.getElementById("wp-error"),o=document.getElementById("post-modal"),x=document.getElementById("post-content-container"),i=document.getElementById("close-post-modal");if(!n)return;const u=`${c}/wp-json/wp/v2/categories?per_page=100`;fetch(u).then(e=>e.json()).then(e=>{let t="";const a=e.find(r=>r.slug==="reflexoes"||r.name.toLowerCase()==="reflexões"||r.name.toLowerCase()==="reflexoes");a?(console.log("Filtro de Categoria Ativo:",a.name,"(ID:",a.id,")"),t=`&categories=${a.id}`):console.warn('Aviso: Categoria "Reflexões" não encontrada no WordPress. Mostrando todos os posts.');const d=`${c}/wp-json/wp/v2/posts?_embed&per_page=9${t}`;return fetch(d)}).then(e=>{if(!e||!e.ok)throw new Error("Falha ao buscar posts");return e.json()}).then(e=>{if(m.classList.add("hidden"),!e||e.length===0){l.querySelector("p").innerText="Nenhuma reflexão encontrada.",l.classList.remove("hidden");return}n.classList.remove("hidden"),n.innerHTML=e.map(t=>{const a=t.title.rendered,d=t.excerpt.rendered.replace(/<[^>]*>?/gm,"").substring(0,160)+"...",r=new Date(t.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});let s=null;return t._embedded&&t._embedded["wp:featuredmedia"]&&(s=t._embedded["wp:featuredmedia"][0].source_url),s?`
                                <article class="bg-gray-50 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-700 flex flex-col group">
                                    <div class="relative aspect-[16/9] overflow-hidden">
                                        <img src="${s}" alt="${a}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div class="p-8 flex flex-col flex-1">
                                        <p class="text-[var(--color-brand)] text-xs font-bold uppercase tracking-widest mb-3">${r}</p>
                                        <h3 class="font-bold text-gray-900 dark:text-white text-xl mb-4 line-clamp-2 leading-tight group-hover:text-[var(--color-brand)] transition-colors">
                                            ${a}
                                        </h3>
                                        <div class="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                                            ${d}
                                        </div>
                                        <button class="read-more-btn mt-auto inline-flex items-center gap-2 text-[var(--color-brand)] font-bold text-sm hover:gap-3 transition-all" data-id="${t.id}">
                                            Continuar lendo <i class="fa-solid fa-arrow-right-long"></i>
                                        </button>
                                    </div>
                                </article>
                            `:`
                                <article class="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border-l-4 border-[var(--color-brand)] p-8 flex flex-col group relative overflow-hidden">
                                    <div class="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                        <i class="fa-solid fa-quote-right text-8xl"></i>
                                    </div>
                                    <p class="text-[var(--color-brand)] text-xs font-bold uppercase tracking-widest mb-3">${r}</p>
                                    <h3 class="font-bold text-gray-900 dark:text-white text-2xl mb-4 line-clamp-2 leading-tight group-hover:text-[var(--color-brand)] transition-colors">
                                        ${a}
                                    </h3>
                                    <div class="text-gray-600 dark:text-gray-400 text-base mb-8 line-clamp-4 leading-relaxed">
                                        ${d}
                                    </div>
                                    <button class="read-more-btn mt-auto inline-flex items-center gap-2 text-[var(--color-brand)] font-bold text-sm hover:gap-3 transition-all" data-id="${t.id}">
                                        Ler reflexão <i class="fa-solid fa-arrow-right-long"></i>
                                    </button>
                                </article>
                            `}).join(""),document.querySelectorAll(".read-more-btn").forEach(t=>{t.addEventListener("click",()=>{const a=t.getAttribute("data-id"),d=e.find(r=>r.id==a);d&&f(d)})})}).catch(e=>{console.error(e),m.classList.add("hidden"),l.classList.remove("hidden")});function f(e){const t=new Date(e.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});let a="";e._embedded&&e._embedded["wp:featuredmedia"]&&(a=e._embedded["wp:featuredmedia"][0].source_url),x.innerHTML=`
                    ${a?`<img src="${a}" class="w-full h-64 md:h-80 object-cover rounded-2xl mb-8 shadow-lg" />`:""}
                    <p class="text-[var(--color-brand)] font-bold uppercase tracking-widest text-sm mb-2">${t}</p>
                    <h2 class="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-8 leading-tight">${e.title.rendered}</h2>
                    <div class="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed">
                        ${e.content.rendered}
                    </div>
                `,o.classList.remove("hidden"),o.classList.add("flex"),document.body.style.overflow="hidden"}i&&o&&(i.addEventListener("click",()=>{o.classList.add("hidden"),o.classList.remove("flex"),document.body.style.overflow="auto"}),o.addEventListener("click",e=>{e.target===o&&i.click()}))};document.addEventListener("astro:page-load",g),document.readyState!=="loading"&&g()})();
