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

export function uniqueValues(items) {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right));
}

export function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0 ? [] : [value];
  }

  return [value];
}

export function formatTemplate(template, values = {}) {
  return String(template ?? "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function setElementText(id, value, fallback = "") {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value || fallback;
  }
}

export function setElementPlaceholder(id, value, fallback = "") {
  const element = document.getElementById(id);
  if (element) {
    element.placeholder = value || fallback;
  }
}

export function setElementLink(id, config, fallbackLabel, fallbackHref) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = config?.label || fallbackLabel;
  element.href = config?.href || fallbackHref;
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
