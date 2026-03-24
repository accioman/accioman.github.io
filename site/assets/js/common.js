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

  const headerPhotoUrl = linkedin?.photoUrl || "";
  if (linkedinLink && headerPhotoUrl) {
    linkedinLink.classList.add("has-avatar");
    linkedinLink.innerHTML = `
      <img class="profile-avatar profile-avatar-header" src="${headerPhotoUrl}" alt="Foto profilo LinkedIn">
      <span>LinkedIn</span>
    `;
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
    return `${file.webPath}#view=FitH&navpanes=0&pagemode=none`;
  }

  if (file.previewType === "office") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getAbsoluteFileUrl(file))}`;
  }

  return file.webPath;
}

let mammothModulePromise = null;
let xlsxModulePromise = null;

async function getMammothModule() {
  if (!mammothModulePromise) {
    mammothModulePromise = import("https://cdn.jsdelivr.net/npm/mammoth@1.9.1/+esm");
  }

  return mammothModulePromise;
}

async function getXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  }

  return xlsxModulePromise;
}

async function fetchFileBuffer(file) {
  const response = await fetch(file.webPath);
  if (!response.ok) {
    throw new Error(`Impossibile caricare ${file.name}`);
  }

  return response.arrayBuffer();
}

function previewSurfaceId(file) {
  return `preview-surface-${escapeHtml(file.id)}`;
}

function filteredMammothMessages(messages = []) {
  return messages.filter((message) => {
    const text = String(message.message || "");
    if (text.startsWith("Unrecognised paragraph style:")) {
      return false;
    }
    if (text.startsWith("Unrecognised run style:")) {
      return false;
    }
    return true;
  });
}

function enhanceDocxHtml(html) {
  if (!html || typeof document === "undefined") {
    return html;
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("table").forEach((table) => {
    table.classList.add("docx-table");

    const rows = Array.from(table.querySelectorAll("tr"));
    rows.forEach((row) => row.classList.add("docx-table-row"));

    table.querySelectorAll("td, th").forEach((cell) => {
      cell.classList.add("docx-table-cell");
    });

    const firstRow = rows[0] ?? null;
    if (firstRow) {
      const firstRowCells = Array.from(firstRow.children).filter((cell) => /^(TD|TH)$/i.test(cell.tagName));
      const looksLikeHeaderRow = firstRowCells.length > 1 && firstRowCells.every((cell) => cell.querySelector("strong, b"));
      if (looksLikeHeaderRow) {
        firstRow.classList.add("docx-table-header-row");
      }
    }

    const wrapper = document.createElement("div");
    wrapper.className = "docx-table-shell";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  return template.innerHTML;
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

export function getDocumentDisplayTitle(file) {
  if (!file) {
    return "";
  }

  if (file.isCertificate) {
    return file.displayName || file.courseName || file.name;
  }

  return file.name;
}

export function getDocumentProgramNames(file) {
  const values = Array.isArray(file?.programNames) && file.programNames.length
    ? file.programNames
    : (file?.programName ? [file.programName] : []);

  return [...new Set(values.filter(Boolean))];
}

export function getDocumentCourseNames(file) {
  const values = Array.isArray(file?.courseNames) && file.courseNames.length
    ? file.courseNames
    : (file?.courseName ? [file.courseName] : []);

  return [...new Set(values.filter(Boolean))];
}

export function renderLinkedInCard(portfolio, linkedin) {
  const site = portfolio.config.site;
  const profileUrl = linkedin?.profileUrl ?? portfolio.config.linkedin.profileUrl;
  const fullName = linkedin?.fullName || site.ownerName;
  const headline = linkedin?.headline || site.role;
  const note = linkedin?.note || "Profilo LinkedIn gestito in modo statico nel repository.";
  const photoUrl = linkedin?.photoUrl || "";
  const location = linkedin?.location || "";
  const education = linkedin?.education || "";
  const availability = linkedin?.availability || "";
  const profileLanguage = linkedin?.profileLanguage || "";
  const summary = linkedin?.summary || "";
  const experience = Array.isArray(linkedin?.experience) ? linkedin.experience : [];
  const educationHistory = Array.isArray(linkedin?.educationHistory) ? linkedin.educationHistory : [];
  const featuredSkills = Array.isArray(linkedin?.featuredSkills) ? linkedin.featuredSkills : [];
  const photoMarkup = photoUrl
    ? `<img class="profile-avatar profile-avatar-card" src="${photoUrl}" alt="Foto profilo di ${escapeHtml(fullName)}">`
    : "";
  const metaChips = [
    availability ? `<span class="info-chip">${escapeHtml(availability)}</span>` : "",
    profileLanguage ? `<span class="info-chip">${escapeHtml(profileLanguage)}</span>` : "",
    note ? `<span class="info-chip">${escapeHtml(note)}</span>` : ""
  ].filter(Boolean).join("");
  const experienceMarkup = experience.length
    ? `
      <section class="linkedin-section linkedin-section-priority">
        <p class="panel-label">Esperienza</p>
        <div class="linkedin-entry-list">
          ${experience.map((entry, index) => `
            <article class="linkedin-entry${index === 0 ? " linkedin-entry-primary" : ""}">
              ${entry.title ? `<h3>${escapeHtml(entry.title)}</h3>` : ""}
              ${entry.company ? `<p class="linkedin-entry-company">${escapeHtml(entry.company)}</p>` : ""}
              ${(entry.employmentType || entry.period || entry.duration)
                ? `<div class="meta-line">
                    ${entry.employmentType ? `<span class="info-chip">${escapeHtml(entry.employmentType)}</span>` : ""}
                    ${entry.period ? `<span class="info-chip">${escapeHtml(entry.period)}</span>` : ""}
                    ${entry.duration ? `<span class="info-chip">${escapeHtml(entry.duration)}</span>` : ""}
                  </div>`
                : ""}
              ${Array.isArray(entry.skills) && entry.skills.length
                ? `<div class="detail-list">${entry.skills.map((skill) => `<span class="info-chip">${escapeHtml(skill)}</span>`).join("")}</div>`
                : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `
    : "";
  const educationMarkup = educationHistory.length
    ? `
      <section class="linkedin-section">
        <p class="panel-label">Formazione</p>
        <div class="linkedin-entry-list">
          ${educationHistory.map((entry) => `
            <article class="linkedin-entry linkedin-entry-secondary">
              ${entry.institution ? `<h3>${escapeHtml(entry.institution)}</h3>` : ""}
              ${entry.degree ? `<p class="linkedin-entry-company">${escapeHtml(entry.degree)}</p>` : ""}
              ${(entry.period || (Array.isArray(entry.skills) && entry.skills.length))
                ? `<div class="meta-line">
                    ${entry.period ? `<span class="info-chip">${escapeHtml(entry.period)}</span>` : ""}
                    ${Array.isArray(entry.skills)
                      ? entry.skills.map((skill) => `<span class="info-chip">${escapeHtml(skill)}</span>`).join("")
                      : ""}
                  </div>`
                : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `
    : "";
  const detailMarkup = [
    location ? `<p class="muted">${escapeHtml(location)}</p>` : "",
    summary ? `<p class="linkedin-summary">${escapeHtml(summary)}</p>` : "",
    experienceMarkup,
    !educationHistory.length && education ? `<p class="muted">${escapeHtml(education)}</p>` : "",
    educationMarkup,
    featuredSkills.length
      ? `
        <section class="linkedin-section">
          <p class="panel-label">Competenze in evidenza</p>
          <div class="detail-list">${featuredSkills.map((skill) => `<span class="info-chip">${escapeHtml(skill)}</span>`).join("")}</div>
        </section>
      `
      : ""
  ].filter(Boolean).join("");

  return `
    <div class="linkedin-card">
      <div class="linkedin-card-header">
        ${photoMarkup}
        <div class="linkedin-copy">
          <p class="panel-label">LinkedIn</p>
          <h2>${escapeHtml(fullName)}</h2>
          <p>${escapeHtml(headline)}</p>
        </div>
      </div>
      <div class="linkedin-meta">${metaChips}</div>
      ${detailMarkup}
      <a class="button button-primary" href="${profileUrl}" target="_blank" rel="noreferrer">Apri LinkedIn</a>
    </div>
  `;
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
      <div class="preview-surface" id="${previewSurfaceId(file)}" data-preview-surface></div>
      ${documentActions(file)}
    </div>
  `;
}

export async function mountPreviewContent(file, root = document) {
  if (!file) {
    return;
  }

  const surface = root.querySelector("[data-preview-surface]");
  if (!surface) {
    return;
  }

  if (!file.previewable) {
    surface.innerHTML = `<p class="muted">Questo formato non supporta anteprima incorporata. Aprilo nel viewer dedicato o scaricalo.</p>`;
    return;
  }

  if (file.previewType === "pdf") {
    const embedUrl = getEmbedUrl(file);
    surface.innerHTML = `<iframe title="Preview ${escapeHtml(file.name)}" src="${embedUrl}"></iframe>`;
    return;
  }

  if (file.extension === ".docx") {
    surface.innerHTML = `<div class="preview-loading">Carico documento Word...</div>`;

    try {
      const mammoth = await getMammothModule();
      const arrayBuffer = await fetchFileBuffer(file);
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh"
          ]
        }
      );
      const messages = filteredMammothMessages(result.messages)
        .map((message) => escapeHtml(message.message))
        .join(" ");
      const docxHtml = enhanceDocxHtml(result.value);

      surface.innerHTML = `
        <div class="office-preview">
          <div class="office-preview-body docx-preview-body">${docxHtml || "<p class=\"muted\">Documento vuoto.</p>"}</div>
          ${messages ? `<p class="office-preview-note">${messages}</p>` : ""}
        </div>
      `;
    } catch (error) {
      surface.innerHTML = `
        <div class="office-preview-error">
          <p class="muted">Non sono riuscito a renderizzare questo file DOCX nel browser.</p>
          <p class="muted">${escapeHtml(error.message)}</p>
        </div>
      `;
    }

    return;
  }

  if (file.extension === ".xlsx" || file.extension === ".xls") {
    surface.innerHTML = `<div class="preview-loading">Carico foglio Excel...</div>`;

    try {
      const xlsx = await getXlsxModule();
      const arrayBuffer = await fetchFileBuffer(file);
      const workbook = xlsx.read(arrayBuffer, { type: "array" });
      const tabsMarkup = workbook.SheetNames.map((sheetName, index) => `
        <button
          class="sheet-tab${index === 0 ? " is-active" : ""}"
          type="button"
          data-sheet-tab="${escapeHtml(sheetName)}"
        >
          ${escapeHtml(sheetName)}
        </button>
      `).join("");

      const sheetsMarkup = workbook.SheetNames.map((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetHtml = xlsx.utils.sheet_to_html(worksheet, { editable: false });
        return `
          <section
            class="sheet-preview${index === 0 ? " is-active" : ""}"
            data-sheet-panel="${escapeHtml(sheetName)}"
            ${index === 0 ? "" : "hidden"}
          >
            <h3>${escapeHtml(sheetName)}</h3>
            <div class="sheet-preview-table">${sheetHtml}</div>
          </section>
        `;
      }).join("");

      surface.innerHTML = `
        <div class="office-preview office-preview-spreadsheet">
          <div class="sheet-tabs">${tabsMarkup}</div>
          ${sheetsMarkup}
        </div>
      `;

      surface.querySelectorAll("[data-sheet-tab]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = button.getAttribute("data-sheet-tab");

          surface.querySelectorAll("[data-sheet-tab]").forEach((entry) => {
            entry.classList.toggle("is-active", entry.getAttribute("data-sheet-tab") === target);
          });

          surface.querySelectorAll("[data-sheet-panel]").forEach((panel) => {
            const isTarget = panel.getAttribute("data-sheet-panel") === target;
            panel.hidden = !isTarget;
            panel.classList.toggle("is-active", isTarget);
          });
        });
      });
    } catch (error) {
      surface.innerHTML = `
        <div class="office-preview-error">
          <p class="muted">Non sono riuscito a renderizzare questo file Excel nel browser.</p>
          <p class="muted">${escapeHtml(error.message)}</p>
        </div>
      `;
    }

    return;
  }

  if (file.previewType === "office") {
    const embedUrl = getEmbedUrl(file);
    surface.innerHTML = `<iframe title="Preview ${escapeHtml(file.name)}" src="${embedUrl}"></iframe>`;
    return;
  }

  surface.innerHTML = `<p class="muted">Questo formato non supporta anteprima incorporata. Aprilo nel viewer dedicato o scaricalo.</p>`;
}
