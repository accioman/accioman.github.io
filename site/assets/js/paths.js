import { loadPayload, initShell, metricCard, renderStatus, mountPreviewContent, escapeHtml, asArray, formatTemplate, setElementText, getDocumentDisplayTitle } from "./common.js";
import { observePdfThumbnails } from "./modules/pdf-thumbnails.js";

const state = {
  page: {},
  certificatesPage: {},
  courseIndex: new Map(),
  activeProgram: null,
  activeCourse: null,
  activeFile: null,
  fullscreenBound: false,
  mobilePreviewBound: false
};

function getCompletionPercent(program) {
  const totalCourses = Number(program.totalCourses) || 0;
  const completedCourses = Number(program.completedCourses) || 0;

  if (totalCourses <= 0) {
    return 0;
  }

  return Math.round((completedCourses / totalCourses) * 100);
}

function formatCountLabel(count, singular, plural = singular) {
  const safeCount = Number(count) || 0;
  return `${safeCount} ${safeCount === 1 ? singular : plural}`;
}

function getCourseCertificate(course) {
  return asArray(course.files).find((file) => file.isCertificate) || null;
}

function getPrimaryCourseFile(course) {
  return getCourseCertificate(course) || asArray(course.files)[0] || null;
}

function getCourseWorkFiles(course) {
  return asArray(course.files).filter((file) => !file.isCertificate);
}

function getCourseKey(program, course) {
  return `${program.id}::${course.id}`;
}

function getSortedCourseFiles(course) {
  const certificate = getCourseCertificate(course);
  const workFiles = getCourseWorkFiles(course);
  return certificate ? [certificate, ...workFiles] : workFiles;
}

