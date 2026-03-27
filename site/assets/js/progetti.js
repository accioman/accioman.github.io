import {
  loadPayload,
  initShell,
  asArray,
  escapeHtml,
  formatTemplate,
  metricCard,
  renderStatus,
  setElementLink,
  setElementPlaceholder,
  setElementText,
  mountPreviewContent
} from "./common.js";

const state = {
  page: {},
  projects: [],
  filteredProjects: [],
  activeProjectId: "",
  activeFileRelativePath: "",
  portfolio: null
};

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function buildProjectHref(projectId) {
  const params = new URLSearchParams(window.location.search);
  if (projectId) {
    params.set("project", projectId);
  } else {
    params.delete("project");
  }

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function buildCourseHref(project) {
  if (!project?.programId || !project?.id) {
    return "./percorsi.html";
  }

  const params = new URLSearchParams();
  params.set("program", project.programId);
  params.set("course", project.id);
  return `./percorsi.html?${params.toString()}`;
}

function getPrimaryFile(project) {
  const primaryRelativePath = project?.primaryFileRelativePath || "";
  const files = asArray(project?.files);
  return files.find((file) => file.relativePath === primaryRelativePath) || files[0] || null;
}

function getTypeLabel(page, category) {
  const labels = page.typeLabels || {};
  const normalized = normalizeValue(category);
  return labels[normalized] || category || "N/A";
}

function getProjectSearchText(project) {
  const caseStudy = project.caseStudy || {};
  return [
    project.name,
    project.programName,
    project.category,
    project.summary,
    project.evidence,
    project.materialPreview,
    caseStudy.title,
    caseStudy.lead,
    caseStudy.context,
    caseStudy.objective,
    caseStudy.role,
    caseStudy.outcome,
    ...asArray(caseStudy.skills),
    ...asArray(caseStudy.deliverables),
    ...asArray(project.files).map((file) => file.name)
  ].join(" ").toLowerCase();
}

function projectMatchesFilters(project) {
  const searchValue = normalizeValue(document.getElementById("projects-search")?.value);
  const programValue = normalizeValue(document.getElementById("projects-program-filter")?.value);
  const typeValue = normalizeValue(document.getElementById("projects-type-filter")?.value);
  const statusValue = normalizeValue(document.getElementById("projects-status-filter")?.value);

  if (searchValue && !getProjectSearchText(project).includes(searchValue)) {
    return false;
  }

  if (programValue && normalizeValue(project.programId) !== programValue) {
    return false;
  }

  if (typeValue && normalizeValue(project.category) !== typeValue) {
    return false;
  }

  if (statusValue && normalizeValue(project.status) !== statusValue) {
    return false;
  }

  return true;
}

function renderProjectCard(project, isActive) {
  const caseStudy = project.caseStudy || {};

  return `
    <button
      class="project-card project-card-selector${isActive ? " is-active" : ""}"
      type="button"
      data-project-id="${escapeHtml(project.id)}"
      aria-pressed="${String(isActive)}"
    >
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
          <span class="info-chip">${escapeHtml(formatTemplate(state.page.fileCountLabelTemplate || "{count} file", { count: project.workFileCount }))}</span>
        </div>
      </div>
      <div class="meta-line">
        ${caseStudy.role ? `<span class="info-chip">${escapeHtml(caseStudy.role)}</span>` : ""}
        ${caseStudy.outcome ? `<span class="info-chip">${escapeHtml(caseStudy.outcome)}</span>` : ""}
      </div>
    </button>
  `;
}

function renderCaseStudyFacts(project) {
  const labels = state.page.caseStudyLabels || {};
  const caseStudy = project.caseStudy || {};
  const facts = [
    { label: labels.context || "Contesto", value: caseStudy.context },
    { label: labels.objective || "Obiettivo", value: caseStudy.objective },
    { label: labels.role || "Ruolo", value: caseStudy.role },
    { label: labels.outcome || "Risultato", value: caseStudy.outcome }
  ].filter((fact) => fact.value);

  return facts.map((fact) => `
    <article class="project-case-study-fact">
      <strong>${escapeHtml(fact.label)}</strong>
      <p>${escapeHtml(fact.value)}</p>
    </article>
  `).join("");
}

function renderProjectFileButton(file, isActive) {
  return `
    <button
      class="file-button project-file-button${isActive ? " is-active" : ""}"
      type="button"
      data-project-file="${escapeHtml(file.relativePath)}"
      aria-pressed="${String(isActive)}"
    >
      <div class="project-file-button-head">
        <strong>${escapeHtml(file.displayName || file.name)}</strong>
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
      </div>
      <div class="meta-line">
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
        ${file.updatedAtLocal ? `<span class="info-chip">${escapeHtml(file.updatedAtLocal)}</span>` : ""}
      </div>
    </button>
  `;
}

function renderProjectPreview(project) {
  if (!project) {
    return `
      <div class="project-preview-context">
        <p class="panel-label">${escapeHtml(state.page.selectedLabel || "Case study selezionato")}</p>
        <h2>Nessun case study selezionato</h2>
        <p class="muted">${escapeHtml(state.page.emptyState || "Seleziona un case study per vedere i dettagli.")}</p>
      </div>
    `;
  }

  const caseStudy = project.caseStudy || {};
  const activeFile = asArray(project.files).find((file) => file.relativePath === state.activeFileRelativePath) || getPrimaryFile(project);
  const labels = state.page.caseStudyLabels || {};

  return `
    <div class="project-preview-context">
      <div class="project-preview-context-head">
        <div>
          <p class="panel-label">${escapeHtml(state.page.selectedLabel || "Case study selezionato")}</p>
          <h2>${escapeHtml(caseStudy.title || project.name)}</h2>
          <p class="project-case-study-lead">${escapeHtml(caseStudy.lead || project.summary || project.materialPreview || "")}</p>
        </div>
        <div class="project-preview-context-meta">
          ${renderStatus(project.status)}
          ${project.category ? `<span class="info-chip">${escapeHtml(getTypeLabel(state.page, project.category))}</span>` : ""}
          <span class="info-chip">${escapeHtml(project.programName)}</span>
        </div>
      </div>
      <div class="project-case-study-grid">
        ${renderCaseStudyFacts(project)}
      </div>
      <div class="project-case-study-aside">
        ${asArray(caseStudy.skills).length ? `
          <section class="project-case-study-supplement">
            <p class="panel-label">${escapeHtml(labels.skills || "Competenze")}</p>
            <div class="detail-list">${asArray(caseStudy.skills).map((skill) => `<span class="info-chip">${escapeHtml(skill)}</span>`).join("")}</div>
          </section>
        ` : ""}
        ${asArray(caseStudy.deliverables).length ? `
          <section class="project-case-study-supplement">
            <p class="panel-label">${escapeHtml(labels.deliverables || "Deliverable")}</p>
            <ul class="project-case-study-deliverables">
              ${asArray(caseStudy.deliverables).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>
        ` : ""}
      </div>
    </div>
    <div class="preview-card project-explorer-card">
      <div class="project-section-minihead">
        <div>
          <p class="panel-label">${escapeHtml(state.page.previewLabel || "Preview del deliverable")}</p>
          <h3>${escapeHtml(activeFile ? (activeFile.displayName || activeFile.name) : (labels.primaryFile || "File guida"))}</h3>
        </div>
        <div class="file-actions">
          <a class="button button-primary button-compact" href="${buildCourseHref(project)}">${escapeHtml(labels.openViewer || "Apri percorso")}</a>
          ${activeFile ? `<a class="button button-secondary button-compact" href="${escapeHtml(activeFile.webPath)}" target="_blank" rel="noreferrer">Apri file</a>` : ""}
        </div>
      </div>
      ${activeFile ? `
        <div class="meta-line">
          <span class="info-chip">${escapeHtml(activeFile.kindLabel)}</span>
          <span class="info-chip">${escapeHtml(activeFile.sizeLabel)}</span>
          ${activeFile.updatedAtLocal ? `<span class="info-chip">${escapeHtml(activeFile.updatedAtLocal)}</span>` : ""}
        </div>
      ` : `<p class="muted">Nessun file guida disponibile.</p>`}
      ${asArray(project.files).length ? `
        <div class="project-case-study-files">
          <div class="project-section-minihead">
            <p class="panel-label">${escapeHtml(labels.files || "File consultabili")}</p>
          </div>
          <div class="file-list">
            ${asArray(project.files).map((file) => renderProjectFileButton(file, file.relativePath === state.activeFileRelativePath)).join("")}
          </div>
        </div>
      ` : ""}
      ${activeFile ? `<div class="preview-surface" data-preview-surface></div>` : ""}
    </div>
  `;
}

function renderMetrics(projects) {
  const previewableCount = projects.reduce((total, project) =>
    total + asArray(project.files).filter((file) => file.previewable).length, 0);

  return [
    metricCard(state.page.metrics?.projects || "Case study", projects.length),
    metricCard(
      state.page.metrics?.deliverables || "Deliverable",
      projects.reduce((total, project) => total + (Number(project.workFileCount) || 0), 0)
    ),
    metricCard(
      state.page.metrics?.programs || "Percorsi",
      new Set(projects.map((project) => project.programName)).size
    ),
    metricCard(state.page.metrics?.previewable || "Preview online", previewableCount)
  ].join("");
}

function syncProjectUrl(projectId) {
  window.history.replaceState({}, "", buildProjectHref(projectId));
}

async function refreshPreview() {
  const panel = document.getElementById("projects-preview-panel");
  const project = state.filteredProjects.find((entry) => entry.id === state.activeProjectId) || null;
  panel.innerHTML = renderProjectPreview(project);

  if (project) {
    const activeFile = asArray(project.files).find((file) => file.relativePath === state.activeFileRelativePath) || getPrimaryFile(project);
    state.activeFileRelativePath = activeFile?.relativePath || "";
    await mountPreviewContent(activeFile, panel);

    panel.querySelectorAll("[data-project-file]").forEach((button) => {
      button.addEventListener("click", async () => {
        state.activeFileRelativePath = button.getAttribute("data-project-file") || "";
        await refreshPreview();
      });
    });
  }
}

async function renderProjects() {
  state.filteredProjects = state.projects.filter((project) => projectMatchesFilters(project));

  const list = document.getElementById("projects-list");
  const emptyState = document.getElementById("projects-empty-state");

  if (!state.filteredProjects.length) {
    list.innerHTML = "";
    emptyState.textContent = state.page.emptyState || "Nessun progetto corrisponde ai filtri correnti.";
    emptyState.classList.remove("hidden");
    state.activeProjectId = "";
    state.activeFileRelativePath = "";
    syncProjectUrl("");
    await refreshPreview();
    return;
  }

  emptyState.classList.add("hidden");

  if (!state.filteredProjects.some((project) => project.id === state.activeProjectId)) {
    state.activeProjectId = state.filteredProjects[0].id;
    syncProjectUrl(state.activeProjectId);
    state.activeFileRelativePath = getPrimaryFile(state.filteredProjects[0])?.relativePath || "";
  }

  list.innerHTML = state.filteredProjects
    .map((project) => renderProjectCard(project, project.id === state.activeProjectId))
    .join("");

  list.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const projectId = button.getAttribute("data-project-id") || "";
      const project = state.filteredProjects.find((entry) => entry.id === projectId);
      state.activeProjectId = projectId;
      state.activeFileRelativePath = getPrimaryFile(project)?.relativePath || "";
      syncProjectUrl(projectId);
      await renderProjects();
    });
  });

  await refreshPreview();
}

