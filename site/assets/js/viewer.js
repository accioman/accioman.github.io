import { loadPayload, initShell, findDocumentByRelativePath, relatedDocuments, documentActions, renderStatus, mountPreviewContent, getDocumentDisplayTitle, getDocumentProgramNames, escapeHtml } from "./common.js";

function renderViewerFrame(file) {
  const title = getDocumentDisplayTitle(file);
  const programChipMarkup = file.isCertificate
    ? getDocumentProgramNames(file).map((programName) => `<span class="info-chip">${escapeHtml(programName)}</span>`).join("")
    : "";
  const subtitleMarkup = file.isCertificate
    ? ""
    : `<p class="muted preview-file-meta">${escapeHtml(file.programName)} / ${escapeHtml(file.courseName)}</p>`;

  return `
    <div class="preview-card">
      <p class="panel-label">Viewer</p>
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

  const params = new URLSearchParams(window.location.search);
  const requestedPath = params.get("file");
  const file = findDocumentByRelativePath(portfolio, requestedPath) || portfolio.library.pdfs[0] || portfolio.library.documents[0];

  if (!file) {
    throw new Error("Nessun documento disponibile.");
  }

  const title = getDocumentDisplayTitle(file);
  document.title = `${title} | Viewer`;
  document.getElementById("viewer-title").textContent = title;
  document.getElementById("viewer-summary").textContent = file.isCertificate
    ? getDocumentProgramNames(file).join(" / ")
    : `${file.programName} / ${file.courseName}`;
  document.getElementById("viewer-meta").innerHTML = `
    ${file.isCertificate ? getDocumentProgramNames(file).map((programName) => `<div class="info-chip">${escapeHtml(programName)}</div>`).join("") : ""}
    <div class="info-chip">${escapeHtml(file.kindLabel)}</div>
    <div class="info-chip">${escapeHtml(file.sizeLabel)}</div>
    <div class="info-chip">${escapeHtml(file.updatedAtLocal)}</div>
    ${file.isCertificate ? "" : renderStatus(file.courseStatus)}
  `;
  document.getElementById("viewer-frame-panel").innerHTML = renderViewerFrame(file);
  await mountPreviewContent(file, document.getElementById("viewer-frame-panel"));

  const layout = document.querySelector(".archive-layout");
  if (layout) {
    layout.classList.toggle("has-wide-preview", file.kind === "spreadsheet");
  }

  document.getElementById("related-files").innerHTML = relatedDocuments(portfolio, file).slice(0, 8).map((entry) => `
    <article class="related-card">
      <h3 class="related-file-title">${escapeHtml(entry.name)}</h3>
      <p class="muted">${escapeHtml(entry.kindLabel)} · ${escapeHtml(entry.sizeLabel)}</p>
      <div class="meta-row">
        <a class="text-link" href="./viewer.html?file=${encodeURIComponent(entry.relativePath)}">Apri</a>
      </div>
    </article>
  `).join("") || `<p class="muted">Nessun altro file nello stesso corso.</p>`;
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
