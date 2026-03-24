const PORTFOLIO_PATH = "./assets/data/site-data.json";
const LINKEDIN_PATH = "./assets/data/linkedin-profile.json";

function normalizeKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeKeys(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key.length ? `${key[0].toLowerCase()}${key.slice(1)}` : key,
        normalizeKeys(entry)
      ])
    );
  }

  return value;
}

export async function loadPayload() {
  const portfolioResponse = await fetch(PORTFOLIO_PATH);
  if (!portfolioResponse.ok) {
    throw new Error(`Impossibile caricare ${PORTFOLIO_PATH}`);
  }

  const portfolio = normalizeKeys(await portfolioResponse.json());
  let linkedin = null;

  try {
    const linkedinResponse = await fetch(LINKEDIN_PATH);
    if (linkedinResponse.ok) {
      linkedin = normalizeKeys(await linkedinResponse.json());
    }
  } catch {
    linkedin = null;
  }

  return { portfolio, linkedin };
}

export function initShell(activePage, portfolio, linkedin) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === activePage) {
      link.classList.add("is-active");
    }
  });

  const linkedinLink = document.getElementById("header-linkedin");
  if (linkedinLink && linkedin?.profileUrl) {
    linkedinLink.href = linkedin.profileUrl;
  } else if (linkedinLink && portfolio?.config?.linkedin?.profileUrl) {
    linkedinLink.href = portfolio.config.linkedin.profileUrl;
  }

  const footerMeta = document.getElementById("footer-meta");
  if (footerMeta) {
    footerMeta.textContent = `Ultimo aggiornamento: ${portfolio.generatedAtLocal}`;
  }
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function statusClass(status) {
  if (status === "Completato") {
    return "status-completato";
  }

  if (status === "In corso") {
    return "status-in-corso";
  }

  return "status-cartella-pronta";
}

export function renderStatus(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

export function metricCard(label, value, detail = "") {
  return `
    <article class="metric-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
      ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
    </article>
  `;
}

export function documentActions(file) {
  const viewerHref = `./viewer.html?file=${encodeURIComponent(file.relativePath)}`;
  return `
    <div class="file-actions">
      <a class="button button-primary" href="${viewerHref}">Apri viewer</a>
      <a class="button button-secondary" href="${file.webPath}" target="_blank" rel="noreferrer">Apri file</a>
    </div>
  `;
}

export function getAbsoluteFileUrl(file) {
  return new URL(file.webPath, window.location.href).href;
}

export function getEmbedUrl(file) {
  if (file.previewType === "pdf") {
    return `${file.webPath}#view=FitH`;
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

export function uniqueValues(items) {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right));
}

export function renderLinkedInCard(portfolio, linkedin) {
  const site = portfolio.config.site;
  const profileUrl = linkedin?.profileUrl ?? portfolio.config.linkedin.profileUrl;
  const fullName = linkedin?.fullName || site.ownerName;
  const headline = linkedin?.headline || site.role;
  const note = linkedin?.note || "Profilo collegato con fallback statico.";

  return `
    <div class="linkedin-card">
      <p class="panel-label">LinkedIn</p>
      <h2>${escapeHtml(fullName)}</h2>
      <p>${escapeHtml(headline)}</p>
      <div class="linkedin-meta">
        <span class="info-chip">${escapeHtml(linkedin?.status || "linked")}</span>
        <span class="info-chip">${escapeHtml(note)}</span>
      </div>
      <p class="muted">Il link al profilo resta sempre disponibile. La sincronizzazione automatica usa una cache generata in build.</p>
      <a class="button button-primary" href="${profileUrl}" target="_blank" rel="noreferrer">Apri LinkedIn</a>
    </div>
  `;
}

export function renderDocumentCard(file, subtitle) {
  return `
    <article class="document-card">
      <h3>${escapeHtml(file.name)}</h3>
      <p class="muted">${escapeHtml(subtitle)}</p>
      <div class="meta-line">
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
      </div>
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

  const embedUrl = getEmbedUrl(file);
  const previewMarkup = file.previewable
    ? `<iframe title="Preview ${escapeHtml(file.name)}" src="${embedUrl}"></iframe>`
    : `<p class="muted">Questo formato non supporta anteprima incorporata. Aprilo nel viewer dedicato o scaricalo.</p>`;

  return `
    <div class="preview-card">
      <p class="panel-label">Anteprima</p>
      <h2>${escapeHtml(file.name)}</h2>
      <p class="muted">${escapeHtml(file.programName)} / ${escapeHtml(file.courseName)}</p>
      <div class="detail-list">
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
        <span class="info-chip">${escapeHtml(file.sizeLabel)}</span>
        ${renderStatus(file.courseStatus)}
      </div>
      ${previewMarkup}
      ${documentActions(file)}
    </div>
  `;
}
