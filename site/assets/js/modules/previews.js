import { escapeHtml } from "./utils.js";
import { getEmbedUrl } from "./documents.js";

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
