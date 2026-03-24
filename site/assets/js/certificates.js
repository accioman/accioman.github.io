import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";
import { loadPayload, initShell, renderPreview, mountPreviewContent, getDocumentDisplayTitle, getDocumentProgramNames, getDocumentCourseNames, escapeHtml, formatTemplate, setElementText, setElementPlaceholder } from "./common.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

const thumbObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      renderPdfThumbnail(entry.target);
      thumbObserver.unobserve(entry.target);
    }
  }
}, { rootMargin: "200px" });

let state = {
  portfolio: null,
  selectedFile: null,
  page: {}
};

async function renderPdfThumbnail(canvas) {
  const holder = canvas.closest(".canvas-shell");
  const loading = holder.querySelector(".thumb-loading");

  try {
    const pdf = await pdfjsLib.getDocument(canvas.dataset.pdf).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    holder.style.aspectRatio = `${baseViewport.width} / ${baseViewport.height}`;
    const scale = Math.min(300 / baseViewport.width, 220 / baseViewport.height);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    loading.remove();
  } catch (error) {
    loading.textContent = state.page.thumbnailErrorLabel || "Miniatura non disponibile";
    console.error(error);
  }
}

function currentFilters() {
  return {
    query: document.getElementById("search-input").value.trim().toLowerCase(),
    program: document.getElementById("program-filter").value
  };
}

function matchesFilter(file, filters) {
  const haystack = [
    getDocumentDisplayTitle(file),
    getDocumentProgramNames(file).join(" "),
    getDocumentCourseNames(file).join(" "),
    file.name
  ].join(" ").toLowerCase();
  const programIds = Array.isArray(file.programIds) && file.programIds.length
    ? file.programIds
    : (file.programId ? [file.programId] : []);

  if (filters.query && !haystack.includes(filters.query)) {
    return false;
  }
  if (filters.program && !programIds.includes(filters.program)) {
    return false;
  }

  return true;
}

async function updatePreview(file) {
  state.selectedFile = file;
  document.getElementById("preview-panel").innerHTML = renderPreview(file);
  await mountPreviewContent(file, document.getElementById("preview-panel"));
}

function bindInteractions() {
  document.querySelectorAll(".preview-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const file = state.portfolio.library.certificates.find((entry) => entry.relativePath === button.dataset.path);
      if (file) {
        void updatePreview(file);
      }
    });
  });
}

function renderCertificates(certificates) {
  const grid = document.getElementById("certificate-grid");
  document.getElementById("certificate-empty").classList.toggle("hidden", certificates.length > 0);

  grid.innerHTML = certificates.map((file) => `
    <article class="document-card certificate-catalog-card">
      <div class="canvas-shell">
        <span class="thumb-badge">${escapeHtml(state.page.badgeLabel || "Certificato")}</span>
        <canvas data-pdf="${file.webPath}"></canvas>
        <div class="thumb-loading">${escapeHtml(state.page.thumbnailLoadingLabel || "Carico miniatura...")}</div>
      </div>
      <h3>${escapeHtml(getDocumentDisplayTitle(file))}</h3>
      <div class="meta-line certificate-card-meta">
        ${getDocumentProgramNames(file).map((programName) => `<span class="info-chip">${escapeHtml(programName)}</span>`).join("")}
      </div>
      <div class="file-actions">
        <button class="button button-primary preview-trigger" type="button" data-path="${escapeHtml(file.relativePath)}">${escapeHtml(state.page.previewButtonLabel || "Anteprima")}</button>
        <a class="button button-secondary" href="./viewer.html?file=${encodeURIComponent(file.relativePath)}">${escapeHtml(state.page.viewerButtonLabel || "Viewer")}</a>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("canvas").forEach((canvas) => thumbObserver.observe(canvas));
}

async function refresh() {
  const filters = currentFilters();
  const certificates = state.portfolio.library.certificates.filter((file) => matchesFilter(file, filters));
  renderCertificates(certificates);
  bindInteractions();

  if (!state.selectedFile || !matchesFilter(state.selectedFile, filters)) {
    await updatePreview(certificates[0] ?? null);
  } else {
    await updatePreview(state.selectedFile);
  }
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  state.portfolio = portfolio;
  state.page = portfolio.config.site.certificatesPage || {};
  initShell("certificati", portfolio, linkedin);

  setElementText("certificates-eyebrow", state.page.eyebrow, "Certificati completati");
  setElementText("certificates-title", state.page.title, "Galleria certificati");
  setElementText("certificates-filters-label", state.page.filtersLabel, "Filtri");
  setElementText("certificates-search-label", state.page.searchLabel, "Cerca");
  setElementText("certificates-program-label", state.page.programLabel, "Percorso");
  setElementText("certificates-section-title", state.page.sectionTitle, "Miniature PDF");
  setElementText("certificates-section-copy", state.page.sectionCopy, "Ogni certificato puo essere aperto subito nel viewer o in anteprima laterale.");
  setElementPlaceholder("search-input", state.page.searchPlaceholder, "Corso o certificato");
  document.title = `${state.page.title || "Certificati"} | Portfolio formativo`;
  document.getElementById("certificates-summary").textContent = formatTemplate(
    state.page.summaryTemplate || "Tutti i {count} certificati completati sono consultabili qui con miniature PDF e viewer dedicato.",
    { count: portfolio.library.certificates.length }
  );
  setElementText("certificate-empty", state.page.emptyState, "Nessun certificato corrisponde ai filtri correnti.");

  document.getElementById("program-filter").innerHTML = [
    `<option value="">${escapeHtml(state.page.allProgramsLabel || "Tutti")}</option>`,
    ...portfolio.programs.map((program) => `<option value="${program.id}">${escapeHtml(program.name)}</option>`)
  ].join("");

  document.getElementById("search-input").addEventListener("input", () => void refresh());
  document.getElementById("program-filter").addEventListener("change", () => void refresh());

  await refresh();
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
