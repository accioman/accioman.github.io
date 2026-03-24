import { loadPayload, initShell, renderStatus, renderPreview, mountPreviewContent, uniqueValues, escapeHtml, formatTemplate, setElementText, setElementPlaceholder } from "./common.js";

let state = {
  portfolio: null,
  selectedFile: null,
  page: {}
};

const fallbackTypeLabels = {
  pdf: "PDF",
  document: "Documento",
  spreadsheet: "Foglio",
  presentation: "Presentazione",
  file: "File"
};

function getTypeLabels() {
  return {
    ...fallbackTypeLabels,
    ...(state.page.typeLabels || {})
  };
}

function currentFilters() {
  return {
    query: document.getElementById("search-input").value.trim().toLowerCase(),
    program: document.getElementById("program-filter").value,
    type: document.getElementById("type-filter").value,
    status: document.getElementById("status-filter").value
  };
}

function matchesFilter(item, filters) {
  const haystack = [
    item.name,
    item.programName,
    item.courseName,
    item.courseCategory,
    item.courseSummary,
    item.kindLabel,
    item.courseStatus
  ].join(" ").toLowerCase();

  if (filters.query && !haystack.includes(filters.query)) {
    return false;
  }
  if (filters.program && item.programId !== filters.program) {
    return false;
  }
  if (filters.type && item.kind !== filters.type) {
    return false;
  }
  if (filters.status && item.courseStatus !== filters.status) {
    return false;
  }

  return true;
}

function projectMatchesFilter(project, filters) {
  if (filters.query) {
    const projectText = [project.name, project.programName, project.category, project.summary, project.materialPreview, project.evidence].join(" ").toLowerCase();
    const hasMatchingFile = project.files.some((file) => matchesFilter(file, filters));
    if (!projectText.includes(filters.query) && !hasMatchingFile) {
      return false;
    }
  }

  if (filters.program && project.programId !== filters.program) {
    return false;
  }
  if (filters.status && project.status !== filters.status) {
    return false;
  }
  if (filters.type && !project.files.some((file) => file.kind === filters.type)) {
    return false;
  }

  return true;
}

async function updatePreview(file) {
  state.selectedFile = file;
  document.getElementById("preview-panel").innerHTML = renderPreview(file);
  await mountPreviewContent(file, document.getElementById("preview-panel"));

  const layout = document.querySelector(".archive-layout");
  if (layout) {
    layout.classList.toggle("has-wide-preview", file?.kind === "spreadsheet");
  }

  document.querySelectorAll(".file-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.path === file?.relativePath);
  });
}

function renderProjects(projects) {
  const container = document.getElementById("project-list");
  document.getElementById("project-empty").classList.toggle("hidden", projects.length > 0);

  container.innerHTML = projects.map((project) => `
    <article class="project-card project-explorer-card">
      <h3>${escapeHtml(project.name)}</h3>
      <p class="muted">${escapeHtml(project.programName)}</p>
      <div class="meta-line">
        ${project.category ? `<span class="info-chip">${escapeHtml(project.category)}</span>` : ""}
        ${renderStatus(project.status)}
        <span class="info-chip">${escapeHtml(formatTemplate(state.page.fileCountLabelTemplate || "{count} file", { count: project.workFileCount }))}</span>
      </div>
      ${project.summary ? `<p class="card-summary">${escapeHtml(project.summary)}</p>` : ""}
      <p class="muted">${escapeHtml(project.materialPreview || project.evidence)}</p>
      <div class="file-list">
        ${project.files.map((file) => `
          <button class="file-button project-file-button" type="button" data-path="${escapeHtml(file.relativePath)}">
            <div class="file-kicker">
              <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
              <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
            </div>
            <strong>${escapeHtml(file.name)}</strong>
            <span class="muted">${escapeHtml(file.courseRelativePath)}</span>
          </button>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function bindInteractions() {
  document.querySelectorAll(".file-button").forEach((button) => {
    button.addEventListener("click", () => {
      const file = state.portfolio.library.documents.find((entry) => entry.relativePath === button.dataset.path);
      if (file) {
        void updatePreview(file);
      }
    });
  });
}

async function refresh() {
  const filters = currentFilters();
  const filteredProjects = state.portfolio.library.projects.filter((project) => projectMatchesFilter(project, filters));
  renderProjects(filteredProjects);
  bindInteractions();

  if (!state.selectedFile || !matchesFilter(state.selectedFile, filters)) {
    const fallbackFile = filteredProjects.flatMap((project) => project.files)[0] || null;
    const fallback = fallbackFile
      ? state.portfolio.library.documents.find((entry) => entry.relativePath === fallbackFile.relativePath) ?? fallbackFile
      : null;
    await updatePreview(fallback);
  } else {
    await updatePreview(state.selectedFile);
  }
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  state.portfolio = portfolio;
  state.page = portfolio.config.site.projectsPage || {};
  initShell("progetti", portfolio, linkedin);

  setElementText("projects-eyebrow", state.page.eyebrow, "Materiali pratici");
  setElementText("projects-title", state.page.title, "Progetti e deliverable");
  setElementText("projects-filters-label", state.page.filtersLabel, "Filtri");
  setElementText("projects-search-label", state.page.searchLabel, "Cerca");
  setElementText("projects-program-label", state.page.programLabel, "Percorso");
  setElementText("projects-type-label", state.page.typeLabel, "Tipo file");
  setElementText("projects-status-label", state.page.statusLabel, "Stato corso");
  setElementText("projects-section-title", state.page.sectionTitle, "Esplora i progetti");
  setElementText("projects-section-copy", state.page.sectionCopy, "Naviga i materiali di lavoro, seleziona un file e apri l'anteprima senza uscire dalla pagina.");
  setElementPlaceholder("search-input", state.page.searchPlaceholder, "Corso, file o programma");
  document.title = `${state.page.title || "Progetti"} | Portfolio formativo`;
  document.getElementById("projects-summary").textContent = formatTemplate(
    state.page.summaryTemplate || "Esplora {count} aree progetto e passa tra PDF, documenti e fogli di lavoro da una pagina dedicata.",
    { count: portfolio.library.projects.length }
  );
  setElementText("project-empty", state.page.emptyState, "Nessun progetto corrisponde ai filtri correnti.");

  document.getElementById("program-filter").innerHTML = [
    `<option value="">${escapeHtml(state.page.allProgramsLabel || "Tutti")}</option>`,
    ...portfolio.programs.map((program) => `<option value="${program.id}">${escapeHtml(program.name)}</option>`)
  ].join("");

  const typeLabels = getTypeLabels();
  document.getElementById("type-filter").innerHTML = [
    `<option value="">${escapeHtml(state.page.allTypesLabel || "Tutti")}</option>`,
    ...uniqueValues(portfolio.library.documents.filter((file) => !file.isCertificate).map((file) => file.kind))
      .map((kind) => `<option value="${kind}">${escapeHtml(typeLabels[kind] || kind)}</option>`)
  ].join("");

  document.getElementById("status-filter").innerHTML = [
    `<option value="">${escapeHtml(state.page.allStatusesLabel || "Tutti")}</option>`,
    ...uniqueValues(portfolio.library.projects.map((project) => project.status))
      .map((status) => `<option value="${status}">${escapeHtml(status)}</option>`)
  ].join("");

  for (const element of [
    document.getElementById("search-input"),
    document.getElementById("program-filter"),
    document.getElementById("type-filter"),
    document.getElementById("status-filter")
  ]) {
    element.addEventListener("input", () => void refresh());
    element.addEventListener("change", () => void refresh());
  }

  await refresh();
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
