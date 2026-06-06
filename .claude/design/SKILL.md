---
name: zdravy-projekt-design
description: Use this skill to generate well-branded interfaces, slides and marketing assets for Zdravý Projekt, a Slovak kid-first healthy food service. Contains essential design guidelines, the cream + olive + warm-clay color system, type tokens, Marcellus/Mulish/Poppins font files, brand-equation illustration, the WordPress marketing-site recreation, and the React PWA UI kit for prototyping or production work.
user-invocable: true
---

Read the `README.md` file within this skill first — it covers brand background, content tone, visual foundations, iconography, and the file index.

Other key files:
- `colors_and_type.css` — drop-in CSS custom properties for color, fonts, radii, shadows, spacing, and ready-made semantic styles for `h1`/`h2`/`body`/`p`/`blockquote`. Import this at the top of any new HTML artifact.
- `fonts/` — Marcellus, Mulish and Poppins TTFs extracted from the brand deck. Reference these directly via the `@font-face` rules already in `colors_and_type.css`.
- `assets/` — logo PDFs, the brand-equation PNG, and one hero food photograph. Copy any of these into your design when needed.
- `preview/` — small cards showing the live tokens (use as visual reference).
- `slides/` — a 3-slide template (title, content, clients) matching the source PPTX.
- `ui_kits/website/` — a recreation of the public marketing site at zdravyprojekt.sk.
- `ui_kits/client_app/` — the React PWA used by parents and kindergartens to order meals.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets out into the new artifact's own folder and produce static HTML files for the user to view. Cream `#FBF7E4` is the page background — never default-white. Use Marcellus for editorial headings, Mulish for body, Poppins for buttons/chips, and the marker face (Bagel Fat One on Google Fonts as a substitute) only for the brand wordmark — never as a body or heading face.

If working on production code (e.g. against the existing React/Tailwind app in `tomag-9/zdravy-projekt`), copy the tokens from `colors_and_type.css` into your Tailwind theme config and read this README to internalise the tone-of-voice rules — especially the use of formal Slovak *vy*, no emoji, no exclamation marks, sub-brand capitalisation.

If the user invokes this skill without further guidance, ask them what they want to build or design, then ask focused questions about: (1) which audience surface (marketing site, parent app, admin, slide deck, packaging?), (2) which language (Slovak default, English available), (3) what diet labels or product chips appear, (4) whether real founder quotes (Janka, Vlado) are involved. Then act as an expert designer who outputs HTML artifacts *or* production code depending on the need.
