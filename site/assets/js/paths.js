import { loadPayload, initShell, metricCard, renderStatus, documentActions, escapeHtml } from "./common.js";

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("percorsi", portfolio, linkedin);

  const stats = portfolio.stats;
  document.title = "Percorsi | Portfolio formativo";
  document.getElementById("paths-summary").textContent = `${stats.totalCompleted} corsi completati su ${stats.totalCourses}, con ${stats.totalWorkFiles} materiali pratici gia consultabili online.`;

  document.getElementById("paths-metrics").innerHTML = [
    metricCard("Completati", stats.totalCompleted),
    metricCard("Pronti", stats.totalReady),
    metricCard("In corso", stats.totalInProgress),
    metricCard("Certificati", stats.totalCertificates)
  ].join("");

  document.getElementById("program-list").innerHTML = portfolio.programs.map((program) => `
    <section class="panel" id="${program.slug}">
      <div class="section-head">
        <div>
          <p class="panel-label">${escapeHtml(program.name)}</p>
          <h2>${escapeHtml(program.completedCourses)}/${escapeHtml(program.totalCourses)} completati</h2>
        </div>
        <div class="detail-list">
          <span class="info-chip">${escapeHtml(program.completionPercent)}%</span>
          <span class="info-chip">${escapeHtml(program.workFiles)} materiali</span>
          <span class="info-chip">${escapeHtml(program.certificateFiles)} certificati</span>
        </div>
      </div>
      <div class="card-grid">
        ${program.courses.map((course) => `
          <article class="course-card">
            <h3>${escapeHtml(course.name)}</h3>
            <div class="meta-line">
              ${renderStatus(course.status)}
              <span class="info-chip">${escapeHtml(course.evidence)}</span>
            </div>
            <p class="muted">${escapeHtml(course.materialPreview || "Nessun materiale aggiuntivo rilevato.")}</p>
            ${course.files.length ? documentActions(course.files[0]) : `<div class="meta-row"><a class="text-link" href="./archivio.html">Certificati e progetti</a></div>`}
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
