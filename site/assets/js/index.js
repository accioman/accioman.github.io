import {
  loadPayload,
  initShell,
  escapeHtml,
  setElementText,
  setElementLink
} from "./common.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderHighlightList(items) {
  return asArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function buildKeySkills(config) {
  const collected = [];

  asArray(config.skillSections).forEach((section) => {
    asArray(section.items).forEach((item) => {
      if (!item || collected.includes(item) || collected.length >= 6) {
        return;
      }

      collected.push(item);
    });
  });

  return collected;
}

function buildCourseHref(programId, courseId, fallback = "./percorsi.html") {
  if (!programId || !courseId) {
    return fallback;
  }

  const params = new URLSearchParams();
  params.set("program", programId);
  params.set("course", courseId);
  return `./percorsi.html?${params.toString()}`;
}

function renderHeroFacts(stats, experience) {
  const facts = [
    {
      label: "Esperienza",
      value: experience?.period || experience?.duration || "In corso"
    },
    {
      label: "Certificati",
      value: String(stats.totalCertificates)
    },
    {
      label: "Materiali",
      value: String(stats.totalWorkFiles)
    }
  ];

  return facts.map((fact) => `
    <div class="home-fact">
      <span>${escapeHtml(fact.label)}</span>
      <strong>${escapeHtml(fact.value)}</strong>
    </div>
  `).join("");
}

function renderHomeProgramCard(program) {
  const compactMeta = [
    `${escapeHtml(program.certificateFiles)} certificati`,
    `${escapeHtml(program.workFiles)} materiali`
  ].join(" • ");
  const progress = Math.max(0, Math.min(100, Number(program.completionPercent) || 0));

  return `
    <article class="program-summary home-program-summary">
      <div class="home-program-copy">
        <p class="panel-label">Percorso</p>
        <h3>${escapeHtml(program.name)}</h3>
        ${program.summary ? `<p class="home-program-summary-text">${escapeHtml(program.summary)}</p>` : ""}
        <p class="home-program-meta">${compactMeta}</p>
      </div>
      <div class="home-program-side">
        <strong class="home-program-ratio">${escapeHtml(program.completedCourses)}/${escapeHtml(program.totalCourses)}</strong>
        <span class="home-program-side-note">${escapeHtml(program.completionPercent)}% completato</span>
        <div class="home-program-progress" aria-hidden="true">
          <span style="width: ${progress}%"></span>
        </div>
        <a class="text-link" href="./percorsi.html#${program.slug}">Apri programma</a>
      </div>
    </article>
  `;
}

function renderHomeCertificateCard(file) {
  const programNames = Array.isArray(file.programNames) && file.programNames.length
    ? file.programNames
    : [file.programName].filter(Boolean);
  const href = buildCourseHref(file.programId, file.courseId);

  return `
    <article class="home-evidence-item home-evidence-item-certificate">
      <div class="home-evidence-copy">
        <p class="panel-label">Certificato</p>
        <h3>${escapeHtml(file.displayName || file.courseName || file.name)}</h3>
        <p class="home-evidence-meta">${escapeHtml(programNames.join(" / "))}${file.updatedAtLocal ? ` • ${escapeHtml(file.updatedAtLocal)}` : ""}</p>
      </div>
      <div class="home-evidence-actions">
        <a class="text-link" href="${href}">Apri corso</a>
      </div>
    </article>
  `;
}

function renderHomeCaseStudyCard(project) {
  const caseStudy = project.caseStudy || {};
  const title = caseStudy.title || project.name;
  const lead = caseStudy.lead || project.summary || project.materialPreview || project.evidence || "";
  const primaryHref = buildCourseHref(project.programId, project.id);
  const metaParts = [
    project.programName,
    caseStudy.role || project.category,
    project.status
  ].filter(Boolean);

  return `
    <article class="home-evidence-item home-evidence-item-project">
      <div class="home-evidence-copy">
        <p class="panel-label">Materiali pratici</p>
        <h3>${escapeHtml(title)}</h3>
        ${metaParts.length ? `<p class="home-evidence-meta">${escapeHtml(metaParts.join(" • "))}</p>` : ""}
        ${lead ? `<p class="home-evidence-lead">${escapeHtml(lead)}</p>` : ""}
      </div>
      <div class="home-evidence-actions">
        <a class="text-link" href="${primaryHref}">Apri corso</a>
      </div>
    </article>
  `;
}