function buildCourseDialogHref(programId, courseId) {
  const params = new URLSearchParams(window.location.search);
  params.set("program", programId);
  params.set("course", courseId);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function renderDialogCertificate(course) {
  const certificateFile = getCourseCertificate(course);

  if (!certificateFile) {
    return `
      <div class="canvas-shell path-course-dialog-cert path-course-thumb-placeholder" aria-hidden="true">
        <span class="thumb-badge">${escapeHtml(state.page.certificateBadgeLabel || state.certificatesPage.badgeLabel || "Certificato")}</span>
        <div class="path-course-thumb-empty">${escapeHtml(state.page.certificateUnavailableLabel || "Non disponibile")}</div>
      </div>
    `;
  }

  return `
    <button class="path-course-dialog-cert-button" type="button" data-dialog-file="${escapeHtml(certificateFile.relativePath)}">
      <div class="canvas-shell path-course-dialog-cert">
        <span class="thumb-badge">${escapeHtml(state.page.certificateBadgeLabel || state.certificatesPage.badgeLabel || "Certificato")}</span>
        <canvas data-pdf="${certificateFile.webPath}"></canvas>
        <div class="thumb-loading">${escapeHtml(state.page.thumbnailLoadingLabel || state.certificatesPage.thumbnailLoadingLabel || "Carico miniatura...")}</div>
      </div>
    </button>
  `;
}

function renderDialogFileButton(file, isActive) {
  return `
    <button class="file-button path-course-dialog-file-button${isActive ? " is-active" : ""}" type="button" data-dialog-file="${escapeHtml(file.relativePath)}">
      <strong>${escapeHtml(getDocumentDisplayTitle(file))}</strong>
      <div class="meta-line path-course-dialog-file-meta">
        <span class="info-chip">${escapeHtml(file.kindLabel)}</span>
      </div>
    </button>
  `;
}

function renderDialogPreview(file) {
  if (!file) {
    return `
      <div class="path-course-dialog-preview-shell">
        <div class="path-course-dialog-preview-toolbar">
          <button class="button button-secondary button-compact path-course-dialog-preview-toggle hidden" type="button" id="path-course-dialog-preview-toggle">Schermo intero</button>
        </div>
        <div class="preview-card path-course-dialog-preview-card">
          <p class="muted">Questo corso non ha ancora materiali consultabili.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="path-course-dialog-preview-shell">
      <div class="path-course-dialog-preview-toolbar">
        <button class="button button-secondary button-compact path-course-dialog-preview-toggle" type="button" id="path-course-dialog-preview-toggle">
          ${escapeHtml(state.page.previewFullscreenLabel || "Schermo intero")}
        </button>
      </div>
      <div class="preview-card path-course-dialog-preview-card">
        <div class="preview-surface path-course-dialog-preview-surface" data-preview-surface></div>
      </div>
    </div>
  `;
}

function getPreviewPanel() {
  return document.getElementById("path-course-dialog-preview");
}

function useMobilePreviewOverlay() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function getMobilePreviewOverlay() {
  return document.getElementById("path-mobile-preview-overlay");
}

function getMobilePreviewFrame() {
  return document.getElementById("path-mobile-preview-frame");
}

function renderMobilePreview(file) {
  if (!file) {
    return `
      <div class="path-mobile-preview-top">
        <div class="path-mobile-preview-copy">
          <p class="panel-label">Anteprima</p>
          <h2>Nessun file selezionato</h2>
        </div>
        <button class="button button-secondary button-compact" type="button" id="path-mobile-preview-close">Chiudi</button>
      </div>
      <div class="preview-card path-mobile-preview-card">
        <p class="muted">Questo corso non ha ancora materiali consultabili.</p>
      </div>
    `;
  }

  return `
    <div class="path-mobile-preview-top">
      <div class="path-mobile-preview-copy">
        <p class="panel-label">Anteprima</p>
        <h2>${escapeHtml(getDocumentDisplayTitle(file))}</h2>
      </div>
      <button class="button button-secondary button-compact" type="button" id="path-mobile-preview-close">Chiudi</button>
    </div>
    <div class="preview-card path-mobile-preview-card">
      <div class="preview-surface path-mobile-preview-surface" data-preview-surface></div>
    </div>
  `;
}

function isPreviewFullscreen() {
  return document.fullscreenElement === getPreviewPanel();
}

function canUsePreviewFullscreen() {
  const panel = getPreviewPanel();
  return Boolean(
    !useMobilePreviewOverlay() &&
    state.activeFile?.previewable &&
    panel &&
    typeof panel.requestFullscreen === "function"
  );
}

function updatePreviewFullscreenButton() {
  const button = document.getElementById("path-course-dialog-preview-toggle");
  if (!button) {
    return;
  }

  const available = canUsePreviewFullscreen();
  button.hidden = !available;
  button.disabled = !available;
  button.textContent = isPreviewFullscreen()
    ? (state.page.previewExitFullscreenLabel || "Esci dallo schermo intero")
    : (state.page.previewFullscreenLabel || "Schermo intero");
}

async function togglePreviewFullscreen() {
  const panel = getPreviewPanel();
  if (!panel || !canUsePreviewFullscreen()) {
    return;
  }

  try {
    if (isPreviewFullscreen()) {
      if (typeof document.exitFullscreen === "function") {
        await document.exitFullscreen();
      }
      return;
    }

    await panel.requestFullscreen();
  } catch (error) {
    console.error("Impossibile attivare lo schermo intero per l'anteprima.", error);
  }
}

function bindPreviewFullscreenToggle() {
  const button = document.getElementById("path-course-dialog-preview-toggle");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    void togglePreviewFullscreen();
  });

  updatePreviewFullscreenButton();
}

function bindFullscreenState() {
  if (state.fullscreenBound) {
    return;
  }

  document.addEventListener("fullscreenchange", updatePreviewFullscreenButton);
  state.fullscreenBound = true;
}

function exitPreviewFullscreenIfNeeded() {
  if (!isPreviewFullscreen()) {
    return;
  }

  if (typeof document.exitFullscreen === "function") {
    void document.exitFullscreen();
  }
}

function closeMobilePreviewOverlay() {
  const overlay = getMobilePreviewOverlay();
  const frame = getMobilePreviewFrame();
  if (!overlay || overlay.hidden) {
    return;
  }

  overlay.hidden = true;
  document.body.classList.remove("path-mobile-preview-open");
  if (frame) {
    frame.innerHTML = "";
  }
}

