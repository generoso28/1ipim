gsap.registerPlugin(ScrollTrigger);
document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray(".scroll-card").forEach((card, i) => {
        gsap.fromTo(card,
            {opacity: 0, y: 80, visibility: "hidden"}, // Movendo um pouco mais para baixo para suavizar
            {
                opacity: 1, y: 0, visibility: "visible", duration: 2.0, ease: "power2.out", // Ajustando a duração e o easing
                scrollTrigger: {
                    trigger: card,
                    start: "top 95%", // Inicia antes para dar uma sensação de fluidez
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

// Função que inicializa o efeito de zoom
function initializeZoomEffect() {
    if (window.innerWidth >= 550) {
        gsap.utils.toArray(".imagens-nossa-historia").forEach(img => {
            gsap.fromTo(img,
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
        });
    } else {
        // Remove qualquer efeito de zoom se a tela for pequena
        gsap.utils.toArray(".imagens-nossa-historia img").forEach(img => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());  // Mata os triggers para reiniciar
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





