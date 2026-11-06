/** Configuração do Lighthouse CI (mobile, servidor local de preview). */
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [
        "http://localhost:4321/",
        "http://localhost:4321/visitantes/",
        "http://localhost:4321/contato/",
      ],
      settings: {
        chromeFlags: "--no-sandbox --headless=new --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.75 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-reports",
    },
  },
};