async function openMobilePreviewOverlay(file) {
  const overlay = getMobilePreviewOverlay();
  const frame = getMobilePreviewFrame();
  if (!overlay || !frame) {
    return;
  }

  frame.innerHTML = renderMobilePreview(file);
  overlay.hidden = false;
  document.body.classList.add("path-mobile-preview-open");
  frame.querySelector("#path-mobile-preview-close")?.addEventListener("click", closeMobilePreviewOverlay);
  await mountPreviewContent(file, frame);
}

function bindMobilePreviewOverlay() {
  if (state.mobilePreviewBound) {
    return;
  }

  const overlay = getMobilePreviewOverlay();
  if (!overlay) {
    return;
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeMobilePreviewOverlay();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobilePreviewOverlay();
    }
  });

  window.addEventListener("resize", () => {
    if (!useMobilePreviewOverlay()) {
      closeMobilePreviewOverlay();
    }
  });

  state.mobilePreviewBound = true;
}

function syncCourseDialogUrl({ replace = false } = {}) {
  if (!state.activeProgram || !state.activeCourse) {
    return;
  }

  const nextUrl = buildCourseDialogHref(state.activeProgram.id, state.activeCourse.id);
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl === currentUrl) {
    return;
  }

  if (replace) {
    window.history.replaceState({}, "", nextUrl);
    return;
  }

  window.history.pushState({}, "", nextUrl);
}

function clearCourseDialogUrl({ replace = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("program") && !params.has("course")) {
    return;
  }
  params.delete("program");
  params.delete("course");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;

  if (replace) {
    window.history.replaceState({}, "", nextUrl);
    return;
  }

  window.history.pushState({}, "", nextUrl);
}

function updateDialogFileSelection() {
  const dialog = document.getElementById("path-course-dialog");
  const activeRelativePath = state.activeFile?.relativePath || "";
  if (!dialog) {
    return;
  }

  dialog.querySelectorAll("[data-dialog-file]").forEach((button) => {
    const isActive = button.getAttribute("data-dialog-file") === activeRelativePath;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function bindDialogFileButtons(allFiles) {
  const dialog = document.getElementById("path-course-dialog");
  if (!dialog) {
    return;
  }

  dialog.querySelectorAll("[data-dialog-file]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextFile = allFiles.find((file) => file.relativePath === button.getAttribute("data-dialog-file")) || null;
      if (!nextFile) {
        return;
      }

      const isSameFile = nextFile.relativePath === state.activeFile?.relativePath;
      state.activeFile = nextFile;

      if (useMobilePreviewOverlay()) {
        updateDialogFileSelection();
        await openMobilePreviewOverlay(nextFile);
        return;
      }

      if (isSameFile) {
        return;
      }

      await refreshCourseDialogPreview();
    });
  });
}

async function refreshCourseDialogPreview() {
  const previewRoot = document.getElementById("path-course-dialog-preview");
  if (!previewRoot) {
    return;
  }

  if (useMobilePreviewOverlay()) {
    previewRoot.innerHTML = `
      <div class="path-course-dialog-mobile-note">
        <p class="muted">Su mobile tocca certificato o file per aprire l'anteprima a schermo intero.</p>
      </div>
    `;
    updateDialogFileSelection();
    return;
  }

  previewRoot.innerHTML = renderDialogPreview(state.activeFile);
  bindPreviewFullscreenToggle();
  updateDialogFileSelection();
  await mountPreviewContent(state.activeFile, previewRoot);
  updatePreviewFullscreenButton();
}

