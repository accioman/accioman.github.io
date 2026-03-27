import {
  loadPayload,
  initShell,
  escapeHtml,
  renderStatus,
  setElementText,
  setElementLink
} from "./common.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function buildProjectHref(projectId, fallback = "./progetti.html") {
  if (!projectId) {
    return fallback;
  }

  const params = new URLSearchParams();
  params.set("project", projectId);
  return `./progetti.html?${params.toString()}`;
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

function renderHeroFacts(stats, experience) {
  const facts = [
    {
      label: "Ruolo attuale",
      value: experience?.duration || experience?.period || "In corso"
    },
    {
      label: "Certificati",
      value: String(stats.totalCertificates)
    },
    {
      label: "Deliverable",
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

function renderProofCards(portfolio, linkedin) {
  const stats = portfolio.stats;
  const previewableDocuments = asArray(portfolio.library?.documents).filter((entry) => entry.previewable).length;
  const experience = asArray(linkedin?.experience)[0];
  const cards = [
    {
      kicker: "Esperienza",
      title: experience?.title || portfolio.config.site.role,
      body: experience?.company
        ? `${experience.company}${experience.duration ? ` • ${experience.duration}` : ""}`
        : (experience?.duration || "Esperienza attuale in contesto aziendale.")
    },
    {
      kicker: "Proof of work",
      title: `${stats.totalCertificates} certificati e ${stats.totalWorkFiles} deliverable`,
      body: `${previewableDocuments} documenti consultabili online tra PDF, documenti, fogli e immagini.`
    },
    {
      kicker: "Posizionamento",
      title: "Profilo ponte tra engineering e delivery",
      body: "Traiettoria che unisce sviluppo software, basi DevOps e project delivery con evidenze verificabili."
    }
  ];

  return cards.map((card) => `
    <article class="home-spotlight-card home-proof-card">
      <p class="panel-label">${escapeHtml(card.kicker)}</p>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="home-spotlight-copy">${escapeHtml(card.body)}</p>
    </article>
  `).join("");
}

function getProgramStatusLabel(program) {
  if (program.completedCourses >= program.totalCourses) {
    return "Percorso completato";
  }

  if (program.certificateFiles > 0) {
    return `${program.certificateFiles} certificati gia ottenuti`;
  }

  return "Percorso in espansione";
}

function renderHomeProgramCard(program) {
  const compactMeta = [
    `${escapeHtml(program.workFiles)} materiali verificabili`,
    `${escapeHtml(program.certificateFiles)} certificati`
  ].join(" • ");

  return `
    <article class="program-summary home-program-summary">
      <div class="home-program-copy">
        <p class="panel-label">Percorso</p>
        <h3>${escapeHtml(program.name)}</h3>
        ${program.summary ? `<p class="home-program-summary-text">${escapeHtml(program.summary)}</p>` : ""}
        <div class="detail-list">${asArray(program.tags).map((tag) => `<span class="info-chip">${escapeHtml(tag)}</span>`).join("")}</div>
        <p class="home-program-meta">${compactMeta}</p>
      </div>
      <div class="home-program-side">
        <strong class="home-program-ratio">${escapeHtml(getProgramStatusLabel(program))}</strong>
        <span class="home-program-side-note">${escapeHtml(program.completedCourses)} corsi completati${program.totalCourses ? ` • ${escapeHtml(program.totalCourses)} totali` : ""}</span>
        <a class="text-link" href="./percorsi.html#${program.slug}">Apri percorso</a>
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
        <p class="panel-label">Certificazione</p>
        <h3>${escapeHtml(file.displayName || file.courseName || file.name)}</h3>
        <p class="home-evidence-meta">${escapeHtml(programNames.join(" / "))}</p>
        <p class="home-evidence-lead">${escapeHtml(file.updatedAtLocal ? `Aggiornato ${file.updatedAtLocal}` : "Certificato consultabile online.")}</p>
      </div>
      <div class="home-evidence-actions">
        <a class="text-link" href="${href}">Apri corso</a>
      </div>
    </article>
  `;
}

function renderHomeEvidenceProjectCard(project) {
  const href = buildProjectHref(project.id);
  const meta = [
    project.programName,
    project.category,
    project.evidence
  ].filter(Boolean).join(" • ");

  return `
    <article class="home-evidence-item home-evidence-item-project">
      <div class="home-evidence-copy">
        <p class="panel-label">Deliverable</p>
        <h3>${escapeHtml(project.caseStudy?.title || project.name)}</h3>
        ${meta ? `<p class="home-evidence-meta">${escapeHtml(meta)}</p>` : ""}
        <p class="home-evidence-lead">${escapeHtml(project.materialPreview || project.caseStudy?.lead || project.summary || "")}</p>
      </div>
      <div class="home-evidence-actions">
        <a class="text-link" href="${href}">Apri case study</a>
      </div>
    </article>
  `;
}

function renderCaseStudyFacts(caseStudy = {}) {
  const facts = [
    { label: "Contesto", value: caseStudy.context },
    { label: "Ruolo", value: caseStudy.role },
    { label: "Risultato", value: caseStudy.outcome }
  ].filter((entry) => entry.value);

  return facts.map((fact) => `
    <article class="project-case-study-fact">
      <strong>${escapeHtml(fact.label)}</strong>
      <p>${escapeHtml(fact.value)}</p>
    </article>
  `).join("");
}

function renderHomeCaseStudyCard(project) {
  const caseStudy = project.caseStudy || {};
  const href = buildProjectHref(project.id);
  const primaryFile = asArray(project.files)[0];

  return `
    <article class="project-card project-case-study-card home-case-study-card">
      <div class="project-case-study-head">
        <div class="project-case-study-copy">
          <div class="home-spotlight-meta">
            <span class="home-spotlight-kicker">${escapeHtml(project.programName)}</span>
            ${project.category ? `<span class="info-chip">${escapeHtml(project.category)}</span>` : ""}
          </div>
          <h3>${escapeHtml(caseStudy.title || project.name)}</h3>
          <p class="project-case-study-lead">${escapeHtml(caseStudy.lead || project.summary || project.materialPreview || "")}</p>
        </div>
        <div class="project-case-study-meta">
          ${renderStatus(project.status)}
          <span class="info-chip">${escapeHtml(`${project.workFileCount} deliverable`)}</span>
        </div>
      </div>
      <div class="project-case-study-grid">
        ${renderCaseStudyFacts(caseStudy)}
      </div>
      <div class="project-case-study-aside">
        ${asArray(caseStudy.skills).length ? `
          <section class="project-case-study-supplement">
            <p class="panel-label">Competenze</p>
            <div class="detail-list">${asArray(caseStudy.skills).map((skill) => `<span class="info-chip">${escapeHtml(skill)}</span>`).join("")}</div>
          </section>
        ` : ""}
        ${asArray(caseStudy.deliverables).length ? `
          <section class="project-case-study-supplement">
            <p class="panel-label">Deliverable</p>
            <ul class="project-case-study-deliverables">
              ${asArray(caseStudy.deliverables).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>
        ` : ""}
      </div>
      <div class="home-proof-footer">
        <a class="button button-primary button-compact" href="${href}">Apri case study</a>
        ${primaryFile ? `<a class="text-link" href="${escapeHtml(primaryFile.webPath)}" target="_blank" rel="noreferrer">Apri file guida</a>` : ""}
      </div>
    </article>
  `;
}

function renderFocusAreaCard(section) {
  return `
    <article class="home-skill-card">
      <h3>${escapeHtml(section.title)}</h3>
      <ul>
        ${asArray(section.items).slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function renderTargetRoles(roles) {
  return asArray(roles).slice(0, 4).map((role) => `
    <article class="target-box home-target-role-card">
      <p class="panel-label">Ruolo target</p>
      <strong>${escapeHtml(role)}</strong>
    </article>
  `).join("");
}

function setExperiencePanel(site, home, linkedin) {
  const experience = asArray(linkedin?.experience)[0];
  const linkedinUrl = linkedin?.profileUrl || site.linkedin?.profileUrl || "https://www.linkedin.com/";
  const company = experience?.company || linkedin?.location || "";
  const meta = [experience?.employmentType, experience?.period, experience?.duration].filter(Boolean).join(" • ");

  setElementText("home-experience-kicker", home.experienceKicker, "Snapshot recruiter");
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
  const experience = asArray(linkedin?.experience)[0];
  const featuredCertificates = (portfolio.library.featuredCertificates?.length
    ? portfolio.library.featuredCertificates
    : portfolio.library.certificates).slice(0, 3);
  const featuredProjects = (portfolio.library.featuredProjects?.length
    ? portfolio.library.featuredProjects
    : portfolio.library.projects).slice(0, 3);

  document.title = `${site.ownerName} | Portfolio professionale`;
  setElementText("home-eyebrow", home.eyebrow, "Portfolio professionale");
  setElementText("hero-role", site.role, "");
  setElementText("hero-title", home.heroTitle, site.ownerName);
  setElementText("hero-tagline", site.tagline, "");
  setElementText("hero-summary", home.heroSummary, site.heroSummary || "");
  document.getElementById("home-highlights").innerHTML = renderHighlightList(asArray(portfolio.config.profileHighlights));

  setElementLink("home-primary-cta", home.primaryCta, "Apri case study", "./progetti.html");
  setElementLink("home-secondary-cta", home.secondaryCta, "Apri CV", "./cv.html");

  setElementText("home-proof-title", "Perche questo portfolio e utile in pochi minuti");
  setElementLink("home-proof-link", { label: "Apri CV", href: "./cv.html" }, "Apri CV", "./cv.html");
  document.getElementById("home-proof-grid").innerHTML = renderProofCards(portfolio, linkedin);

  setElementText("home-case-studies-title", home.caseStudiesSection?.title, "Case study in evidenza");
  setElementLink("home-case-studies-link", home.caseStudiesSection, "Apri case study", "./progetti.html");
  document.getElementById("featured-case-studies").innerHTML = featuredProjects
    .map((project) => renderHomeCaseStudyCard(project))
    .join("");

  setElementText("home-program-title", home.programSection?.title, "Percorsi di crescita");
  setElementLink("home-program-link", home.programSection, "Apri percorsi", "./percorsi.html");
  document.getElementById("program-overview").innerHTML = portfolio.programs
    .map((program) => renderHomeProgramCard(program))
    .join("");

  setElementText("home-focus-title", home.skillsSection?.title, "Competenze e direzione");
  setElementText(
    "home-focus-summary",
    "Ruoli target e aree di crescita emerse da esperienza attuale, formazione IBM e materiali verificabili."
  );
  setElementLink("home-focus-link", { label: "Apri CV", href: "./cv.html" }, "Apri CV", "./cv.html");
  document.getElementById("home-target-roles").innerHTML = renderTargetRoles(portfolio.config.targetRoles);
  document.getElementById("home-focus-areas").innerHTML = asArray(portfolio.config.skillSections)
    .slice(0, 3)
    .map((section) => renderFocusAreaCard(section))
    .join("");

  setElementText("home-portfolio-title", "Certificazioni selezionate e deliverable");
  setElementLink("home-portfolio-link", { label: "Apri percorsi", href: "./percorsi.html" }, "Apri percorsi", "./percorsi.html");
  setElementText("home-certificates-title", home.certificatesSection?.title, "Certificazioni selezionate");
  setElementLink("home-certificates-link", home.certificatesSection, "Apri percorsi", "./percorsi.html");
  setElementText("home-projects-title", home.projectsSection?.title, "Deliverable verificabili");
  setElementLink("home-projects-link", home.projectsSection, "Apri case study", "./progetti.html");

  setExperiencePanel(site, home, linkedin);
  document.getElementById("hero-metrics").innerHTML = renderHeroFacts(stats, experience);
  document.getElementById("featured-certificates").innerHTML = featuredCertificates
    .map((file) => renderHomeCertificateCard(file))
    .join("");
  document.getElementById("featured-projects").innerHTML = featuredProjects
    .map((project) => renderHomeEvidenceProjectCard(project))
    .join("");
  document.getElementById("home-key-skills").innerHTML = buildKeySkills(portfolio.config)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
