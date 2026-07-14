# Website UI Kit — zdravyprojekt.sk

A high-fidelity recreation of the public marketing website at [https://zdravyprojekt.sk](https://zdravyprojekt.sk).

The live site is a **WordPress** build using Slider Revolution — no public source code, so this kit is a structural + visual reconstruction from the live DOM, brand-equation graphic, and PPTX colour theme.

## Files

- `index.html` — the homepage, single-page scroll
- `Header.jsx` — top bar with language switcher and basket
- `Hero.jsx` — the brand-equation hero with headline
- `Audiences.jsx` — "Pre koho je Zdravý projekt?" — two side-by-side cards
- `DietPicker.jsx` — the 7 caps-locked diet chips + an active diet preview pane
- `Founders.jsx` — Janka & Vlado quotes
- `Partners.jsx` — partner logo wall
- `Footer.jsx` — about + contact + sub-brand chips

## What's reconstructed vs. invented

- **Reconstructed from live DOM:** headlines, section titles, copy, diet labels, founder names, address, sub-brand links.
- **Reconstructed from brand assets:** colors, fonts, logo equation graphic, hero photography.
- **Invented:** diet-preview pane (the live site renders flat PDFs); partner card layout; layout density and spacing.
- **Omitted:** WooCommerce cart, GDPR/cookies consent dialog, the WPML language toggle.