async function syncCourseDialog() {
  const dialog = document.getElementById("path-course-dialog");
  if (!dialog || !state.activeCourse || !state.activeProgram) {
    return;
  }

  const allFiles = getSortedCourseFiles(state.activeCourse);
  const workFiles = getCourseWorkFiles(state.activeCourse);
  state.activeFile = state.activeFile || getPrimaryCourseFile(state.activeCourse);

  document.getElementById("path-course-dialog-program").textContent = state.activeProgram.name;
  document.getElementById("path-course-dialog-title").textContent = state.activeCourse.name;
  document.getElementById("path-course-dialog-summary").textContent = state.activeCourse.summary || state.page.dialogSummaryFallback || "Certificato e materiali del corso consultabili direttamente nel dialog.";
  document.getElementById("path-course-dialog-meta").innerHTML = `
    ${state.activeCourse.category ? `<span class="info-chip">${escapeHtml(state.activeCourse.category)}</span>` : ""}
    ${renderStatus(state.activeCourse.status)}
    ${state.activeCourse.certificateCount > 0 ? `<span class="info-chip">${escapeHtml(formatCountLabel(state.activeCourse.certificateCount, "certificato", "certificati"))}</span>` : ""}
    ${state.activeCourse.workFileCount > 0 ? `<span class="info-chip">${escapeHtml(formatCountLabel(state.activeCourse.workFileCount, "materiale", "materiali"))}</span>` : ""}
  `;
  document.getElementById("path-course-dialog-certificate").innerHTML = renderDialogCertificate(state.activeCourse);
  document.getElementById("path-course-dialog-files").innerHTML = workFiles.length
    ? workFiles.map((file) => renderDialogFileButton(file, file.relativePath === state.activeFile?.relativePath)).join("")
    : `<p class="muted path-course-dialog-empty">Nessun materiale aggiuntivo per questo corso.</p>`;

  observePdfThumbnails(Array.from(dialog.querySelectorAll(".path-course-dialog-cert canvas")), {
    errorLabel: state.page.thumbnailErrorLabel || state.certificatesPage.thumbnailErrorLabel || "Miniatura non disponibile"
  });

  bindDialogFileButtons(allFiles);
  await refreshCourseDialogPreview();
}

async function openCourseDialog(courseKey, options = {}) {
  const dialog = document.getElementById("path-course-dialog");
  const entry = state.courseIndex.get(courseKey);
  if (!dialog || !entry) {
    return;
  }

  state.activeProgram = entry.program;
  state.activeCourse = entry.course;
  state.activeFile = getPrimaryCourseFile(entry.course);
  await syncCourseDialog();
  if (options.updateHistory !== false) {
    syncCourseDialogUrl({ replace: options.replaceHistory === true });
  }

  if (!dialog.open) {
    dialog.showModal();
  }
}

function bindCourseCards() {
  document.querySelectorAll("[data-course-dialog]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) {
        return;
      }

      void openCourseDialog(card.getAttribute("data-course-dialog"));
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      void openCourseDialog(card.getAttribute("data-course-dialog"));
    });
  });
}

function bindDialog() {
  const dialog = document.getElementById("path-course-dialog");
  if (!dialog) {
    return;
  }

  bindFullscreenState();
  bindMobilePreviewOverlay();
  document.getElementById("path-course-dialog-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    exitPreviewFullscreenIfNeeded();
    closeMobilePreviewOverlay();
    clearCourseDialogUrl({ replace: true });
  });
}

async function openCourseDialogFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const programId = params.get("program");
  const courseId = params.get("course");
  if (!programId || !courseId) {
    return;
  }

  const courseKey = getCourseKey({ id: programId }, { id: courseId });
  if (!state.courseIndex.has(courseKey)) {
    return;
  }

  await openCourseDialog(courseKey, { updateHistory: false, replaceHistory: true });
}

