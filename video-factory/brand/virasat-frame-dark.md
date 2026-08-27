---
version: alpha
name: Virasat — Frame (video / frame layer), dark theme
description: >
  Video-first companion to the Virasat brand system (see virasat-brand-source.html),
  dark-mode variant (mirrors the site's own `.dark` class overrides). The unit is the
  frame (1920×1080; 1080×1920 and 1080×1080 also documented). Atoms are identical and
  sacred — deep-ink canvas, a lighter forest-green (primary-300) as the only accent for
  sufficient contrast on dark (the brand's own dark-mode CSS makes this exact substitution
  for links), warm parchment text, Merriweather serif for headlines/display, Space Grotesk
  for body/UI/numerals, Space Mono for eyebrows/tags/labels, and the brand's own soft
  shadow (kept subtle on dark — this system does not ban shadows).
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
  # — display / editorial ramp (Merriweather serif headlines, Space Grotesk numerals) —
  h3:        { fontFamily: "Merriweather", cqw: 1.25, weight: 700, lineHeight: 1.3, tracking: "-0.01em", color: "text" }
  stat-num:  { fontFamily: "Space Grotesk", cqw: 1.9, weight: 700, lineHeight: 1.0, color: "primary" }
  blockquote:{ fontFamily: "Merriweather", cqw: 2.2, weight: 400, italic: true, lineHeight: 1.35, color: "text" }
  h2:        { fontFamily: "Merriweather", cqw: 2.6, weight: 700, lineHeight: 1.15, tracking: "-0.01em", color: "text" }
  metric-value:{ fontFamily: "Space Grotesk", cqw: 3.0, weight: 700, lineHeight: 1.0, color: "primary" }
  h1:        { fontFamily: "Merriweather", cqw: 4.0, weight: 700, lineHeight: 1.1, tracking: "-0.01em", color: "text" }
  quote-mark:{ fontFamily: "Merriweather", cqw: 8.0, weight: 700, lineHeight: 0.5, color: "primary", opacity: 0.18 }

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
  - "Merriweather:ital,wght@0,400;0,700;1,400"
  - "Space Grotesk:wght@400;500;600;700"
  - "Space Mono:ital,wght@0,400;0,700"
