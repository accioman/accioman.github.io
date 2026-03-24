import { loadPayload, initShell, findDocumentByRelativePath, relatedDocuments, documentActions, renderStatus, mountPreviewContent, getDocumentDisplayTitle, getDocumentProgramNames, escapeHtml, formatTemplate, setElementText } from "./common.js";

function renderViewerFrame(file, page) {
  const title = getDocumentDisplayTitle(file);
  const programChipMarkup = file.isCertificate
    ? getDocumentProgramNames(file).map((programName) => `<span class="info-chip">${escapeHtml(programName)}</span>`).join("")
    : "";
  const subtitleMarkup = file.isCertificate
    ? ""
    : `<p class="muted preview-file-meta">${escapeHtml(file.programName)} / ${escapeHtml(file.courseName)}</p>`;

  return `
    <div class="preview-card">
      <p class="panel-label">${escapeHtml(page.frameLabel || "Viewer")}</p>
      <h2 class="preview-file-title">${escapeHtml(title)}</h2>
      ${subtitleMarkup}
      <div class="detail-list">
        ${programChipMarkup}
        ${file.isCertificate ? "" : renderStatus(file.courseStatus)}
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
        <span class="info-chip">${escapeHtml(file.updatedAtLocal)}</span>
      </div>
      <div class="preview-surface" data-preview-surface></div>
      ${documentActions(file)}
    </div>
  `;
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("viewer", portfolio, linkedin);
  const page = portfolio.config.site.viewerPage || {};

  const params = new URLSearchParams(window.location.search);
  const requestedPath = params.get("file");
  const file = findDocumentByRelativePath(portfolio, requestedPath) || portfolio.library.pdfs[0] || portfolio.library.documents[0];

  setElementText("viewer-eyebrow", page.eyebrow, "Preview dedicata");
  setElementText("viewer-title", page.defaultTitle, "Viewer documento");
  setElementText("viewer-details-label", page.detailsLabel, "Dettagli");
  setElementText("viewer-related-title", page.relatedTitle, "Documenti correlati");

  if (!file) {
    throw new Error(page.noDocumentError || "Nessun documento disponibile.");
  }

  const title = getDocumentDisplayTitle(file);
  document.title = formatTemplate(page.documentTitleTemplate || "{title} | Viewer", { title });
  document.getElementById("viewer-title").textContent = title;
  document.getElementById("viewer-summary").textContent = file.isCertificate
    ? formatTemplate(page.certificateSummaryTemplate || "{programs}", {
      programs: getDocumentProgramNames(file).join(" / ")
    })
    : formatTemplate(page.standardSummaryTemplate || "{program} / {course}", {
      program: file.programName,
      course: file.courseName
    });
  document.getElementById("viewer-meta").innerHTML = `
    ${file.isCertificate ? getDocumentProgramNames(file).map((programName) => `<div class="info-chip">${escapeHtml(programName)}</div>`).join("") : ""}
    <div class="info-chip">${escapeHtml(file.kindLabel)}</div>
    <div class="info-chip">${escapeHtml(file.sizeLabel)}</div>
    <div class="info-chip">${escapeHtml(file.updatedAtLocal)}</div>
    ${file.isCertificate ? "" : renderStatus(file.courseStatus)}
  `;
  document.getElementById("viewer-frame-panel").innerHTML = renderViewerFrame(file, page);
  await mountPreviewContent(file, document.getElementById("viewer-frame-panel"));

  const layout = document.querySelector(".archive-layout");
  if (layout) {
    layout.classList.toggle("has-wide-preview", file.kind === "spreadsheet");
  }

  document.getElementById("related-files").innerHTML = relatedDocuments(portfolio, file).slice(0, 8).map((entry) => `
    <article class="related-card viewer-related-card">
      <h3 class="related-file-title">${escapeHtml(entry.name)}</h3>
      <p class="muted">${escapeHtml(entry.kindLabel)} · ${escapeHtml(entry.sizeLabel)}</p>
      <div class="meta-row">
        <a class="text-link" href="./viewer.html?file=${encodeURIComponent(entry.relativePath)}">${escapeHtml(page.openRelatedLabel || "Apri")}</a>
      </div>
    </article>
  `).join("") || `<p class="muted">${escapeHtml(page.noRelatedDocumentsText || "Nessun altro file nello stesso corso.")}</p>`;
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
