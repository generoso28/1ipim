document.addEventListener("astro:page-load", () => {
  if (!document.getElementById("sj-root")) return;
  const g = document.getElementById("sj-nav");
  if (g) {
    const e = () => {
      g.classList.toggle("scrolled", window.scrollY > 80);
    };
    (window.addEventListener("scroll", e, { passive: !0 }), e());
  }
  const a = document.getElementById("sj-hero-video"),
    p = document.getElementById("sj-unmute-btn"),
    u = document.getElementById("sj-unmute-icon");
  a &&
    p &&
    u &&
    p.addEventListener("click", () => {
      ((a.muted = !a.muted),
        (u.className = a.muted
          ? "fa-solid fa-volume-xmark"
          : "fa-solid fa-volume-high"),
        p.classList.toggle("sj-unmute-active", !a.muted));
    });
  const m = () => {
    const e = new Date("2026-07-20T19:30:00-03:00").getTime(),
      o = Date.now(),
      t = e - o;
    if (t <= 0) {
      const d = document.getElementById("sj-countdown");
      d &&
        (d.innerHTML =
          '<p class="sj-heading sj-gold-text" style="font-size:1.5rem;">É AGORA!</p>');
      return;
    }
    const n = Math.floor(t / (1e3 * 60 * 60 * 24)),
      l = Math.floor((t % (1e3 * 60 * 60 * 24)) / (1e3 * 60 * 60)),
      c = Math.floor((t % (1e3 * 60 * 60)) / (1e3 * 60)),
      s = document.getElementById("sj-days"),
      i = document.getElementById("sj-hours"),
      r = document.getElementById("sj-mins");
    (s && (s.textContent = String(n).padStart(2, "0")),
      i && (i.textContent = String(l).padStart(2, "0")),
      r && (r.textContent = String(c).padStart(2, "0")));
  };
  (m(), setInterval(m, 6e4));
  const h = document.querySelectorAll(".sj-reveal");
  if (h.length > 0) {
    const e = new IntersectionObserver(
      (o) => {
        o.forEach((t) => {
          t.isIntersecting &&
            (t.target.classList.add("is-visible"), e.unobserve(t.target));
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    h.forEach((o) => e.observe(o));
  }
  const f = document.getElementById("sj-particles");
  if (f) {
    const e = () => {
        const t = document.createElement("div");
        ((t.className = "sj-particle"),
          (t.style.left = Math.random() * 100 + "%"),
          (t.style.bottom = "-5px"),
          (t.style.animationDuration = 6 + Math.random() * 8 + "s"),
          (t.style.animationName = "sj-float"),
          (t.style.animationTimingFunction = "linear"),
          (t.style.animationFillMode = "forwards"),
          (t.style.width = 1 + Math.random() * 2 + "px"),
          (t.style.height = t.style.width),
          (t.style.background =
            Math.random() > 0.5 ? "var(--sj-gold)" : "var(--sj-cyan)"),
          (t.style.opacity = "0"),
          f.appendChild(t),
          setTimeout(() => t.remove(), 14e3));
      },
      o = setInterval(() => {
        if (!document.getElementById("sj-particles")) {
          clearInterval(o);
          return;
        }
        e();
      }, 800);
    for (let t = 0; t < 5; t++) setTimeout(e, t * 300);
  }
  if (typeof gsap < "u" && typeof ScrollTrigger < "u") {
    gsap.registerPlugin(ScrollTrigger);
    const e = document.getElementById("sj-video-card"),
      o = document.getElementById("sj-video-card-overlay"),
      t = document.getElementById("sj-hero");
    if (e && t) {
      o && gsap.set(o, { opacity: 0 });
      const n = document.createElement("div");
      ((n.id = "sj-video-ghost"),
        (n.className = "sj-bento-4col"),
        (n.style.cssText =
          "aspect-ratio:16/9; visibility:hidden; display:block;"),
        e.parentNode.insertBefore(n, e),
        gsap.set(e, {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 100,
          borderRadius: "0px",
          maxWidth: "none",
        }),
        ScrollTrigger.create({
          trigger: t,
          start: "top top",
          end: "bottom top",
          scrub: !0,
          onUpdate: (s) => {
            const i = s.progress,
              r = n.getBoundingClientRect(),
              d = document.documentElement.clientWidth,
              y = window.innerHeight,
              v = gsap.utils.interpolate(0, r.top, i),
              x = gsap.utils.interpolate(0, r.left, i),
              E = gsap.utils.interpolate(d, r.width, i),
              j = gsap.utils.interpolate(y, r.height, i),
              I = gsap.utils.interpolate(0, 24, i),
              w = gsap.utils.clamp(0, 1, (i - 0.5) * 2);
            (gsap.set(e, {
              top: v + "px",
              left: x + "px",
              width: E + "px",
              height: j + "px",
              borderRadius: I + "px",
            }),
              o && gsap.set(o, { opacity: w }));
          },
          onLeave: () => {
            (gsap.set(e, {
              clearProps:
                "position,top,left,width,height,zIndex,maxWidth,borderRadius",
            }),
              o && gsap.set(o, { opacity: 1 }),
              (n.style.display = "none"));
          },
          onEnterBack: () => {
            n.style.display = "";
            const s = n.getBoundingClientRect();
            gsap.set(e, {
              position: "fixed",
              top: s.top + "px",
              left: s.left + "px",
              width: s.width + "px",
              height: s.height + "px",
              zIndex: 100,
              borderRadius: "24px",
              maxWidth: "none",
            });
          },
        }));
      const l = document.getElementById("sj-scroll-hint"),
        c = document.getElementById("sj-unmute-btn");
      (l &&
        gsap.to(l, {
          opacity: 0,
          scrollTrigger: {
            trigger: t,
            start: "top top",
            end: "+=10%",
            scrub: 0.5,
          },
        }),
        c &&
          gsap.to(c, {
            opacity: 0,
            scrollTrigger: {
              trigger: t,
              start: "top top",
              end: "+=10%",
              scrub: 0.5,
            },
          }));
    }
  }
  document.querySelectorAll('.sj-page a[href^="#"]').forEach((e) => {
    e.addEventListener("click", (o) => {
      o.preventDefault();
      const t = e.getAttribute("href");
      if (!t) return;
      const n = document.querySelector(t);
      n && n.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
});
