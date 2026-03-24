import { loadPayload, initShell, metricCard, escapeHtml, setElementText, setElementLink } from "./common.js";

function renderPortalCard(card, index) {
  const variant = card.buttonVariant === "primary" ? "button-primary" : "button-secondary";
  return `
    <article class="portal-card">
      <p class="panel-label">${escapeHtml(card.eyebrow || `Sezione ${index + 1}`)}</p>
      <h2>${escapeHtml(card.title || "Contenuto")}</h2>
      <p>${escapeHtml(card.description || "")}</p>
      <a class="button ${variant}" href="${escapeHtml(card.buttonHref || "./index.html")}">${escapeHtml(card.buttonLabel || "Apri")}</a>
    </article>
  `;
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("archivio", portfolio, linkedin);

  const archivePage = portfolio.config.site.archivePage || {};
  const stats = portfolio.stats;
  document.title = "Archivio | Portfolio formativo";
  setElementText("archive-eyebrow", archivePage.eyebrow, "Archivio separato");
  setElementText("archive-title", archivePage.title, "Certificati e progetti");
  setElementLink("archive-primary-cta", archivePage.primaryCta, "Apri certificati", "./certificati.html");
  setElementLink("archive-secondary-cta", archivePage.secondaryCta, "Apri progetti", "./progetti.html");
  document.getElementById("archive-summary").textContent = `L'archivio e stato separato in due percorsi distinti: ${stats.totalCertificates} certificati completati e ${portfolio.library.projects.length} aree progetto con materiali pratici esplorabili.`;
  document.getElementById("archive-metrics").innerHTML = [
    metricCard("Certificati", stats.totalCertificates),
    metricCard("Progetti", portfolio.library.projects.length),
    metricCard("PDF", portfolio.library.pdfs.length),
    metricCard("Elaborati", stats.totalWorkFiles)
  ].join("");

  const portalCards = Array.isArray(archivePage.portalCards) && archivePage.portalCards.length
    ? archivePage.portalCards
    : [
      {
        eyebrow: "Certificati",
        title: "Miniature PDF e preview",
        description: "Raccoglie tutti i certificati Coursera completati, con anteprima inline e accesso diretto al viewer dedicato.",
        buttonLabel: "Vai ai certificati",
        buttonHref: "./certificati.html",
        buttonVariant: "primary"
      },
      {
        eyebrow: "Progetti",
        title: "Materiali di lavoro e deliverable",
        description: "Mostra PDF, fogli Excel e documenti di progetto esplorabili senza dover partire dal download manuale.",
        buttonLabel: "Vai ai progetti",
        buttonHref: "./progetti.html",
        buttonVariant: "secondary"
      }
    ];

  document.getElementById("archive-portal-grid").innerHTML = portalCards
    .map((card, index) => renderPortalCard(card, index))
    .join("");
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
