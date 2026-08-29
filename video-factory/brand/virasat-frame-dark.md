---
version: alpha
name: Virasat — Frame (video / frame layer), dark theme
description: >
  Video-first companion to the Virasat brand system (see virasat-brand-source.html),
  dark-mode variant (mirrors the site's own `.dark` class overrides). The unit is the
  frame (1920×1080; 1080×1920 and 1080×1080 also documented). Atoms are identical and
  sacred — deep-ink canvas, a lighter forest-green (primary-300) as the only accent for
  sufficient contrast on dark (the brand's own dark-mode CSS makes this exact substitution
  for links), warm parchment text, Fraunces serif for headlines/display (2026-08-29,
  replacing Merriweather — variable weight + optical sizing, more character at large
  display sizes; web-app fonts were not brand-locked, this swap applies there too),
  Space Grotesk for body/UI/numerals, Space Mono for eyebrows/tags/labels, and the
  brand's own soft shadow (kept subtle on dark — this system does not ban shadows).
unit: the frame — 1920×1080 primary; 1080×1920 and 1080×1080 documented
principle: atoms are sacred · composition is free · numbers come from the script · one accent only (forest green) — never introduce a second hue for emphasis; heritage gold is reserved, not a default accent

colors:
  bg: "#1d1c16"
  primary: "#6ec1a3"
  text: "#f5ecd5"
  text-muted: "#e0d4a8"
  text-light: "#b0ae98"
  accent-light: "rgba(110,193,163,0.08)"
  accent-medium: "rgba(110,193,163,0.15)"
  border: "#48463a"
  card-bg: "rgba(110,193,163,0.04)"
  card-elevated: "#332f28"
  positive: "#4ebdb7"
  negative: "#e87560"
  accent-gold-reserved: "#f0bc1e"

shadow:
  card-md: "0 8px 16px -4px rgba(0,0,0,0.35), 0 4px 8px -4px rgba(0,0,0,0.22)"

radii:
  pill: "100px"
  card-lg: "12px"
  card-md: "10px"
  card-sm: "8px"
  bar: "6px"
  circle: "50%"

typography:
  # — reading ramp (Space Grotesk body, Space Mono chrome) —
  body:      { fontFamily: "Space Grotesk", cqw: 0.85, weight: 400, lineHeight: 1.6, color: "text-muted" }
  h4-eyebrow:{ fontFamily: "Space Mono", cqw: 0.8, weight: 600, tracking: "0.08em", upper: true, color: "primary" }
  tag:       { fontFamily: "Space Mono", px: 12, weight: 500, color: "primary" }
  counter:   { fontFamily: "Space Mono", px: 13, weight: 500, tracking: "0.05em", color: "text-muted" }
  # — display / editorial ramp (Fraunces serif headlines, Space Grotesk numerals) —
  # Sizes bumped 2026-08-29 toward the "hero text 60-80% of frame width" floor in
  # hyperframes-creative/references/video-composition.md — the old cqw values (h1 4.0,
  # h2 2.6, h3 1.25...) rendered well under the 64-120px headline floor on a 1080-wide
  # portrait canvas. cqw is % of the frame's own container width, so these values hold
  # proportionally across portrait/landscape/square.
  h3:        { fontFamily: "Fraunces", opticalSizing: auto, cqw: 3.0, weight: 700, lineHeight: 1.25, tracking: "-0.01em", color: "text" }
  stat-num:  { fontFamily: "Space Grotesk", cqw: 3.2, weight: 700, lineHeight: 1.0, color: "primary" }
  blockquote:{ fontFamily: "Fraunces", opticalSizing: auto, cqw: 4.4, weight: 500, italic: true, lineHeight: 1.25, color: "text" }
  h2:        { fontFamily: "Fraunces", opticalSizing: auto, cqw: 5.8, weight: 700, lineHeight: 1.1, tracking: "-0.015em", color: "text" }
  metric-value:{ fontFamily: "Space Grotesk", cqw: 6.5, weight: 700, lineHeight: 1.0, color: "primary" }
  h1:        { fontFamily: "Fraunces", opticalSizing: auto, cqw: 8.2, weight: 700, lineHeight: 1.02, tracking: "-0.02em", color: "text" }
  quote-mark:{ fontFamily: "Fraunces", opticalSizing: auto, cqw: 14.0, weight: 600, lineHeight: 0.5, color: "primary", opacity: 0.18 }

spacing:
  pad-x: "5cqw"
  pad-y-top: "5cqw"
  gap-cards: "1.4cqw"
  accent-line: "60px × 4px"

components:
  card-tinted:
    backgroundColor: "{colors.card-bg}"
    border: "1.5px solid {colors.border}"
    rounded: "{radii.card-lg}"
    shadow: "{shadow.card-md}"
    description: "Universal content card, on the brand's own elevated card-bg (#332f28) or the tinted primary wash — carries the brand's signature soft shadow (kept subtle on dark)."
  metric-card:
    backgroundColor: "{colors.card-elevated}"
    border: "1.5px solid {colors.border}"
    rounded: "{radii.card-lg}"
    shadow: "{shadow.card-md}"
    typography: "{typography.metric-value} ({colors.primary}) + {typography.h4-eyebrow} label + {typography.body} description"
    description: "+ optional inline ↑/↓ change chip ({colors.positive}/{colors.negative} text, no fill)."
  tag-pill:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.primary}"
    rounded: "{radii.pill}"
    typography: "{typography.tag}"
    description: "Top-right of the slide-header, or a category eyebrow chip."
  cta-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{radii.pill}"
    typography: "Space Grotesk 600"
    shadow: "{shadow.card-md} on hover only"
    description: "The one solid element — reserve for the single most important action per video (e.g. the closing waitlist CTA)."

fonts_google:
  - "Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900"
  - "Space Grotesk:wght@400;500;600;700"
  - "Space Mono:ital,wght@0,400;0,700"
