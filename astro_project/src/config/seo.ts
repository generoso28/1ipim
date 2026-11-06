/**
 * Dados centrais de SEO da 1IPIM.
 *
 * Mantém nome, endereço, telefone, redes e textos por página em um só lugar.
 * O Layout usa esses dados para canonical, Open Graph, keywords, breadcrumbs
 * e JSON-LD (Church/Organization + WebSite).
 */

export const SITE = {
  name: "Primeira Igreja Presbiteriana Independente de Machado",
  shortName: "1IPIM",
  alternateName: [
    "1IPIM",
    "1ª IPI de Machado",
    "IPI Machado",
    "Primeira Igreja Presbiteriana de Machado",
    "Igreja Presbiteriana em Machado",
  ],
  url: "https://1ipim.online",
  logo: "https://1ipim.online/assets/img/logo_transp.png",
  image: "https://1ipim.online/assets/img/historia/150anos-Isaias.webp",
  description:
    "Igreja Presbiteriana Independente em Machado (MG), há mais de 150 anos servindo a Deus e à comunidade. Cultos, mensagens, pequenos grupos e visitas.",
  telephone: "+55-35-98861-3046",
  email: "secretaria1ipi@gmail.com",
  address: {
    streetAddress: "Rua Airton Rodrigues Leite, 26",
    addressLocality: "Machado",
    addressRegion: "MG",
    postalCode: "37750-000",
    addressCountry: "BR",
  },
  geo: {
    latitude: -21.6800008,
    longitude: -45.9225982,
  },
  mapUrl:
    "https://maps.google.com/?q=Rua+Airton+Rodrigues+Leite,+26,+Machado,+MG",
  sameAs: [
    "https://www.instagram.com/1ipim/",
    "https://www.youtube.com/@1ipimachado",
    "https://www.youtube.com/@TorreCast",
    "https://www.instagram.com/juventude_getup/",
  ],
  areaServed: [
    "Machado",
    "Paraguaçu",
    "Pouso Alegre",
    "Carvalhópolis",
    "Serrania",
    "Minas Gerais",
  ],
  foundingDate: "1874-09-27",
  memberOf: {
    "@type": "Organization",
    name: "Igreja Presbiteriana Independente do Brasil",
    url: "https://www.ipi.org.br",
  },
  openingHours: [
    { dayOfWeek: "Sunday", opens: "09:00", closes: "12:00" },
    { dayOfWeek: "Sunday", opens: "19:00", closes: "21:00" },
    { dayOfWeek: "Wednesday", opens: "18:30", closes: "20:00" },
    { dayOfWeek: "Saturday", opens: "19:30", closes: "21:30" },
  ],
} as const;

interface PageSeo {
  title: string;
  description: string;
  keywords: string;
  crumb?: string;
  type?: "website" | "article";
}

