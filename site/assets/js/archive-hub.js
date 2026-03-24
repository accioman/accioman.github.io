import { loadPayload, initShell, metricCard } from "./common.js";

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("", portfolio, linkedin);

  const stats = portfolio.stats;
  document.title = "Archivio | Portfolio formativo";
  document.getElementById("archive-summary").textContent = `L'archivio e stato separato in due percorsi distinti: ${stats.totalCertificates} certificati completati e ${portfolio.library.projects.length} aree progetto con materiali pratici esplorabili.`;
  document.getElementById("archive-metrics").innerHTML = [
    metricCard("Certificati", stats.totalCertificates),
    metricCard("Progetti", portfolio.library.projects.length),
    metricCard("PDF", portfolio.library.pdfs.length),
    metricCard("Elaborati", stats.totalWorkFiles)
  ].join("");
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
