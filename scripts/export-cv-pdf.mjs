import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputRoot = process.env.CV_EXPORT_OUTPUT_ROOT
  ? path.resolve(process.env.CV_EXPORT_OUTPUT_ROOT)
  : path.join(rootDir, ".site");
const outputPdf = process.env.CV_EXPORT_OUTPUT_PDF
  ? path.resolve(process.env.CV_EXPORT_OUTPUT_PDF)
  : path.join(outputRoot, "assets", "files", "cv-marco-accinno.pdf");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("CV PDF export skipped: Playwright non disponibile.");
  process.exit(0);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function getMimeType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function createStaticServer(rootPath) {
  return createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
      const safePath = requestPath === "/" ? "/index.html" : requestPath;
      const absolutePath = path.join(rootPath, safePath);
      const resolvedPath = path.resolve(absolutePath);

      if (!resolvedPath.startsWith(path.resolve(rootPath))) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const stat = await fs.stat(resolvedPath);
      const filePath = stat.isDirectory() ? path.join(resolvedPath, "index.html") : resolvedPath;
      const fileBuffer = await fs.readFile(filePath);

      response.writeHead(200, {
        "Content-Type": getMimeType(filePath),
        "Cache-Control": "no-cache"
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      response.end(fileBuffer);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}

await fs.mkdir(path.dirname(outputPdf), { recursive: true });

const server = createStaticServer(outputRoot);
await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const port = typeof address === "object" && address ? address.port : 4173;
const targetUrl = `http://127.0.0.1:${port}/cv.html`;

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 2000 } });
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0"
    }
  });
  console.log(`CV PDF exported to ${outputPdf}`);
} finally {
  if (browser) {
    await browser.close();
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