/** Chaves sem barra final. "/" é a home. */
export const PAGE_SEO: Record<string, PageSeo> = {
  "/": {
    title: "Igreja Presbiteriana em Machado MG | 1IPIM",
    description:
      "A 1ª Igreja Presbiteriana Independente de Machado (MG) há mais de 150 anos. Veja horários dos cultos, mensagens, pequenos grupos e como nos visitar.",
    keywords:
      "igreja presbiteriana machado, igreja em machado mg, 1ipim, ipi machado, primeira igreja presbiteriana, culto em machado, igreja machado mg",
  },
  "/visitantes": {
    title: "Visitantes | Igreja Presbiteriana em Machado MG",
    description:
      "Primeira vez na 1IPIM? Saiba o que esperar do culto, estacionamento, ministério infantil e como chegar à igreja presbiteriana em Machado (MG).",
    keywords:
      "visitar igreja em machado, igreja presbiteriana machado mg, primeira vez na igreja, culto em machado, igreja para visitar machado",
    crumb: "Visitantes",
  },
  "/historia": {
    title: "Nossa História (150 anos) | 1IPIM Machado",
    description:
      "Conheça os mais de 150 anos da 1ª Igreja Presbiteriana Independente de Machado (MG): fundação em 1874, pastores, templos e a fé que atravessa gerações.",
    keywords:
      "história igreja presbiteriana machado, igreja 150 anos machado, primeira igreja presbiteriana machado mg, ipi machado história",
    crumb: "História",
  },
  "/cremos": {
    title: "O que Cremos | Igreja Presbiteriana em Machado",
    description:
      "As doutrinas da 1IPIM em Machado (MG): doutrina dos apóstolos, comunhão, partir do pão e orações (Atos 2:42). Conheça a fé da igreja presbiteriana.",
    keywords:
      "o que cremos igreja presbiteriana, doutrina reformada machado, igreja presbiteriana machado mg, fé reformada",
    crumb: "O que cremos",
  },
  "/pastores": {
    title: "Pastores e Liderança | 1IPIM Machado",
    description:
      "Conheça o corpo pastoral da 1ª Igreja Presbiteriana Independente de Machado (MG), com formação, ministérios e a história do Pr. Isaías.",
    keywords:
      "pastores igreja presbiteriana machado, liderança 1ipim, pastor machado mg, pr isaias machado",
    crumb: "Pastores",
  },
  "/programacao": {
    title: "Horários dos Cultos | Igreja em Machado MG",
    description:
      "Horários dos cultos e atividades da 1IPIM em Machado (MG): Escola Bíblica Dominical, Culto Solene, reunião de oração, Get Up, ensaios e encontros.",
    keywords:
      "horário culto machado mg, igreja presbiteriana machado horários, culto domingo machado, ebd machado, get up machado",
    crumb: "Programação",
  },
  "/eventos": {
    title: "Eventos e Agenda | 1IPIM Machado",
    description:
      "Agenda da 1IPIM em Machado (MG): acampamentos, Semana Jovem, conferências, cultos especiais e eventos da igreja presbiteriana.",
    keywords:
      "eventos igreja machado mg, agenda igreja presbiteriana, acampamento maanaim, semana jovem machado, conferência fé reformada",
    crumb: "Eventos",
  },
  "/mensagens": {
    title: "Mensagens e Cultos | Igreja Presbiteriana Machado",
    description:
      "Assista às últimas mensagens e cultos da 1ª Igreja Presbiteriana Independente de Machado (MG) e acompanhe as playlists no Spotify.",
    keywords:
      "mensagens igreja presbiteriana machado, cultos 1ipim, pregações machado mg, youtube 1ipim, podcast torrecast",
    crumb: "Mensagens",
  },
  "/reflexoes": {
    title: "Reflexões e Boletim | 1IPIM Machado",
    description:
      "Mensagens semanais, estudos bíblicos e reflexões da 1IPIM, igreja presbiteriana em Machado (MG), para edificar sua caminhada com Cristo.",
    keywords:
      "reflexões bíblicas machado, boletim igreja presbiteriana, estudo bíblico machado mg, palavra do pastor 1ipim",
    crumb: "Reflexões",
  },
  "/semana-jovem": {
    title: "Semana Jovem 2026 | 1IPIM Machado",
    description:
      "Semana Jovem 2026 da 1IPIM em Machado (MG): programação, inscrições e encontros do ministério jovem Get Up da igreja presbiteriana.",
    keywords:
      "semana jovem machado, get up 1ipim, jovens igreja presbiteriana machado, evento jovem machado mg",
    crumb: "Semana Jovem",
  },
  "/pg": {
    title: "Pequenos Grupos | Igreja Presbiteriana em Machado",
    description:
      "Pequenos Grupos da 1IPIM em Machado (MG): encontros semanais em casas para estudar a Bíblia, orar e viver em comunidade. Encontre o grupo mais próximo.",
    keywords:
      "pequenos grupos machado, grupos pequenos igreja presbiteriana, célula machado mg, comunhão 1ipim",
    crumb: "Pequenos Grupos",
  },
  "/contato": {
    title: "Contato e Endereço | Igreja em Machado MG",
    description:
      "Fale com a 1IPIM: endereço da sede em Machado (MG), telefone, e-mail, mapa e congregações em Paraguaçu, Pouso Alegre, Carvalhópolis e região.",
    keywords:
      "endereço igreja presbiteriana machado, igreja em machado mg, contato 1ipim, congregações machado, telefone igreja machado",
    crumb: "Contato",
  },
  "/privacidade": {
    title: "Política de Privacidade | 1IPIM",
    description:
      "Como a 1IPIM trata os dados do formulário de contato, o uso do Google Analytics com consentimento e os cookies do site.",
    keywords:
      "política de privacidade 1ipim, lgpd igreja machado, cookies analytics",
    crumb: "Privacidade",
  },
};

/** Converte um caminho em URL canônica de produção (sempre com barra final). */
export function canonicalUrl(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "");
  return `${SITE.url}${clean === "" ? "/" : `${clean}/`}`;
}
