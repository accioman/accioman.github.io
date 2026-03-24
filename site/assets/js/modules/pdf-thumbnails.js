import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

const thumbnailOptions = new WeakMap();

const thumbObserver = typeof IntersectionObserver === "undefined"
  ? null
  : new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      void renderPdfThumbnail(entry.target);
      thumbObserver.unobserve(entry.target);
    }
  }, { rootMargin: "200px" });

export async function renderPdfThumbnail(canvas) {
  const options = thumbnailOptions.get(canvas) || {};
  const holder = canvas.closest(".canvas-shell");
  const loading = holder?.querySelector(".thumb-loading");

  try {
    const pdf = await pdfjsLib.getDocument(canvas.dataset.pdf).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });

    if (holder) {
      holder.style.aspectRatio = `${baseViewport.width} / ${baseViewport.height}`;
    }

    const scale = Math.min(300 / baseViewport.width, 220 / baseViewport.height);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    loading?.remove();
  } catch (error) {
    if (loading) {
      loading.textContent = options.errorLabel || "Miniatura non disponibile";
    }
    console.error(error);
  }
}

export function observePdfThumbnails(canvases, options = {}) {
  canvases.forEach((canvas) => {
    thumbnailOptions.set(canvas, options);

    if (thumbObserver) {
      thumbObserver.observe(canvas);
    } else {
      void renderPdfThumbnail(canvas);
    }
  });
}
