import {
  loadPayload,
  initShell,
  escapeHtml,
  formatTemplate,
  setElementText,
  setElementLink,
  getDocumentDisplayTitle,
  getDocumentProgramNames
} from "./common.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniquePreserveOrder(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item || seen.has(item)) {
      continue;
    }

    seen.add(item);
    result.push(item);
  }

  return result;
}

function setTextForSelector(selector, value, fallback = "") {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value || fallback || "";
  });
}

function renderLinkList(items) {
  return `
    <ul class="cv-sidebar-list">
      ${items.map((item) => `
        <li>
          ${item.href
            ? `<a href="${item.href}"${item.external ? ` target="_blank" rel="noreferrer"` : ""}>${escapeHtml(item.label ? `${item.label}: ${item.value}` : item.value)}</a>`
            : `<span>${escapeHtml(item.label ? `${item.label}: ${item.value}` : item.value)}</span>`}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderDetailList(items) {
  return `
    <ul class="cv-sidebar-list">
      ${items.map((item) => `
        <li>${escapeHtml(item.label ? `${item.label}: ${item.value}` : item.value)}</li>
      `).join("")}
    </ul>
  `;
}

function renderLanguageList(items) {
  return `
    <ul class="cv-language-list">
      ${items.map((item) => {
        const dots = Math.max(0, Math.min(5, Number(item.dots) || 0));

        return `
          <li class="cv-language-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              ${item.label ? `<span>${escapeHtml(item.label)}</span>` : ""}
            </div>
            <div class="cv-language-dots" aria-label="${escapeHtml(item.name)}">
              ${Array.from({ length: 5 }, (_, index) => `<span class="cv-language-dot${index < dots ? " is-filled" : ""}"></span>`).join("")}
            </div>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderTimeline(items, type) {
  const emptyText = type === "experience"
    ? "Nessuna esperienza disponibile."
    : "Nessuna formazione disponibile.";

  if (!items.length) {
    return `<p class="muted">${emptyText}</p>`;
  }

  return `
    <div class="cv-timeline">
      ${items.map((entry) => `
        <article class="cv-timeline-item">
          <div class="cv-timeline-head">
            <div>
              <h4>${escapeHtml(type === "experience" ? (entry.title || "") : (entry.institution || ""))}</h4>
              <p>${escapeHtml(type === "experience" ? (entry.company || "") : (entry.degree || ""))}</p>
            </div>
          </div>
          ${[entry.employmentType, entry.period, entry.duration].filter(Boolean).length
            ? `<p class="cv-inline-meta">${escapeHtml([entry.employmentType, entry.period, entry.duration].filter(Boolean).join(" • "))}</p>`
            : ""}
          ${asArray(entry.skills).length ? `<p class="cv-inline-note">${escapeHtml(asArray(entry.skills).join(", "))}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderProgramCards(programs, page) {
  return programs.map((program) => `
    <article class="cv-program-card">
      <h4>${escapeHtml(program.name)}</h4>
      ${program.summary ? `<p>${escapeHtml(program.summary)}</p>` : ""}
      <p class="cv-inline-meta">${escapeHtml([
        formatTemplate(page.certificateSummaryTemplate || "{count} certificati completati", {
          count: program.certificateFiles
        }),
        formatTemplate(page.workSummaryTemplate || "{count} materiali pratici", {
          count: program.workFiles
        })
      ].join(" • "))}</p>
    </article>
  `).join("");
}

function renderCertificateList(certificates) {
  if (!certificates.length) {
    return `<p class="muted">Nessun certificato disponibile.</p>`;
  }

  return `
    <ul class="cv-compact-list">
      ${certificates.map((file) => `
        <li>
          <div class="cv-compact-copy">
            <strong>${escapeHtml(getDocumentDisplayTitle(file))}</strong>
            <span>${escapeHtml(getDocumentProgramNames(file).join(" / "))}</span>
          </div>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderProjectList(projects, emptyText) {
  if (!projects.length) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <div class="cv-project-list">
      ${projects.map((project) => {
        return `
          <article class="cv-project-card">
            <div class="cv-project-head">
              <div>
                <h4>${escapeHtml(project.name)}</h4>
                <p>${escapeHtml([project.programName, project.category, project.status].filter(Boolean).join(" • "))}</p>
              </div>
            </div>
            <p>${escapeHtml(project.summary || project.materialPreview || project.evidence || "")}</p>
            <div class="cv-project-footer">
              <span class="cv-inline-note">${escapeHtml(project.evidence || "")}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTechnicalSections(sections) {
  return sections.map((section) => `
    <section class="cv-tech-block">
      <h4>${escapeHtml(section.title)}</h4>
      <ul>
        ${asArray(section.items).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `).join("");
}

function renderUniversityCourses(courses) {
  if (!courses.length) {
    return `<p class="muted">Nessun corso universitario disponibile.</p>`;
  }

  return `
    <div class="cv-university-course-list">
      ${courses.map((course) => `
        <article class="cv-course-item">
          <h4>${escapeHtml(course.title || "")}</h4>
          ${course.description ? `<p>${escapeHtml(course.description)}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  document.body.classList.add("page-cv");
  initShell("cv", portfolio, linkedin);

  const site = portfolio.config.site || {};
  const page = site.cvPage || {};
  const resume = portfolio.config.resume || {};
  const contactConfig = resume.contact || linkedin?.contact || {};
  const personalDetails = asArray(resume.personalDetails || linkedin?.personalDetails);
  const languages = asArray(resume.languages || linkedin?.languages);
  const universityCourses = asArray(resume.universityCourses || linkedin?.universityCourses);
  const photoUrl = linkedin?.photoUrl || portfolio.config.linkedin?.photoPath || "";
  const summary = resume.summary || linkedin?.resumeSummary || linkedin?.summary || portfolio.config.intro || "";
  const portfolioUrl = "./index.html";
  const linkedinUrl = linkedin?.profileUrl || portfolio.config.linkedin?.profileUrl || "https://www.linkedin.com/";
  const primarySkills = uniquePreserveOrder([
    ...asArray(linkedin?.featuredSkills),
    ...asArray(portfolio.config.skillSections).flatMap((section) => asArray(section.items))
  ]).slice(0, 8);
  const featuredProjects = (asArray(portfolio.library?.featuredProjects).length
    ? asArray(portfolio.library.featuredProjects)
    : asArray(portfolio.library?.projects)).slice(0, 4);
  const certificates = asArray(portfolio.library?.certificates);

  document.title = `${site.ownerName} | Curriculum vitae`;
  setElementText("cv-eyebrow", page.eyebrow, "Curriculum vitae");
  setElementText("cv-page-title", page.title, "Curriculum Vitae");
  setElementText("cv-page-summary", page.summary, "Versione documento del profilo professionale, pronta per stampa e salvataggio in PDF.");
  setElementText("cv-print-hint", page.printHint, "Il pulsante apre la stampa del browser, pronta per Salva come PDF.");
  setElementText("cv-header-kicker", page.headerKicker, "Curriculum vitae");
  setElementText("cv-name", linkedin?.fullName || site.ownerName, site.ownerName);
  setElementText("cv-headline", linkedin?.headline || site.role, site.role);
  setTextForSelector(".cv-continued-kicker", page.headerKicker, "Curriculum vitae");
  setTextForSelector(".cv-continued-name", linkedin?.fullName || site.ownerName, site.ownerName);
  setTextForSelector(".cv-continued-role", linkedin?.headline || site.role, site.role);
  setElementText("cv-lead", summary, portfolio.config.intro || "");
  setElementLink("cv-portfolio-link", { label: page.portfolioLabel, href: portfolioUrl }, "Apri portfolio", portfolioUrl);
  setElementLink("cv-linkedin-link", { label: page.linkedinLabel, href: linkedinUrl }, "Profilo LinkedIn", linkedinUrl);

  setElementText("cv-contact-title", page.contactTitle, "Dati personali");
  setElementText("cv-languages-title", page.languagesTitle, "Lingue");
  setElementText("cv-profile-title", page.profileTitle, "Profilo");
  setElementText("cv-experience-title", page.experienceTitle, "Esperienze lavorative");
  setElementText("cv-education-title", page.educationTitle, "Formazione");
  setElementText("cv-university-courses-title", page.universityCoursesTitle, "Corsi universitari");
  setElementText("cv-certifications-title", page.certificationsTitle, "Certificati e percorsi");
  setElementText("cv-projects-title", page.projectsTitle, "Progetti e materiali");
  setElementText("cv-technical-title", page.technicalTitle, "Competenze tecniche");
  setElementText("cv-privacy-note", page.privacyNote, "Autorizzo il trattamento dei miei dati personali ai sensi del D.lgs. 196 del 30 giugno 2003.");

  const photoElement = document.getElementById("cv-photo");
  if (photoUrl) {
    photoElement.src = photoUrl;
  } else {
    photoElement.classList.add("hidden");
  }

  document.getElementById("cv-hero-meta").innerHTML = [
    linkedin?.availability ? `<span>${escapeHtml(linkedin.availability)}</span>` : "",
    linkedin?.location ? `<span>${escapeHtml(linkedin.location)}</span>` : "",
    portfolio.generatedAtLocal ? `<span>Aggiornato ${escapeHtml(portfolio.generatedAtLocal)}</span>` : ""
  ].filter(Boolean).join("");

  const emails = asArray(contactConfig.emails);
  const contactItems = [
    ...emails.map((email, index) => ({
      label: index === 0 ? "Email" : "Email lavoro",
      value: email,
      href: `mailto:${email}`
    })),
    {
      label: "LinkedIn",
      value: linkedinUrl.replace("https://", "").replace(/\/$/, ""),
      href: linkedinUrl,
      external: true
    }
  ];
  document.getElementById("cv-contact-list").innerHTML = renderLinkList(contactItems);
  document.getElementById("cv-personal-list").innerHTML = renderDetailList(personalDetails);
  document.getElementById("cv-language-list").innerHTML = renderLanguageList(languages);

  document.getElementById("cv-profile-body").innerHTML = `
    <p>${escapeHtml(summary)}</p>
    <p class="cv-inline-note">Competenze in rilievo: ${escapeHtml(primarySkills.join(", "))}.</p>
  `;
  document.getElementById("cv-experience-list").innerHTML = renderTimeline(asArray(linkedin?.experience), "experience");
  document.getElementById("cv-education-list").innerHTML = renderTimeline(asArray(linkedin?.educationHistory), "education");
  document.getElementById("cv-university-courses-list").innerHTML = renderUniversityCourses(universityCourses);
  document.getElementById("cv-program-list").innerHTML = renderProgramCards(asArray(portfolio.programs), page);
  document.getElementById("cv-certification-list").innerHTML = renderCertificateList(certificates);
  document.getElementById("cv-projects-list").innerHTML = renderProjectList(featuredProjects, page.emptyProjectsText || "I deliverable principali sono disponibili nella sezione progetti del portfolio.");
  document.getElementById("cv-technical-list").innerHTML = renderTechnicalSections(asArray(portfolio.config.skillSections));

  document.getElementById("cv-download-button").textContent = page.downloadLabel || "Scarica PDF";
  document.getElementById("cv-download-button").addEventListener("click", () => window.print());
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
