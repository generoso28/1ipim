import fs from "node:fs";
import path from "node:path";

/**
 * Gera um index.html estável para publicar os relatórios do Lighthouse CI no
 * Jenkins. O `lhci` cria nomes com timestamp; o Jenkins precisa de um arquivo
 * fixo (`index.html`).
 */
const dir = process.argv[2] || "lighthouse-reports";
const manifestPath = path.join(dir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("manifest.json do Lighthouse não encontrado; nada a gerar.");
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const score = (value) => (value == null ? "—" : Math.round(value * 100));
const color = (value, minimum) => {
  if (value == null) return "#5f6368";
  if (value >= minimum) return "#137333";
  if (value >= minimum - 0.1) return "#b06000";
  return "#b00020";
};

const rows = manifest
  .map((item) => {
    const file = path.basename(item.htmlPath);
    const summary = item.summary ?? {};
    return `<tr>
      <td><a href="${file}">${item.url}</a></td>
      <td style="color:${color(summary.performance, 0.75)}">${score(summary.performance)}</td>
      <td style="color:${color(summary.accessibility, 0.9)}">${score(summary.accessibility)}</td>
      <td style="color:${color(summary["best-practices"], 0.9)}">${score(summary["best-practices"])}</td>
      <td style="color:${color(summary.seo, 0.9)}">${score(summary.seo)}</td>
    </tr>`;
  })
  .join("\n");

const generatedAt = new Date().toLocaleString("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lighthouse CI — 1IPIM</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #202124; }
    h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
    p { color: #5f6368; margin: 0 0 1.5rem; }
    table { border-collapse: collapse; width: 100%; max-width: 900px; }
    th, td { padding: .7rem .8rem; border-bottom: 1px solid #e8eaed; text-align: left; }
    th { background: #f8f9fa; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
    td:nth-child(n+2), th:nth-child(n+2) { text-align: center; width: 110px; font-weight: 700; }
    a { color: #0b57d0; }
    .legend { font-size: .8rem; color: #5f6368; }
  </style>
</head>
<body>
  <h1>Lighthouse CI — 1IPIM</h1>
  <p>Execução mobile em ${generatedAt} (America/Sao_Paulo). Clique na URL para abrir o relatório completo.</p>
  <table>
    <thead>
      <tr><th>URL</th><th>Performance</th><th>Acessibilidade</th><th>Boas práticas</th><th>SEO</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="legend">Limiares: performance ≥ 75 (aviso), acessibilidade ≥ 90 (falha), boas práticas ≥ 90 (aviso), SEO ≥ 90 (falha).</p>
</body>
</html>`;

fs.writeFileSync(path.join(dir, "index.html"), html);
console.log(`Relatório Lighthouse gerado em ${dir}/index.html`);
