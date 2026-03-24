import { loadPayload, initShell, metricCard, renderStatus, documentActions, escapeHtml, formatTemplate, setElementText, setElementLink } from "./common.js";

function getCompletionPercent(program) {
  const totalCourses = Number(program.totalCourses) || 0;
  const completedCourses = Number(program.completedCourses) || 0;

  if (totalCourses <= 0) {
    return 0;
  }

  return Math.round((completedCourses / totalCourses) * 100);
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("percorsi", portfolio, linkedin);

  const page = portfolio.config.site.pathsPage || {};
  const stats = portfolio.stats;
  document.title = `${page.title || "Percorsi"} | Portfolio formativo`;
  setElementText("paths-eyebrow", page.eyebrow, "Mappa del portfolio");
  setElementText("paths-title", page.title, "Tutti i percorsi");
  setElementText("paths-metrics-label", page.metricsLabel, "Stato generale");
  setElementText("paths-section-title", page.sectionTitle, "Programmi e corsi");
  setElementLink("paths-section-link", {
    label: page.sectionLinkLabel,
    href: page.sectionLinkHref
  }, "Vai ai certificati", "./certificati.html");
  document.getElementById("paths-summary").textContent = formatTemplate(
    page.summaryTemplate || "{completed} corsi completati su {total}, con {workFiles} materiali pratici gia consultabili online.",
    {
      completed: stats.totalCompleted,
      total: stats.totalCourses,
      workFiles: stats.totalWorkFiles
    }
  );

  document.getElementById("paths-metrics").innerHTML = [
    metricCard(page.metrics?.completed || "Completati", stats.totalCompleted),
    metricCard(page.metrics?.ready || "Pronti", stats.totalReady),
    metricCard(page.metrics?.inProgress || "In corso", stats.totalInProgress),
    metricCard(page.metrics?.certificates || "Certificati", stats.totalCertificates)
  ].join("");

  document.getElementById("program-list").innerHTML = portfolio.programs.map((program) => `
    <section class="panel path-program-panel" id="${program.slug}">
      <div class="section-head">
        <div>
          <p class="panel-label">${escapeHtml(program.name)}</p>
          <h2>${escapeHtml(program.completedCourses)}/${escapeHtml(program.totalCourses)} ${escapeHtml(page.programCompletedSuffix || "completati")}</h2>
          ${program.summary ? `<p class="section-copy">${escapeHtml(program.summary)}</p>` : ""}
        </div>
        <div class="detail-list">
          ${(program.tags || []).map((tag) => `<span class="info-chip">${escapeHtml(tag)}</span>`).join("")}
          <span class="info-chip">${escapeHtml(formatTemplate(page.progressLabelTemplate || "{percent}%", { percent: getCompletionPercent(program) }))}</span>
          <span class="info-chip">${escapeHtml(formatTemplate(page.workFilesLabelTemplate || "{count} materiali", { count: program.workFiles }))}</span>
          <span class="info-chip">${escapeHtml(formatTemplate(page.certificateFilesLabelTemplate || "{count} certificati", { count: program.certificateFiles }))}</span>
        </div>
      </div>
      <div class="card-grid path-course-grid">
        ${program.courses.map((course) => `
          <article class="course-card path-course-card">
            <h3>${escapeHtml(course.name)}</h3>
            ${course.summary ? `<p class="card-summary">${escapeHtml(course.summary)}</p>` : ""}
            <div class="meta-line">
              ${course.category ? `<span class="info-chip">${escapeHtml(course.category)}</span>` : ""}
              ${renderStatus(course.status)}
              <span class="info-chip">${escapeHtml(course.evidence)}</span>
            </div>
            <p class="muted">${escapeHtml(course.materialPreview || page.noExtraMaterialsText || "Nessun materiale aggiuntivo rilevato.")}</p>
            ${course.files.length ? documentActions(course.files[0]) : `<div class="meta-row"><a class="text-link" href="./archivio.html">${escapeHtml(page.fallbackLinkLabel || "Certificati e progetti")}</a></div>`}
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