function setExperiencePanel(site, home, linkedin) {
  const experience = asArray(linkedin?.experience)[0];
  const linkedinUrl = linkedin?.profileUrl || site.linkedin?.profileUrl || "https://www.linkedin.com/";
  const company = experience?.company || linkedin?.location || "";
  const meta = [experience?.employmentType, experience?.period, experience?.duration].filter(Boolean).join(" • ");

  setElementText("home-experience-kicker", home.experienceKicker, "Esperienza attuale");
  setElementText("home-experience-title", experience?.title || site.role, site.role);
  setElementText("home-experience-company", company, "");
  setElementText("home-experience-meta", meta, "");
  setElementText(
    "home-experience-summary",
    home.experienceSummary,
    linkedin?.summary || site.heroSummary || ""
  );
  setElementLink("home-linkedin-cta", { label: home.experienceLinkLabel, href: linkedinUrl }, "Profilo LinkedIn", linkedinUrl);
  setElementLink("home-cv-cta", { label: "Apri CV", href: "./cv.html" }, "Apri CV", "./cv.html");
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("home", portfolio, linkedin);

  const site = portfolio.config.site;
  const home = site.homePage || {};
  const stats = portfolio.stats;

  document.title = `${site.ownerName} | Portfolio professionale`;
  setElementText("home-eyebrow", home.eyebrow, "Portfolio professionale");
  setElementText("hero-role", site.role, "");
  setElementText("hero-title", home.heroTitle, site.ownerName);
  setElementText("hero-tagline", site.tagline, "");
  setElementText("hero-summary", home.heroSummary, site.heroSummary || "");
  document.getElementById("home-highlights").innerHTML = renderHighlightList(asArray(portfolio.config.profileHighlights).slice(0, 2));

  setElementLink("home-primary-cta", home.primaryCta, "Apri percorsi", "./percorsi.html");
  setElementLink("home-secondary-cta", home.secondaryCta, "Apri CV", "./cv.html");
  setElementText("home-program-title", home.programSection?.title, "Percorsi principali");
  setElementLink("home-program-link", {
    label: home.programSection?.linkLabel,
    href: home.programSection?.href
  }, "Apri percorsi", "./percorsi.html");
  setElementText("home-portfolio-title", "Evidenze dal portfolio");
  setElementLink("home-portfolio-link", { label: "Apri percorsi", href: "./percorsi.html" }, "Apri percorsi", "./percorsi.html");
  setElementText("home-certificates-title", "Certificati recenti");
  setElementLink("home-certificates-link", {
    label: home.certificatesSection?.linkLabel,
    href: home.certificatesSection?.href
  }, "Apri percorsi", "./percorsi.html");
  setElementText("home-projects-title", home.projectsSection?.title, "Corsi con materiali pratici");
  setElementLink("home-projects-link", {
    label: home.projectsSection?.linkLabel,
    href: home.projectsSection?.href
  }, "Apri percorsi", "./percorsi.html");

  setExperiencePanel(site, home, linkedin);

  const experience = asArray(linkedin?.experience)[0];
  document.getElementById("hero-metrics").innerHTML = renderHeroFacts(stats, experience);

  document.getElementById("program-overview").innerHTML = portfolio.programs
    .map((program) => renderHomeProgramCard(program))
    .join("");

  const featuredCertificates = (portfolio.library.featuredCertificates?.length
    ? portfolio.library.featuredCertificates
    : portfolio.library.certificates).slice(0, 3);
  const featuredProjects = (portfolio.library.featuredProjects?.length
    ? portfolio.library.featuredProjects
    : portfolio.library.projects).slice(0, 3);

  document.getElementById("featured-certificates").innerHTML = featuredCertificates
    .map((file) => renderHomeCertificateCard(file))
    .join("");

  document.getElementById("featured-projects").innerHTML = featuredProjects
    .map((project) => renderHomeCaseStudyCard(project))
    .join("");

  document.getElementById("home-key-skills").innerHTML = buildKeySkills(portfolio.config)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
