import { configureDocumentActions } from "./documents.js";

export function initShell(activePage, portfolio, linkedin) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === activePage) {
      link.classList.add("is-active");
    }
  });

  configureDocumentActions(portfolio?.config?.site?.documentActions || {});

  const linkedinLink = document.getElementById("header-linkedin");
  const headerPrimaryCta = document.getElementById("header-primary-cta");
  if (linkedinLink && linkedin?.profileUrl) {
    linkedinLink.href = linkedin.profileUrl;
  } else if (linkedinLink && portfolio?.config?.linkedin?.profileUrl) {
    linkedinLink.href = portfolio.config.linkedin.profileUrl;
  }

  if (headerPrimaryCta) {
    const siteConfig = portfolio?.config?.site || {};
    const headerCtaConfig = siteConfig.headerPrimaryCta || {};
    const cvPageConfig = siteConfig.cvPage || {};
    const pdfPath = cvPageConfig.pdfPath || "./assets/files/cv-marco-accinno.pdf";

    headerPrimaryCta.textContent = headerCtaConfig.label || "Apri CV";
    headerPrimaryCta.href = headerCtaConfig.href || "./cv.html";

    fetch(pdfPath, { method: "HEAD" })
      .then((response) => {
        if (!response.ok) {
          return;
        }

        headerPrimaryCta.textContent = cvPageConfig.downloadLabel || "Scarica PDF";
        headerPrimaryCta.href = pdfPath;
        headerPrimaryCta.setAttribute("download", "");
      })
      .catch(() => {
        // Fallback already configured to the CV page.
      });
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
    footerMeta.textContent = `Aggiornato ${portfolio.generatedAtLocal}`;
  }
}
