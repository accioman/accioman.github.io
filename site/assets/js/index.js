import { loadPayload, initShell, metricCard, renderDocumentCard, renderLinkedInCard, renderStatus, escapeHtml } from "./common.js";

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("home", portfolio, linkedin);

  const site = portfolio.config.site;
  const stats = portfolio.stats;

  document.title = `${site.ownerName} | Portfolio formativo`;
  document.getElementById("hero-title").textContent = site.ownerName;
  document.getElementById("hero-summary").textContent = site.heroSummary;

  document.getElementById("hero-metrics").innerHTML = [
    metricCard("Percorsi", stats.totalPrograms),
    metricCard("Corsi", stats.totalCourses),
    metricCard("Completati", stats.totalCompleted, `${stats.completionPercent}%`),
    metricCard("Elaborati", stats.totalWorkFiles)
  ].join("");

  document.getElementById("linkedin-panel").innerHTML = renderLinkedInCard(portfolio, linkedin);

  document.getElementById("program-overview").innerHTML = portfolio.programs.map((program) => `
    <article class="program-summary">
      <p class="panel-label">${escapeHtml(program.name)}</p>
      <h2>${escapeHtml(program.completedCourses)}/${escapeHtml(program.totalCourses)}</h2>
      <p>${escapeHtml(program.completionPercent)}% completato</p>
      <div class="meta-line">
        <span class="info-chip">${escapeHtml(program.certificateFiles)} certificati</span>
        <span class="info-chip">${escapeHtml(program.workFiles)} materiali</span>
      </div>
      <div class="meta-row">
        <a class="text-link" href="./percorsi.html#${program.slug}">Apri programma</a>
      </div>
    </article>
  `).join("");

  document.getElementById("featured-certificates").innerHTML = portfolio.library.certificates.slice(0, 4).map((file) =>
    renderDocumentCard(file, `${file.programName} / ${file.courseName}`)
  ).join("");

  document.getElementById("featured-projects").innerHTML = portfolio.library.projects.slice(0, 4).map((project) => `
    <article class="project-card">
      <h3>${escapeHtml(project.name)}</h3>
      <p class="muted">${escapeHtml(project.programName)}</p>
      <div class="meta-line">
        ${renderStatus(project.status)}
        <span class="info-chip">${escapeHtml(project.workFileCount)} file</span>
      </div>
      <p class="muted">${escapeHtml(project.materialPreview || project.evidence)}</p>
      <div class="meta-row">
        <a class="text-link" href="./progetti.html">Apri progetto</a>
      </div>
    </article>
  `).join("");

  document.getElementById("skills-sections").innerHTML = portfolio.config.skillSections.map((section) => `
    <section class="skill-block">
      <h3>${escapeHtml(section.title)}</h3>
      <ul>
        ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `).join("");

  document.getElementById("target-roles").innerHTML = portfolio.config.targetRoles
    .map((role) => `<li>${escapeHtml(role)}</li>`)
    .join("");
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
