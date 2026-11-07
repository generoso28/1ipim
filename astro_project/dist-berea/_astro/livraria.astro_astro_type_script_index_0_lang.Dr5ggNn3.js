import{W as S}from"./api.BQZs3I30.js";const j=S,_="/assets/img/livraria/placeholder.svg",q=24,s=i=>String(i??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"),p=i=>typeof i=="number"&&Number.isFinite(i)?i.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"",u=i=>i.capa?i.capa.startsWith("http")||i.capa.startsWith("/")?i.capa:`/${i.capa}`:_,e={page:1,pages:1,total:0,q:"",categoria:"",items:[],categories:[],loading:!1};function x(){const i=document.getElementById("catalog-grid");if(!i||i.dataset.ready==="1")return;i.dataset.ready="1";const l=i,f=document.getElementById("catalog-search"),c=document.getElementById("catalog-category"),v=document.getElementById("catalog-loading"),y=document.getElementById("catalog-error"),h=document.getElementById("catalog-empty"),n=document.getElementById("catalog-more"),b=document.getElementById("catalog-count"),d=document.getElementById("book-detail-modal"),L=document.getElementById("book-detail-content"),w=()=>{if(!c)return;const t=e.categoria;c.innerHTML='<option value="">Todas as categorias</option>'+e.categories.map(a=>`<option value="${s(a)}">${s(a)}</option>`).join(""),c.value=t},E=t=>{const a=p(t.preco_dinheiro),r=p(t.preco_cartao);return`
      <button type="button" class="catalog-card group text-left bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full" data-id="${t.id}">
        <div class="aspect-[3/4] bg-gray-50 dark:bg-slate-900 overflow-hidden relative">
          <img src="${s(u(t))}" alt="Capa de ${s(t.titulo)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          ${t.categoria?`<span class="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-[var(--color-brand)]">${s(t.categoria)}</span>`:""}
        </div>
        <div class="p-4 md:p-5 flex flex-col flex-1">
          <h2 class="font-black text-gray-900 dark:text-white text-sm md:text-base leading-tight mb-1">${s(t.titulo)}</h2>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-3">${s(t.autor||"Autor não informado")}</p>
          <div class="mt-auto flex items-end justify-between gap-2">
            <div>
              ${a?`<p class="text-base font-black text-[var(--color-brand)]">${s(a)}</p><p class="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold">à vista</p>`:'<p class="text-[11px] text-gray-500">Consulte o preço</p>'}
            </div>
            ${r?`<p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold">${s(r)} no cartão</p>`:""}
          </div>
        </div>
      </button>
    `},B=t=>{t||(l.innerHTML=""),l.innerHTML+=e.items.map(E).join(""),l.classList.toggle("hidden",e.items.length===0),h?.classList.toggle("hidden",e.items.length>0),n&&n.classList.toggle("hidden",e.page>=e.pages),b&&(b.innerText=`${e.items.length} de ${e.total} livros exibidos`),l.querySelectorAll(".catalog-card").forEach(a=>{a.onclick=()=>{const r=Number(a.getAttribute("data-id")),o=e.items.find(C=>C.id===r);o&&I(o)}})},I=t=>{if(!d||!L)return;const a=p(t.preco_dinheiro),r=p(t.preco_cartao);L.innerHTML=`
      <div class="grid grid-cols-1 md:grid-cols-[280px,1fr]">
        <div class="bg-gray-50 dark:bg-slate-800 p-6 md:p-8 flex items-center justify-center">
          <img src="${s(u(t))}" alt="Capa de ${s(t.titulo)}" class="w-full max-w-[220px] aspect-[3/4] object-cover rounded-2xl shadow-xl">
        </div>
        <div class="p-6 md:p-10">
          ${t.categoria?`<p class="text-[10px] font-black uppercase tracking-widest text-[var(--color-brand)] mb-2">${s(t.categoria)}</p>`:""}
          <h2 class="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-2">${s(t.titulo)}</h2>
          ${t.subtitulo?`<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${s(t.subtitulo)}</p>`:""}
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">${s(t.autor||"Autor não informado")}</p>
          ${t.editora?`<p class="text-xs text-gray-400 mb-4">${s(t.editora)}</p>`:""}
          <div class="flex flex-wrap items-end gap-4 my-6">
            ${a?`<div><p class="text-3xl font-black text-[var(--color-brand)]">${s(a)}</p><p class="text-[10px] uppercase font-bold text-gray-400">à vista</p></div>`:""}
            ${r?`<p class="text-sm text-gray-500">${s(r)} no cartão</p>`:""}
          </div>
          ${t.sinopse?`<div class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-64 overflow-y-auto pr-2">${t.sinopse}</div>`:""}
          <div class="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Estoque sob consulta.</strong> Fale com a secretaria durante a semana ou com a equipe da Livraria aos domingos. O catálogo pode não incluir todos os títulos disponíveis.
          </div>
        </div>
      </div>
    `,d.classList.remove("hidden"),document.body.classList.add("overflow-hidden")},m=()=>{d?.classList.add("hidden"),document.body.classList.remove("overflow-hidden")},A=()=>{const t=e.items.slice(0,24).map(r=>({"@type":"Book",name:r.titulo,author:r.autor?{"@type":"Person",name:r.autor}:void 0,publisher:r.editora?{"@type":"Organization",name:r.editora}:void 0,image:new URL(u(r),window.location.origin).href,url:`${window.location.origin}/livraria/`}));let a=document.getElementById("livraria-jsonld");a||(a=document.createElement("script"),a.id="livraria-jsonld",a.setAttribute("type","application/ld+json"),document.head.appendChild(a)),a.textContent=JSON.stringify({"@context":"https://schema.org","@type":"ItemList",name:"Catálogo da Livraria 1IPIM",numberOfItems:e.total,itemListElement:t.map((r,o)=>({"@type":"ListItem",position:o+1,item:r}))})},g=async(t=!1)=>{if(e.loading)return;e.loading=!0,t||(v?.classList.remove("hidden"),y?.classList.add("hidden"),h?.classList.add("hidden"),l.classList.add("hidden")),n&&(n.disabled=!0);const a=new URLSearchParams({per_page:String(q),page:String(e.page)});e.q&&a.set("q",e.q),e.categoria&&a.set("categoria",e.categoria);try{const r=await fetch(`${j}/livraria?${a.toString()}`,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("catalog_unavailable");const o=await r.json();e.items=t?[...e.items,...o.items||[]]:o.items||[],e.total=o.total||0,e.pages=Math.max(1,o.pages||1),e.categories=o.categorias||[],w(),B(t),A()}catch{y?.classList.remove("hidden")}finally{e.loading=!1,v?.classList.add("hidden"),n&&(n.disabled=!1)}};let $=0;f?.addEventListener("input",()=>{window.clearTimeout($),$=window.setTimeout(()=>{e.q=f.value.trim(),e.page=1,g(!1)},350)}),c?.addEventListener("change",()=>{e.categoria=c.value,e.page=1,g(!1)}),n?.addEventListener("click",()=>{e.page>=e.pages||(e.page++,g(!0))}),document.getElementById("book-detail-close")?.addEventListener("click",m),d?.addEventListener("click",t=>{t.target===d&&m()}),document.addEventListener("keydown",t=>{t.key==="Escape"&&!d?.classList.contains("hidden")&&m()}),g(!1)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x();document.addEventListener("astro:page-load",x);
