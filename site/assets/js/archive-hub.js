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
  setElementText("archive-eyebrow", archivePage.eyebrow, "Hub legacy");
  setElementText("archive-title", archivePage.title, "Percorsi come hub unico");
  setElementLink("archive-primary-cta", archivePage.primaryCta, "Apri percorsi", "./percorsi.html");
  setElementLink("archive-secondary-cta", archivePage.secondaryCta, "Apri CV", "./cv.html");
  document.getElementById("archive-summary").textContent = `Certificati e materiali pratici sono ora centralizzati nei dettagli del corso dentro Percorsi: ${stats.totalCertificates} certificati completati e ${stats.totalWorkFiles} materiali gia consultabili.`;
  document.getElementById("archive-metrics").innerHTML = [
    metricCard("Certificati", stats.totalCertificates),
    metricCard("Corsi", stats.totalCourses),
    metricCard("Percorsi", stats.totalPrograms),
    metricCard("Materiali", stats.totalWorkFiles)
  ].join("");

  const portalCards = Array.isArray(archivePage.portalCards) && archivePage.portalCards.length
    ? archivePage.portalCards
    : [
      {
        eyebrow: "Percorsi",
        title: "Dettagli corso centralizzati",
        description: "Certificati, materiali e anteprime sono ora raccolti nei dettagli del corso dentro Percorsi.",
        buttonLabel: "Apri percorsi",
        buttonHref: "./percorsi.html",
        buttonVariant: "primary"
      },
      {
        eyebrow: "Curriculum",
        title: "Profilo professionale",
        description: "Il CV resta la vista sintetica del profilo, scaricabile in PDF e coerente con i dati del portfolio.",
        buttonLabel: "Apri CV",
        buttonHref: "./cv.html",
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
