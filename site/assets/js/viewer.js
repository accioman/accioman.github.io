import { loadPayload, initShell, findDocumentByRelativePath, relatedDocuments, getEmbedUrl, documentActions, renderStatus, escapeHtml } from "./common.js";

function renderViewerFrame(file) {
  const body = file.previewable
    ? `<iframe class="viewer-frame" title="Viewer ${escapeHtml(file.name)}" src="${getEmbedUrl(file)}"></iframe>`
    : `<p class="muted">Questo formato non supporta anteprima incorporata. Apri il file direttamente.</p>`;

  return `
    <div class="preview-card">
      <p class="panel-label">Viewer</p>
      <h2>${escapeHtml(file.name)}</h2>
      <p class="muted">${escapeHtml(file.programName)} / ${escapeHtml(file.courseName)}</p>
      <div class="detail-list">
        ${renderStatus(file.courseStatus)}
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
        <span class="info-chip">${escapeHtml(file.updatedAtLocal)}</span>
      </div>
      ${body}
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

  document.title = `${file.name} | Viewer`;
  document.getElementById("viewer-title").textContent = file.name;
  document.getElementById("viewer-summary").textContent = `${file.programName} / ${file.courseName}`;
  document.getElementById("viewer-meta").innerHTML = `
    <div class="info-chip">${escapeHtml(file.kindLabel)}</div>
    <div class="info-chip">${escapeHtml(file.sizeLabel)}</div>
    <div class="info-chip">${escapeHtml(file.updatedAtLocal)}</div>
    ${renderStatus(file.courseStatus)}
  `;
  document.getElementById("viewer-frame-panel").innerHTML = renderViewerFrame(file);

  document.getElementById("related-files").innerHTML = relatedDocuments(portfolio, file).slice(0, 8).map((entry) => `
    <article class="related-card">
      <h3>${escapeHtml(entry.name)}</h3>
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