function populateFilters(projects) {
  const programSelect = document.getElementById("projects-program-filter");
  const typeSelect = document.getElementById("projects-type-filter");
  const statusSelect = document.getElementById("projects-status-filter");
  const page = state.page;

  const programOptions = [
    `<option value="">${escapeHtml(page.allProgramsLabel || "Tutti")}</option>`,
    ...Array.from(new Map(projects.map((project) => [project.programId, project.programName])).entries())
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
  ];
  const typeOptions = [
    `<option value="">${escapeHtml(page.allTypesLabel || "Tutte")}</option>`,
    ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right))
      .map((value) => `<option value="${escapeHtml(normalizeValue(value))}">${escapeHtml(getTypeLabel(page, value))}</option>`)
  ];
  const statusOptions = [
    `<option value="">${escapeHtml(page.allStatusesLabel || "Tutti")}</option>`,
    ...Array.from(new Set(projects.map((project) => project.status).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right))
      .map((value) => `<option value="${escapeHtml(normalizeValue(value))}">${escapeHtml(value)}</option>`)
  ];

  programSelect.innerHTML = programOptions.join("");
  typeSelect.innerHTML = typeOptions.join("");
  statusSelect.innerHTML = statusOptions.join("");
}

function bindFilters() {
  [
    "projects-search",
    "projects-program-filter",
    "projects-type-filter",
    "projects-status-filter"
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      void renderProjects();
    });
    document.getElementById(id)?.addEventListener("change", () => {
      void renderProjects();
    });
  });
}

function selectProjectFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "";
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) {
    return;
  }

  state.activeProjectId = project.id;
  state.activeFileRelativePath = getPrimaryFile(project)?.relativePath || "";
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("progetti", portfolio, linkedin);

  state.portfolio = portfolio;
  state.page = portfolio.config.site.projectsPage || {};
  state.projects = asArray(portfolio.library?.projects);

  document.title = `${state.page.title || "Case study"} | Portfolio professionale`;
  setElementText("projects-eyebrow", state.page.eyebrow, "Case study verificabili");
  setElementText("projects-title", state.page.title, "Case study e deliverable");
  setElementText(
    "projects-summary",
    formatTemplate(state.page.summaryTemplate || "{count} case study con deliverable verificabili.", {
      count: state.projects.length
    })
  );
  setElementText("projects-metrics-label", state.page.metricsLabel, "Snapshot");
  document.getElementById("projects-metrics").innerHTML = renderMetrics(state.projects);
  setElementText("projects-section-title", state.page.sectionTitle, "Case study consultabili");
  setElementText("projects-section-copy", state.page.sectionCopy, "");
  setElementText("projects-search-label", state.page.searchLabel, "Cerca");
  setElementPlaceholder("projects-search", state.page.searchPlaceholder, "Corso, file o programma");
  setElementText("projects-program-label", state.page.programLabel, "Percorso");
  setElementText("projects-type-label", state.page.typeLabel, "Categoria");
  setElementText("projects-status-label", state.page.statusLabel, "Stato");
  setElementText("projects-list-title", "Case study disponibili");
  setElementLink("projects-primary-cta", state.page.primaryCta, "Apri CV", "./cv.html");
  setElementLink("projects-secondary-cta", state.page.secondaryCta, "Apri percorsi", "./percorsi.html");

  populateFilters(state.projects);
  bindFilters();
  selectProjectFromLocation();

  if (!state.activeProjectId && state.projects.length) {
    state.activeProjectId = state.projects[0].id;
    state.activeFileRelativePath = getPrimaryFile(state.projects[0])?.relativePath || "";
  }

  await renderProjects();
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
