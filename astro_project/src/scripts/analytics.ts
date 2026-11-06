/**
 * Consentimento de cookies + Google Analytics 4.
 *
 * O gtag.js só é carregado depois que o visitante aceita. A escolha fica em
 * localStorage e pode ser revista pelo link "Preferências de cookies".
 */

const CONSENT_KEY = "1ipim_consent_analytics";

type Consent = "granted" | "denied";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    trackEvent?: (name: string, params?: Record<string, unknown>) => void;
  }
}

let gaLoaded = false;
let lastTracked = "";

function measurementId(): string {
  return (document.documentElement.dataset.gaId || "").trim();
}

function getConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function setConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Sem localStorage, trata como não consentido.
  }
}

function loadGA(): void {
  const id = measurementId();
  if (!id || gaLoaded) return;
  gaLoaded = true;

  window.dataLayer = window.dataLayer || [];
  // Formato canônico do snippet do Google: gtag.js espera `arguments`,
  // não um array montado com rest parameters.
  const gtag = function (this: unknown): void {
    window.dataLayer?.push(arguments);
  } as Gtag;
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", id, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function trackPageView(): void {
  if (!gaLoaded || !window.gtag) return;

  const key = window.location.pathname + window.location.search;
  if (key === lastTracked) return;
  lastTracked = key;

  window.gtag("event", "page_view", {
    page_location: window.location.href,
    page_title: document.title,
  });
}

function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!gaLoaded || !window.gtag) return;
  window.gtag("event", name, params);
}

window.trackEvent = trackEvent;

function syncBanner(): void {
  const banner = document.getElementById("consent-banner");
  if (!banner) return;

  const show = getConsent() === null;
  banner.classList.toggle("hidden", !show);
  banner.classList.toggle("flex", show);
}

function accept(): void {
  setConsent("granted");
  loadGA();
  trackPageView();
  syncBanner();
}

function reject(): void {
  setConsent("denied");
  syncBanner();
}

function openPreferences(): void {
  const banner = document.getElementById("consent-banner");
  if (!banner) return;
  banner.classList.remove("hidden");
  banner.classList.add("flex");
}

let setupDone = false;

function setup(): void {
  if (setupDone) return;
  setupDone = true;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest("#consent-accept")) {
      accept();
      return;
    }
    if (target.closest("#consent-reject")) {
      reject();
      return;
    }
    if (target.closest("#open-consent")) {
      event.preventDefault();
      openPreferences();
    }
  });

  if (getConsent() === "granted") loadGA();
  syncBanner();
  trackPageView();
}

document.addEventListener("astro:page-load", () => {
  syncBanner();
  if (getConsent() === "granted") {
    loadGA();
    trackPageView();
  }
});

if (document.readyState !== "loading") setup();
document.addEventListener("DOMContentLoaded", setup, { once: true });
