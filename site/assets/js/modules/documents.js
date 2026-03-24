import {
  escapeHtml,
  renderStatus,
  getDocumentDisplayTitle,
  getDocumentProgramNames
} from "./utils.js";

const defaultDocumentActionConfig = Object.freeze({
  openViewerLabel: "Apri percorsi",
  openFileLabel: "Apri file"
});

let documentActionConfig = { ...defaultDocumentActionConfig };

export function configureDocumentActions(config = {}) {
  documentActionConfig = {
    ...defaultDocumentActionConfig,
    ...(config || {})
  };
}

export function documentActions(file, options = {}) {
  const compactClass = options.compact ? " button-compact" : "";
  const showOpenFile = options.showOpenFile !== false;
  const detailsHref = options.detailsHref || "./percorsi.html";
  return `
    <div class="file-actions">
      <a class="button button-primary${compactClass}" href="${detailsHref}">${escapeHtml(documentActionConfig.openViewerLabel)}</a>
      ${showOpenFile ? `<a class="button button-secondary${compactClass}" href="${file.webPath}" target="_blank" rel="noreferrer">${escapeHtml(documentActionConfig.openFileLabel)}</a>` : ""}
    </div>
  `;
}

export function getAbsoluteFileUrl(file) {
  return new URL(file.webPath, window.location.href).href;
}

export function getEmbedUrl(file) {
  if (file.previewType === "pdf") {
    return `${file.webPath}#view=FitH&navpanes=0&pagemode=none`;
  }

  if (file.previewType === "office") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getAbsoluteFileUrl(file))}`;
  }

  return file.webPath;
}

export function findDocumentByRelativePath(portfolio, relativePath) {
  return portfolio.library.documents.find((document) => document.relativePath === relativePath) ?? null;
}

export function relatedDocuments(portfolio, document) {
  return portfolio.library.documents.filter((entry) =>
    entry.courseId === document.courseId && entry.relativePath !== document.relativePath
  );
}

export function renderDocumentCard(file, subtitle) {
  const title = getDocumentDisplayTitle(file);
  const programChipMarkup = getDocumentProgramNames(file)
    .map((programName) => `<span class="info-chip">${escapeHtml(programName)}</span>`)
    .join("");
  const subtitleMarkup = file.isCertificate
    ? ""
    : `<p class="muted">${escapeHtml(subtitle)}</p>`;
  const metaMarkup = file.isCertificate
    ? `<div class="meta-line">${programChipMarkup}</div>`
    : `
      <div class="meta-line">
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
      </div>
    `;

  return `
    <article class="document-card">
      <h3>${escapeHtml(title)}</h3>
      ${subtitleMarkup}
      ${metaMarkup}
      ${documentActions(file)}
    </article>
  `;
}

export function renderPreview(file) {
  if (!file) {
    return `
      <div class="preview-card">
        <p class="panel-label">Anteprima</p>
        <h2>Nessun file selezionato</h2>
        <p class="muted">Seleziona un PDF o un documento dal pannello a sinistra per aprire l'anteprima.</p>
      </div>
    `;
  }

  const title = getDocumentDisplayTitle(file);
  const programChipMarkup = getDocumentProgramNames(file)
    .map((programName) => `<span class="info-chip">${escapeHtml(programName)}</span>`)
    .join("");
  const subtitleMarkup = file.isCertificate
    ? ""
    : `<p class="muted">${escapeHtml(file.programName)} / ${escapeHtml(file.courseName)}</p>`;
  const detailMarkup = file.isCertificate
    ? `
      <div class="detail-list">
        ${programChipMarkup}
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
      </div>
    `
    : `
      <div class="detail-list">
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
        ${renderStatus(file.courseStatus)}
      </div>
    `;

  return `
    <div class="preview-card">
      <p class="panel-label">Anteprima</p>
      <h2>${escapeHtml(title)}</h2>
      ${subtitleMarkup}
      ${detailMarkup}
      <div class="preview-surface" data-preview-surface></div>
      ${documentActions(file)}
    </div>
  `;
}
