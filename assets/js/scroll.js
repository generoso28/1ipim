gsap.registerPlugin(ScrollTrigger);
document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray(".scroll-card").forEach((card, i) => {
        gsap.fromTo(card,
            {opacity: 0, y: 37, visibility: "hidden"}, // Movendo um pouco mais para baixo para suavizar
            {
                opacity: 1, y: 0, visibility: "visible", duration: 1.5, ease: "power2.out", // Ajustando a duração e o easing
                scrollTrigger: {
                    trigger: card,
                    start: "top 100%", // Inicia antes para dar uma sensação de fluidez
                    toggleActions: "play none none reverse",
                    once: false
                }
            }
        );
    });
    gsap.from(".box", {
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.2 // Atraso de 0.2s entre cada elemento
    });
});
// Função para controlar a opacidade com base no scroll
window.addEventListener("scroll", function () {
    let scrollTop = window.scrollY;
    let fadeDiv = document.getElementById("fadeDiv");

    if (window.innerWidth >= 550) {
        // Define um ponto de início e fim para o efeito
        let fadeStart = 15; // Começa a desaparecer a partir de 100px de scroll
        let fadeEnd = 25; // Totalmente invisível após 400px de scroll

        if (scrollTop < fadeStart) {
            fadeDiv.style.opacity = "1"; // Mantém visível no topo da página
        } else if (scrollTop > fadeEnd) {
            fadeDiv.style.opacity = "0"; // Totalmente invisível depois do fadeEnd
        } else {
            // Calcula a opacidade proporcional ao scroll
            let opacity = 1 - (scrollTop - fadeStart) / (fadeEnd - fadeStart);
            fadeDiv.style.opacity = opacity;
        }
    } else {
        // Define um ponto de início e fim para o efeito
        let fadeStart = 15; // Começa a desaparecer a partir de 100px de scroll
        let fadeEnd = 85; // Totalmente invisível após 400px de scroll

        if (scrollTop < fadeStart) {
            fadeDiv.style.opacity = "1"; // Mantém visível no topo da página
        } else if (scrollTop > fadeEnd) {
            fadeDiv.style.opacity = "0"; // Totalmente invisível depois do fadeEnd
        } else {
            // Calcula a opacidade proporcional ao scroll
            let opacity = 1 - (scrollTop - fadeStart) / (fadeEnd - fadeStart);
            fadeDiv.style.opacity = opacity;
        }
    }
});

// Importando GSAP e ScrollTrigger
gsap.registerPlugin(ScrollTrigger);


// Criar uma variável para armazenar os triggers de zoom
let zoomTriggers = [];

// Função para verificar se o dispositivo é um tablet
function isTablet() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Ajuste para capturar tablets em resolução 1024x600
    return (width >= 600 && width <= 1280) && (height >= 800 && height <= 2000) || (width === 1024 && height === 600) || (width>=1280 && height>=800);
}
// Função que inicializa o efeito de zoom
function initializeZoomEffect() {
    if (window.innerWidth >= 550 && !isTablet()) {
        gsap.utils.toArray(".imagens-nossa-historia").forEach(img => {
            const zoomTrigger = gsap.fromTo(img,
                {scale: 1},  // Inicializa o scale para 1 (sem zoom)
                {
                    scale: 4,  // Zoom final quando o scroll atingir o limite
                    scrollTrigger: {
                        trigger: img,
                        start: "top 80%",  // Começa a animação antes de a imagem entrar completamente na tela
                        end: "bottom top",  // Quando a parte inferior da imagem estiver no topo da tela
                        scrub: true,  // Faz o zoom de forma contínua enquanto o usuário rola
                        markers: false  // Remova os marcadores para evitar distrações
                    }
                }
            );
            // Armazena o trigger de zoom
            zoomTriggers.push(zoomTrigger.scrollTrigger);
        });
    } else {
        // Remove o efeito de zoom quando a tela for pequena, mas não afeta outros triggers
        zoomTriggers.forEach(trigger => trigger.kill());  // Mata apenas os triggers de zoom
        gsap.utils.toArray(".imagens-nossa-historia img").forEach(img => {
            gsap.set(img, {scale: 1});  // Restaura o estado inicial
        });
    }
}


// Evento de carregamento da página
document.addEventListener("DOMContentLoaded", function () {
    // Inicializa o efeito de zoom se a largura for maior que 600px
    initializeZoomEffect();
});

// Evento de redimensionamento da janela
window.addEventListener("resize", function () {
    // Reaplicar o efeito de zoom com base no tamanho da janela
    initializeZoomEffect();
});