# Zdravý Projekt — Design System

A working brand kit for **Zdravý projekt s. r. o.**, a Bratislava-based meal service that cooks healthy, balanced, kid-first food for kindergartens, schools, families and individuals. The brand is the merger of two well-loved predecessors — **Zdravé Brušká** (homes & families) and **Zdravý Dom** (schools & kindergartens) — and this design system carries forward the warmth and earthiness of both.

> *„To najlepšie zo Zdravého domu a Zdravého bruška. Zdravý projekt otvára novú kapitolu."*
> — Hero copy, [zdravyprojekt.sk](https://zdravyprojekt.sk)

---

## Index

| File | Purpose |
|---|---|
| [`colors_and_type.css`](colors_and_type.css) | All CSS custom properties — colors, fonts, type scale, radii, shadows, spacing |
| [`SKILL.md`](SKILL.md) | Cross-compatible skill manifest (works in Claude Code too) |
| [`assets/`](assets/) | Logos, the brand-equation graphic, hero photography, PPTX-extracted PDFs |
| [`fonts/`](fonts/) | Marcellus, Mulish, Poppins TTFs extracted from the brand deck |
| [`preview/`](preview/) | Design-system cards rendered in the DS tab (colors, type, components) |
| [`slides/`](slides/) | A 3-slide deck recreating the PPTX template (Title / Content / Clients) |
| [`ui_kits/website/`](ui_kits/website/) | High-fidelity recreation of the public marketing site |
| [`ui_kits/client_app/`](ui_kits/client_app/) | The React PWA used by parents / kindergartens to order meals |

## Sources used to build this kit

- **Marketing website** — [https://zdravyprojekt.sk/](https://zdravyprojekt.sk/) (canonical brand expression — color, copy tone, structure)
- **PPTX brand deck** — `uploads/Prezentácia bez názvu.pptx` (theme palette, embedded fonts, slide layouts, brand-equation image)
- **Logo PDFs** — `uploads/Logo_final_cierne.pdf` (black mark), `uploads/Logo_final_farba.pdf` (color mark)
- **GitHub repo** — [`tomag-9/zdravy-projekt`](https://github.com/tomag-9/zdravy-projekt) — full-stack ordering app (Django + React PWA). Browse `frontend/src/` for production component source; the `frontend/src/pages/admin/*` layer is a separate admin product (not covered here).
- **Sister sites** — [zdravebrusko.sk](https://zdravebrusko.sk/) and [zdravy-dom.sk](https://zdravy-dom.sk/) (the predecessor brands still live online).

The reader is encouraged to **explore the GitHub repo directly** for higher-fidelity rebuilds of admin pages (meal-plan calendar, diet manager, client list, etc.) — only the most representative client-facing surfaces are reconstructed here.

---

## Brand at a glance

- **Country / language** — Slovakia, primary copy in Slovak (English locale exists on the marketing site).
- **Tagline** — *„To najlepšie z nás."* ("The best of us.") — used on the title slide of the PPTX deck.
- **Mission** — *"Vytvárame chutné, vyvážené a nutrične hodnotné jedlá, ktoré podporujú zdravie, rast a pohodu detí aj dospelých."*
- **Audiences** — (1) Kindergartens & children's facilities (B2B), (2) Families & individuals (D2C).
- **Voices** — co-founders **Janka** & **Vlado**, both quoted on the homepage. The brand speaks in their voice: caring, grandparently, hands-in-the-dirt.
- **Diets** — KLASIK, VEGE, NO MILK, NO MILK / NO GLUTEN, NO GLUTEN, NONONO, MONTE (7 five-week rotations).

---

## Content Fundamentals

### Voice
Warm, grown-up, slightly old-fashioned. Reads like a letter from a careful parent. Sentences are full and unhurried; the brand is never breezy or "fun marketing" — it's serious about food and gentle about everything else.

### Person
- **"My" (we)** for the company — never "I". The team is one organism.
- **"Vám / vaše deti"** (you / your children) for the customer. Formal *vy* in Slovak — never the informal *ty*.
- **No corporate "Our team is excited to…"** — instead the voice is operator-direct: *„Zabezpečujeme kompletné denné stravovanie…"* ("We handle full daily catering…").

### Tone & casing
- **Headlines** are sentence case in body copy, but **diet labels** are caps-locked words like **KLASIK**, **VEGE**, **NO MILK**, **NONONO** — they're chips, not headlines.
- **Sub-brand labels** — *Zdravé Brušká*, *Zdravý Dom*, *Zdravý projekt* — keep their original capitalisation: only "Z" and the first letter of each word are capital. Note: "projekt" stays lowercase in the master brand name.
- **No exclamation marks** in body copy. The brand never shouts.
- **No emoji**, anywhere. The illustration vocabulary (a cherry, an apple, a heart in the wordmark) does the warmth-work that emoji would do elsewhere.

### Sample copy in the brand voice

| Surface | Example |
|---|---|
| Hero | *„To najlepšie zo Zdravého domu a Zdravého bruška. Zdravý projekt otvára novú kapitolu."* |
| Sub-hero | *„Vytvárame chutné, vyvážené a nutrične hodnotné jedlá, ktoré podporujú zdravie, rast a pohodu detí aj dospelých."* |
| Section head | *„Pre koho je Zdravý projekt?"* |
| About blurb | *„Spojili sme to najlepšie z dvoch silných značiek, ktoré ste si obľúbili…"* |
| Founder quote (Janka) | *„Chceme, aby deťom chutilo zdravé jedlo a vytvorili si pozitívny vzťah ku pestrej, sezónnej a lokálnej strave."* |
| Founder quote (Vlado) | *„Staráme sa o zdravé brušká vašich detí. Deti majú v našich jedlách každý deň dostatok čerstvej zeleniny a ovocia."* |
| Operations claim | *„Ako jediný dodávateľ na Slovensku sme s našimi klientmi až 4× denne a každú zložku doručujeme čerstvú tesne pred konzumáciou."* |

### Words the brand uses on repeat
*zdravé, čerstvé, sezónne, lokálne, vyvážené, nutrične hodnotné, kvalitné suroviny, pestré, starostlivosť, dôvera, pre deti, pre rodinu, prevádzka, hygiena, štandard*

### Numbers
Numbers stay numeric (*„4× denne"*, *„5 week"*) — never spelled out.

---

## Visual Foundations

### Color
The palette is **cream + olive + warm clay**, never blue/violet. Three layers:

1. **Cream backgrounds** — `#FBF7E4` (the brand "white"), `#F5F1CD`, `#FEF9F1`. Pages and cards sit on cream, not on white. White itself appears only inside photographs.
2. **Olive greens** — `#173505` (body text), `#425422` (headings), `#72884B` (primary brand green, used in the *Zdravý Dom* wordmark and most UI accents), `#96AE6D` (light sage tint).
3. **Warm accents** — peach (`#F7D09A`, `#F8A57A`), honey (`#FFC95C`), clay/amber (`#C48116`, `#EF9821`), and a single coral-red (`#C92E52`, the *Zdravé Brušká* mark) used as the **hot accent**.

**Rules of thumb**
- Default text is `--green-900` on `--bg-cream`. Never pure black on pure white.
- Use **one** warm accent per layout (peach OR honey OR clay) — never all three together.
- Coral red is the loudest swatch — reserve it for hearts, CTAs you actually want clicked, or the "loved" state. Never for body text.
- Teal `#0097A7` exists for badges and seals — use sparingly.

### Typography
Three-face system:
- **Poppins** — *the display face.* Hero headlines, section heads, founder names, all "names" (`nazvy`). Weights 400/600/700.
- **Mulish** — the everyday body sans. Paragraphs, UI labels, captions, body copy. Weights 400/700.
- **Bagel Fat One** + **Caveat Brush** *(Google Fonts substitutes)* — for the wordmark and any hand-lettered tagline only.
    - ⚠️ **Substitution flag** — the original logo lettering is a proprietary brush face delivered as raster in `assets/brand-equation.png`. We do not have the source font. *Bagel Fat One* is the closest chunky-marker equivalent on Google Fonts; *Caveat Brush* is a thinner script alternate. **Ask the brand owner for the original font file** before shipping anything that imitates the wordmark.

> **Note** — Marcellus shipped inside the PPTX brand deck but the brand owner has confirmed it is **not** part of the live design system. The face has been retired from active use; it ships only in `fonts/Marcellus-Regular.ttf` for archival fidelity to the source deck.

Body line-height is generous (`1.45`–`1.6`) — this is a calm brand, not a dense one.

### Backgrounds
- **Cream parchment** is the default. Use a faint grain or noise (≤3 % alpha) for the homepage hero only.
- **No stock photography.** The brand carries warmth through hand-painted lettering and the embedded fruit/heart marks — not generic food photos. If real photography is needed, source it from the brand owner; never from a stock library.
- **No full-bleed gradients**, no glassmorphism, no abstract shapes. If a section needs structure, it gets a solid cream-soft (`#F5F1CD`) or cream-warm (`#FEF9F1`) panel with a generous radius.

### Borders, radii, shadows
- **Corner radii** lean generous and friendly: cards `--radius-lg` (22 px), buttons `--radius-pill` (999 px) or `--radius-md` (14 px), modal sheets `--radius-xl` (32 px).
- **Borders** are hair-thin olive tints, never gray. `rgba(23, 53, 5, 0.08–0.32)`.
- **Shadows** carry a faint olive cast (R-G-B of the ink, not pure black). Soft and short — like an object resting on parchment, not floating above it.

### Cards
A card is **cream-soft on cream**, no hard border, with `--shadow-sm` and `--radius-lg`. Photo cards may use a slightly larger radius (`--radius-xl`) and `--shadow-md`. Cards do **not** use a colored left accent strip — that's a tropey pattern this brand avoids.

### Buttons & states
- **Primary** — solid `--green-700`, white text, `--radius-pill`, `--shadow-sm`. Hover: shift to `--green-800` + slightly larger shadow. Press: scale `0.98`, no color shift.
- **Secondary** — cream-soft fill, `--green-700` text. No border.
- **Tertiary / ghost** — text-only `--green-700` with a peach `text-decoration` underline that swaps to coral on hover.
- **Destructive** — solid `--coral-600`, white text.
- All buttons share `transition: all 200ms ease`. The motion is **gentle, never bouncy**.

### Hover & press
- Links: underline color swaps from peach (`--peach-500`) to coral (`--coral-600`) — the text color also shifts olive→coral.
- Buttons: shadow grows ~30 %, fill darkens one step.
- Press: `transform: scale(0.98)`.

### Animation
- **Easing** is `cubic-bezier(0.4, 0, 0.2, 1)` (smooth). No bounce, no overshoot.
- Default duration `180–240 ms` for UI, `400–600 ms` for hero/page entries.
- The only "playful" motion allowed is a **gentle scale or wobble on illustrated marks** (apple, cherry, leaf) — never on body text.

### Transparency & blur
Avoid. Use solid cream panels instead. Backdrop blur is reserved for the iOS/Android PWA status bar in `ui_kits/client_app`.

### Layout rules
- Generous side gutters (`--sp-16`/`--sp-20` on desktop).
- Content columns max ~`60ch` for body, ~`28ch` for headlines.
- The site is centrally-aligned for hero content but **left-aligned** for body sections. Avoid centered paragraphs.
- Vertical rhythm follows the 4-px grid (`--sp-*` variables).

### Imagery
- **No stock photography.** The brand's warmth comes from hand-painted lettering and the embedded fruit / heart marks — not generic kitchen photos. If photography is genuinely needed (eg. founder portraits for a press kit), source it from the brand owner, never from a stock library.
- **Brand marks**: hand-painted, slightly irregular, always include a small **fruit/heart** illustration inside one of the letters (apple in the "o" of *Projekt*, heart in the "ý" of *Zdravý*).
- **Partner / supplier logos** appear as a desaturated wall — that's the homepage's "partneri" strip.

---

## Iconography

The brand has **no proprietary icon set**. The marketing site relies on photography and hand-painted lettermarks; the React app uses **Lucide** icons (a thin, two-tone-friendly outline family).

- **Recommended icon family** — [Lucide](https://lucide.dev/) (already a dependency of the client PWA via `lucide-react@0.562.0`). Default stroke width `1.75–2`.
    - On cream backgrounds: stroke `--green-700`. On olive backgrounds: stroke `--bg-cream`.
- **No emoji** — anywhere, ever. Decorative bullets become small filled circles in `--peach-500` or a tiny illustrated cherry.
- **Decorative illustrations** — when an icon-sized visual moment is needed (eg. before a heading), use one of the brand fruit marks:
    - 🍎 apple (vector inside the *Zdravý Dom* wordmark) — primary
    - 🍒 cherry / heart hybrid (inside the *Zdravé Brušká* wordmark) — secondary
    - 🌿 olive leaf — tertiary
    - These should be raster or hand-drawn SVG; **never** render them as Unicode emoji.
- **Brand-equation graphic** — `assets/brand-equation.png` shows how the three wordmarks compose. Use as a one-time hero illustration; do not redraw.
- **Substitution note** — we did not import a custom icon font from the codebase because none exists. Lucide is the codebase's own choice, so this is a *true match*, not a substitution.

---

## Quick links into the kit

- See the **Design System** tab for live cards: colors, type, components, brand marks.
- For a slide-deck preview, open [`slides/index.html`](slides/index.html).
- For a marketing-site walkthrough, open [`ui_kits/website/index.html`](ui_kits/website/index.html).
- For the parent-facing PWA, open [`ui_kits/client_app/index.html`](ui_kits/client_app/index.html).

---

## Caveats & open questions

- **Logo font is a substitute.** Bagel Fat One ≠ the real brand wordmark. Ask for the source file (or a vector logo asset).
- **PDF logos not visually parsed** — `Logo_final_*.pdf` are copied into `assets/` but treated as opaque artifacts. The brand-equation PNG was the readable source.
- **Marketing site is WordPress (Slider Revolution)** — no source code available; the recreation in `ui_kits/website/` is a from-DOM-text reconstruction.
- **Admin product** (the React app's `/admin` routes) is **out of scope** for this kit. It's a productivity surface, not a brand surface.
