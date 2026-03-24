import { configureDocumentActions } from "./documents.js";

export function initShell(activePage, portfolio, linkedin) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === activePage) {
      link.classList.add("is-active");
    }
  });

  configureDocumentActions(portfolio?.config?.site?.documentActions || {});

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
