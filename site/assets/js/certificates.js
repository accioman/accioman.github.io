import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";
import { loadPayload, initShell, renderPreview, escapeHtml } from "./common.js";

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
  selectedFile: null
};

async function renderPdfThumbnail(canvas) {
  const holder = canvas.closest(".canvas-shell");
  const loading = holder.querySelector(".thumb-loading");

  try {
    const pdf = await pdfjsLib.getDocument(canvas.dataset.pdf).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(300 / baseViewport.width, 220 / baseViewport.height);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    loading.remove();
  } catch (error) {
    loading.textContent = "Miniatura non disponibile";
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
  const haystack = [file.name, file.programName, file.courseName].join(" ").toLowerCase();

  if (filters.query && !haystack.includes(filters.query)) {
    return false;
  }
  if (filters.program && file.programId !== filters.program) {
    return false;
  }

  return true;
}

function updatePreview(file) {
  state.selectedFile = file;
  document.getElementById("preview-panel").innerHTML = renderPreview(file);
}

function bindInteractions() {
  document.querySelectorAll(".preview-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const file = state.portfolio.library.certificates.find((entry) => entry.relativePath === button.dataset.path);
      if (file) {
        updatePreview(file);
      }
    });
  });
}

function renderCertificates(certificates) {
  const grid = document.getElementById("certificate-grid");
  document.getElementById("certificate-empty").classList.toggle("hidden", certificates.length > 0);

  grid.innerHTML = certificates.map((file) => `
    <article class="document-card">
      <div class="canvas-shell">
        <span class="thumb-badge">Certificato</span>
        <canvas data-pdf="${file.webPath}"></canvas>
        <div class="thumb-loading">Carico miniatura...</div>
      </div>
      <h3>${escapeHtml(file.name)}</h3>
      <p class="muted">${escapeHtml(file.programName)} / ${escapeHtml(file.courseName)}</p>
      <div class="file-actions">
        <button class="button button-primary preview-trigger" type="button" data-path="${escapeHtml(file.relativePath)}">Anteprima</button>
        <a class="button button-secondary" href="./viewer.html?file=${encodeURIComponent(file.relativePath)}">Viewer</a>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("canvas").forEach((canvas) => thumbObserver.observe(canvas));
}

function refresh() {
  const filters = currentFilters();
  const certificates = state.portfolio.library.certificates.filter((file) => matchesFilter(file, filters));
  renderCertificates(certificates);
  bindInteractions();

  if (!state.selectedFile || !matchesFilter(state.selectedFile, filters)) {
    updatePreview(certificates[0] ?? null);
  } else {
    updatePreview(state.selectedFile);
  }
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  state.portfolio = portfolio;
  initShell("certificati", portfolio, linkedin);

  document.title = "Certificati | Portfolio formativo";
  document.getElementById("certificates-summary").textContent = `Tutti i ${portfolio.library.certificates.length} certificati completati sono consultabili qui con miniature PDF e viewer dedicato.`;

  document.getElementById("program-filter").innerHTML = [
    `<option value="">Tutti</option>`,
    ...portfolio.programs.map((program) => `<option value="${program.id}">${escapeHtml(program.name)}</option>`)
  ].join("");

  document.getElementById("search-input").addEventListener("input", refresh);
  document.getElementById("program-filter").addEventListener("change", refresh);

  refresh();
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
