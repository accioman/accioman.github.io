# Site Architecture

## Overview

This repository publishes a static portfolio website through GitHub Pages.
The final artifact is generated into `.site/` by `scripts/build-pages.ps1`.

## Build Flow

1. `scripts/render-site-pages.ps1`
2. `scripts/generate-site-data.ps1`
3. `scripts/sync-linkedin-profile.ps1`
4. `scripts/build-pages.ps1`
5. GitHub Actions deploys `.site/`

### Build modules

- `scripts/portfolio-data.ps1`: thin entrypoint that loads portfolio modules
- `scripts/modules/portfolio-core.ps1`: config, formatting and path helpers
- `scripts/modules/portfolio-scan.ps1`: filesystem scan and course/file extraction
- `scripts/modules/portfolio-snapshot.ps1`: final snapshot assembly for frontend JSON
- `scripts/render-site-pages.ps1`: renders final HTML pages from templates and partials

## Data Sources

- `readme.config.json`: editorial configuration, owner profile, LinkedIn static data
- `content-metadata.json`: manual overrides for program names, summaries, priorities and featured content
- repository folders/files: courses, certificates, project materials
- `site/assets/data/site-data.json`: generated snapshot used by the frontend
- `site/assets/data/linkedin-profile.json`: generated static LinkedIn payload

## Frontend Structure

### HTML templates

- `site/templates/layout.html`: base page layout
- `site/templates/partials/site-header.html`: shared header/navigation
- `site/templates/partials/site-footer.html`: shared footer shell
- `site/templates/pages.json`: page manifest for titles, descriptions, scripts and navigation
- `site/templates/pages/*.html`: page-specific main content fragments

### Page entrypoints

- `site/assets/js/index.js`
- `site/assets/js/paths.js`
- `site/assets/js/certificates.js`
- `site/assets/js/projects.js`
- `site/assets/js/viewer.js`
- `site/assets/js/archive-hub.js`

### Shared modules

- `site/assets/js/modules/data.js`: loads generated JSON payloads
- `site/assets/js/modules/shell.js`: shared header/footer shell setup
- `site/assets/js/modules/utils.js`: formatting and display helpers
- `site/assets/js/modules/documents.js`: document cards, viewer links, preview shells
- `site/assets/js/modules/previews.js`: PDF/DOCX/XLSX preview rendering
- `site/assets/js/modules/linkedin.js`: LinkedIn card rendering
- `site/assets/js/common.js`: compatibility facade that re-exports shared APIs

## CSS Structure

- `site/assets/css/styles.css`: main theme, layout and generic components
- `site/assets/css/profile.css`: LinkedIn/profile presentation
- `site/assets/css/previews.css`: document preview and viewer styles

`styles.css` remains the only stylesheet linked by pages and imports the specialized files.

## Extension Guidelines

### Add a new page

1. Add a page fragment in `site/templates/pages/<page>.html`
2. Register it in `site/templates/pages.json`
3. Add `site/assets/js/<page>.js`
4. Run `scripts/render-site-pages.ps1` or `scripts/build-pages.ps1`
5. Reuse shared functions from `site/assets/js/common.js`
6. Keep page-specific styling minimal; prefer shared CSS files

### Add a new preview type

1. Extend `Get-FileKindInfo` in `scripts/portfolio-data.ps1`
2. Add frontend rendering logic in `site/assets/js/modules/previews.js`
3. Add dedicated styles in `site/assets/css/previews.css`

### Add manual content overrides

Prefer `content-metadata.json` for program/course curation and `readme.config.json` for site/profile content.

### Update navigation or home/archive editorial blocks

- navigation labels and visibility live in `site/templates/pages.json`
- home and archive CTA/section copy live in `readme.config.json` under `site.homePage` and `site.archivePage`
- internal page microcopy for `percorsi`, `certificati`, `progetti` and `viewer` lives in `readme.config.json` under `site.pathsPage`, `site.certificatesPage`, `site.projectsPage` and `site.viewerPage`
- shared document action labels live in `readme.config.json` under `site.documentActions`
