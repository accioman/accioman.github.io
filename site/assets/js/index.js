import { loadPayload, initShell, metricCard, renderLinkedInCard, renderStatus, escapeHtml, setElementText, setElementLink } from "./common.js";

function renderHighlightList(items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderHomeProgramCard(program) {
  return `
    <article class="program-summary home-program-summary">
      <div class="home-program-metric">
        <strong>${escapeHtml(program.completedCourses)}/${escapeHtml(program.totalCourses)}</strong>
        <span>${escapeHtml(program.completionPercent)}% completato</span>
      </div>
      <div class="home-program-copy">
        <p class="panel-label">${escapeHtml(program.name)}</p>
        ${program.summary ? `<p class="card-summary">${escapeHtml(program.summary)}</p>` : ""}
        <div class="meta-line">
          <span class="info-chip">${escapeHtml(program.certificateFiles)} certificati</span>
          <span class="info-chip">${escapeHtml(program.workFiles)} materiali</span>
        </div>
        <div class="meta-row">
          <a class="text-link" href="./percorsi.html#${program.slug}">Apri programma</a>
        </div>
      </div>
    </article>
  `;
}

function renderHomeCertificateCard(file) {
  const programNames = Array.isArray(file.programNames) && file.programNames.length
    ? file.programNames
    : [file.programName].filter(Boolean);

  return `
    <article class="home-spotlight-card">
      <p class="panel-label">Certificato</p>
      <h3>${escapeHtml(file.displayName || file.courseName || file.name)}</h3>
      <p class="home-spotlight-copy">${escapeHtml(programNames.join(" / "))}</p>
      <div class="meta-row">
        <a class="text-link" href="./viewer.html?file=${encodeURIComponent(file.relativePath)}">Apri nel viewer</a>
      </div>
    </article>
  `;
}

function renderHomeProjectCard(project) {
  const primaryFile = Array.isArray(project.files) && project.files.length ? project.files[0] : null;
  const href = primaryFile
    ? `./viewer.html?file=${encodeURIComponent(primaryFile.relativePath)}`
    : "./progetti.html";
  const categoryLabel = project.category ? `<span class="home-spotlight-kicker">${escapeHtml(project.category)}</span>` : "";

  return `
    <article class="home-spotlight-card home-spotlight-card-project">
      <div class="home-spotlight-meta">
        <p class="panel-label">${escapeHtml(project.programName)}</p>
        ${categoryLabel}
      </div>
      <h3>${escapeHtml(project.name)}</h3>
      ${project.summary ? `<p class="home-spotlight-copy">${escapeHtml(project.summary)}</p>` : `<p class="home-spotlight-copy">${escapeHtml(project.materialPreview || project.evidence)}</p>`}
      <div class="home-spotlight-footer">
        ${renderStatus(project.status)}
        <a class="text-link" href="${href}">Apri materiale</a>
      </div>
    </article>
  `;
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("home", portfolio, linkedin);

  const site = portfolio.config.site;
  const home = site.homePage || {};
  const stats = portfolio.stats;

  document.title = `${site.ownerName} | Portfolio formativo`;
  setElementText("home-eyebrow", home.eyebrow, "GitHub Pages portfolio");
  setElementText("hero-role", site.role, "");
  document.getElementById("hero-title").textContent = site.ownerName;
  document.getElementById("hero-tagline").textContent = site.tagline || "";
  document.getElementById("hero-summary").textContent = site.heroSummary;
  document.getElementById("home-profile-title").textContent = site.ownerName;
  document.getElementById("home-profile-summary").textContent = portfolio.config.profileHighlights?.[1] || site.heroSummary;
  document.getElementById("home-highlights").innerHTML = renderHighlightList(portfolio.config.profileHighlights);
  setElementLink("home-primary-cta", home.primaryCta, "Apri i certificati", "./certificati.html");
  setElementLink("home-secondary-cta", home.secondaryCta, "Esplora i progetti", "./progetti.html");
  setElementText("home-program-title", home.programSection?.title, "Percorso");
  setElementLink("home-program-link", {
    label: home.programSection?.linkLabel,
    href: home.programSection?.href
  }, "Dettaglio completo", "./percorsi.html");
  setElementText("home-certificates-title", home.certificatesSection?.title, "Certificati in evidenza");
  setElementLink("home-certificates-link", {
    label: home.certificatesSection?.linkLabel,
    href: home.certificatesSection?.href
  }, "Apri certificati", "./certificati.html");
  setElementText("home-projects-title", home.projectsSection?.title, "Progetti esplorabili");
  setElementLink("home-projects-link", {
    label: home.projectsSection?.linkLabel,
    href: home.projectsSection?.href
  }, "Vai ai progetti", "./progetti.html");
  setElementText("home-skills-title", home.skillsSection?.title, "Competenze e obiettivi");
  setElementText("home-focus-label", home.skillsSection?.focusLabel, "Focus");

  document.getElementById("hero-metrics").innerHTML = [
    metricCard("Percorsi", stats.totalPrograms),
    metricCard("Corsi", stats.totalCourses),
    metricCard("Completati", stats.totalCompleted, `${stats.completionPercent}%`),
    metricCard("Elaborati", stats.totalWorkFiles)
  ].join("");

  document.getElementById("linkedin-panel").innerHTML = renderLinkedInCard(portfolio, linkedin);

  document.getElementById("program-overview").innerHTML = portfolio.programs.map((program) => renderHomeProgramCard(program)).join("");

  const featuredCertificates = (portfolio.library.featuredCertificates?.length
    ? portfolio.library.featuredCertificates
    : portfolio.library.certificates).slice(0, 4);
  const featuredProjects = (portfolio.library.featuredProjects?.length
    ? portfolio.library.featuredProjects
    : portfolio.library.projects).slice(0, 4);

  document.getElementById("featured-certificates").innerHTML = featuredCertificates.map((file) =>
    renderHomeCertificateCard(file)
  ).join("");

  document.getElementById("featured-projects").innerHTML = featuredProjects.map((project) => `
    ${renderHomeProjectCard(project)}
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
