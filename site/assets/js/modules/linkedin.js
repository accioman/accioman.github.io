import { escapeHtml } from "./utils.js";

export function renderLinkedInCard(portfolio, linkedin) {
  const site = portfolio.config.site;
  const profileUrl = linkedin?.profileUrl ?? portfolio.config.linkedin.profileUrl;
  const fullName = linkedin?.fullName || site.ownerName;
  const headline = linkedin?.headline || site.role;
  const note = linkedin?.note || "";
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
      <a class="button button-primary" href="${profileUrl}" target="_blank" rel="noreferrer">Profilo LinkedIn</a>
    </div>
  `;
}
