document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray(".scroll-card").forEach((card) => {
        gsap.fromTo(card,
            { opacity: 0, y: 50, visibility: "hidden" },
            { opacity: 1, y: 0, visibility: "visible", duration: 1, ease: "power3.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 85%", // Ajuste fino para iniciar antes do usuário ver
                    toggleActions: "play none none none"
                }
            }
        );
    });
});