async function main() {
  const { portfolio, linkedin } = await loadPayload();
  initShell("percorsi", portfolio, linkedin);

  state.page = portfolio.config.site.pathsPage || {};
  state.certificatesPage = portfolio.config.site.certificatesPage || {};
  const page = state.page;
  const certificatesPage = state.certificatesPage;
  const stats = portfolio.stats;
  document.title = `${page.title || "Percorsi"} | Portfolio formativo`;
  setElementText("paths-eyebrow", page.eyebrow, "Mappa del portfolio");
  setElementText("paths-title", page.title, "Tutti i percorsi");
  setElementText("paths-metrics-label", page.metricsLabel, "Stato generale");
  setElementText("paths-section-title", page.sectionTitle, "Programmi e corsi");
  document.getElementById("paths-summary").textContent = formatTemplate(
    page.summaryTemplate || "{completed} corsi completati su {total}, con {workFiles} materiali pratici gia consultabili online.",
    {
      completed: stats.totalCompleted,
      total: stats.totalCourses,
      workFiles: stats.totalWorkFiles
    }
  );

  document.getElementById("paths-metrics").innerHTML = [
    metricCard(page.metrics?.completed || "Completati", stats.totalCompleted),
    metricCard(page.metrics?.ready || "Pronti", stats.totalReady),
    metricCard(page.metrics?.inProgress || "In corso", stats.totalInProgress),
    metricCard(page.metrics?.certificates || "Certificati", stats.totalCertificates)
  ].join("");

  document.getElementById("program-list").innerHTML = asArray(portfolio.programs).map((program) => `
    <section class="panel path-program-panel" id="${program.slug}">
      <div class="section-head">
        <div>
          <p class="panel-label">${escapeHtml(program.name)}</p>
          <h2>${escapeHtml(program.completedCourses)}/${escapeHtml(program.totalCourses)} ${escapeHtml(page.programCompletedSuffix || "completati")}</h2>
          ${program.summary ? `<p class="section-copy">${escapeHtml(program.summary)}</p>` : ""}
        </div>
        <div class="detail-list">
          ${asArray(program.tags).map((tag) => `<span class="info-chip">${escapeHtml(tag)}</span>`).join("")}
          <span class="info-chip">${escapeHtml(formatTemplate(page.progressLabelTemplate || "{percent}%", { percent: getCompletionPercent(program) }))}</span>
          <span class="info-chip">${escapeHtml(formatTemplate(page.workFilesLabelTemplate || "{count} materiali", { count: program.workFiles }))}</span>
          <span class="info-chip">${escapeHtml(formatTemplate(page.certificateFilesLabelTemplate || "{count} certificati", { count: program.certificateFiles }))}</span>
        </div>
      </div>
      <div class="card-grid path-course-grid">
        ${asArray(program.courses).map((course) => {
          const courseKey = getCourseKey(program, course);
          state.courseIndex.set(courseKey, { program, course });
          const certificateFile = getCourseCertificate(course);
          const certificateThumb = certificateFile
            ? `
              <div class="path-course-thumb-link" aria-hidden="true">
                <div class="canvas-shell path-course-thumb">
                  <span class="thumb-badge">${escapeHtml(page.certificateBadgeLabel || certificatesPage.badgeLabel || "Certificato")}</span>
                  <canvas data-pdf="${certificateFile.webPath}"></canvas>
                  <div class="thumb-loading">${escapeHtml(page.thumbnailLoadingLabel || certificatesPage.thumbnailLoadingLabel || "Carico miniatura...")}</div>
                </div>
              </div>
            `
            : `
              <div class="canvas-shell path-course-thumb path-course-thumb-placeholder" aria-hidden="true">
                <span class="thumb-badge">${escapeHtml(page.certificateBadgeLabel || certificatesPage.badgeLabel || "Certificato")}</span>
                <div class="path-course-thumb-empty">${escapeHtml(page.certificateUnavailableLabel || "Non disponibile")}</div>
              </div>
            `;

          return `
            <article class="course-card path-course-card${certificateFile ? " has-certificate-thumb" : ""}" tabindex="0" role="button" aria-haspopup="dialog" data-course-dialog="${escapeHtml(courseKey)}">
              <div class="path-course-head">
                ${certificateThumb}
              </div>
              <div class="path-course-copy">
                <h3>${escapeHtml(course.name)}</h3>
              </div>
              <div class="meta-line">
                ${course.category ? `<span class="info-chip">${escapeHtml(course.category)}</span>` : ""}
                ${renderStatus(course.status)}
                ${course.certificateCount > 0 ? `<span class="info-chip">${escapeHtml(formatCountLabel(course.certificateCount, "certificato", "certificati"))}</span>` : ""}
                ${course.workFileCount > 0 ? `<span class="info-chip">${escapeHtml(formatCountLabel(course.workFileCount, "materiale", "materiali"))}</span>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");

  observePdfThumbnails(Array.from(document.querySelectorAll(".path-course-thumb canvas")), {
    errorLabel: page.thumbnailErrorLabel || certificatesPage.thumbnailErrorLabel || "Miniatura non disponibile"
  });
  bindCourseCards();
  bindDialog();
  await openCourseDialogFromLocation();
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h1>Errore di caricamento</h1><p>${error.message}</p></section></main>`;
});
