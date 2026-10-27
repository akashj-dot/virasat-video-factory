// v2 component kit. Scenes are authored in storyboard.mjs as small build(s) functions
// that place components and fire their animations on SPOKEN WORDS:
//
//   build(s) {
//     const card = s.form({ x: 60, y: 80, w: 840, title: "Bank account", fields: [...] });
//     card.in("account");                 // appears as "account" is said
//     card.fill(0, "Ramesh");             // types field 0 as "Ramesh" is said
//     card.flag(1, "nominee", "bad");     // flags the empty nominee field on "nominee"
//   }
//
// Cue specs (resolved against timings.json, relative to the scene start):
//   "nominee"      first word in this scene matching (caption or spoken form)
//   "nominee#2"    second occurrence        "nominee.end"  when that word ends
//   "L3"           start of line 3          "L3.end"       end of line 3
//   "L3:paisa"     word inside line 3       number         seconds from scene start
//   [cue, +0.2]    any of the above plus an offset
//
// Everything compiles to static HTML + one paused GSAP timeline per scene (seek-safe,
// deterministic, lint-friendly). Positions are in canvas px relative to the stage box
// (s.stage.w x s.stage.h); sizes are design px that scale with the canvas (s.u).

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r3 = (n) => Math.round(n * 1000) / 1000;
const J = JSON.stringify;
export const normWord = (w) => String(w).normalize("NFC").toLowerCase().replace(/\*/g, "").replace(/[\p{P}\p{S}़]/gu, "");

// *word* -> accent-coloured keyword span
const rich = (t, cls = "k-key") => esc(t).replace(/\*([^*]+)\*/g, `<span class="${cls}">$1</span>`);

export const THEMES = {
  dark: {
    bg: "#1d1c16", bg2: "#25231c", card: "#2b2821", card2: "#332f28", border: "#48463a",
    text: "#f5ecd5", muted: "#e0d4a8", faint: "#b0ae98", primary: "#6ec1a3",
    primarySoft: "rgba(110,193,163,0.14)", neg: "#e87560", negSoft: "rgba(232,117,96,0.14)",
    gold: "#f0bc1e", shadow: "0 18px 40px -12px rgba(0,0,0,0.55), 0 6px 14px -6px rgba(0,0,0,0.35)",
    grid: "rgba(245,236,213,0.045)", glow: "rgba(110,193,163,0.10)",
  },
  light: {
    bg: "#faf6ea", bg2: "#f3eddb", card: "#ffffff", card2: "#f7f2e3", border: "#e0d4a8",
    text: "#1d1c16", muted: "#6b6356", faint: "#9a8352", primary: "#0f7e5b",
    primarySoft: "rgba(16,133,96,0.10)", neg: "#bf3b22", negSoft: "rgba(191,59,34,0.10)",
    gold: "#b8860b", shadow: "0 18px 40px -14px rgba(29,28,22,0.18), 0 6px 14px -6px rgba(29,28,22,0.10)",
    grid: "rgba(29,28,22,0.05)", glow: "rgba(16,133,96,0.08)",
  },
};

// Canvas presets + the three layout bands: chrome strip (top, clear of the logo),
// stage (where scenes draw), captions (above the IG/Reels bottom UI).
export const FORMATS = {
  // 9:16 keeps clear of Instagram Reels UI: header covers ~top 220px, username/caption/audio
  // ~bottom 400px, action buttons the right edge. Logo sits at y 220 (add-logo-overlay.mjs).
  "9:16": { W: 1080, H: 1920, chrome: { y: 345, h: 64 }, stage: { x: 60, y: 460, w: 960, h: 950 }, captions: { y: 1435, h: 155, side: 140 } },
  "4:5": { W: 1080, H: 1350, chrome: { y: 130, h: 56 }, stage: { x: 60, y: 210, w: 960, h: 800 }, captions: { y: 1040, h: 200 } },
  "1:1": { W: 1080, H: 1080, chrome: { y: 120, h: 52 }, stage: { x: 60, y: 190, w: 960, h: 640 }, captions: { y: 860, h: 170 } },
  "16:9": { W: 1920, H: 1080, chrome: { y: 40, h: 52 }, stage: { x: 100, y: 120, w: 1720, h: 700 }, captions: { y: 860, h: 170 } },
};

// Stroke icons (24-unit viewBox).
export const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 5.5 5.5v1"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 13.6A5.5 5.5 0 0 1 21.5 19v1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  filecheck: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
  bank: '<path d="M2 10 12 4l10 6zM3 21h18M5 10v11M9.7 10v11M14.3 10v11M19 10v11"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldcheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v4M12 17.5v.5"/>',
  wallet: '<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4M16 14h2"/>',
  scale: '<path d="M12 3v18M6 21h12M4 7h16"/><path d="m4 7-3 7a4 4 0 0 0 6 0zM20 7l-3 7a4 4 0 0 0 6 0z"/>',
  heart: '<path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 5.5-8 11-8 11z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-5-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
  hourglass: '<path d="M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5M12 17.5v.5"/>',
  rupee: '<path d="M6 3h12M6 8h12M6 3h3a5 5 0 0 1 0 10H6l9 8"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  gold: '<path d="M4 20h16l-2-6H6zM7 14l1.5-5h7l1.5 5M9.5 9 11 4h2l1.5 5"/>',
  car: '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h2M14 6h2M8 10h2M14 10h2M8 14h2M14 14h2"/>',
  arrowright: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
};
const svgIcon = (name, cls = "") => {
  if (!ICONS[name]) throw new Error(`unknown icon "${name}" (have: ${Object.keys(ICONS).join(", ")})`);
  return `<svg class="k-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
};

const ENTER = {
  rise: [{ opacity: 0, y: 46 }, { opacity: 1, y: 0, ease: "power3.out" }],
  drop: [{ opacity: 0, y: -46 }, { opacity: 1, y: 0, ease: "power3.out" }],
  left: [{ opacity: 0, x: -70 }, { opacity: 1, x: 0, ease: "power3.out" }],
  right: [{ opacity: 0, x: 70 }, { opacity: 1, x: 0, ease: "power3.out" }],
  pop: [{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: "back.out(1.7)" }],
  zoom: [{ opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, ease: "power3.out" }],
  fade: [{ opacity: 0 }, { opacity: 1, ease: "power1.out" }],
};

// ---------------------------------------------------------------------------
class Handle {
  constructor(s, id) { this.s = s; this.id = id; this.sel = `#${id}`; }
  in(at, how = "rise", d = 0.5) {
    let [from, to] = ENTER[how] || ENTER.rise;
    this.s._shown.add(this.id);
    // the video's first frame is its thumbnail: anything entering at the very start of
    // scene 1 is already visible and only moves into place
    if (this.s.isFirst && this.s.t(at) < 0.15) from = { ...from, opacity: 1 };
    this.s.fromTo(this.sel, from, { ...to, duration: d }, at);
    return this;
  }
  out(at, d = 0.35) { this.s.to(this.sel, { opacity: 0, y: -20, duration: d, ease: "power2.in" }, at); return this; }
  dim(at, o = 0.28) { this.s.to(this.sel, { opacity: o, duration: 0.35, ease: "power1.out" }, at); return this; }
  undim(at) { this.s.to(this.sel, { opacity: 1, duration: 0.35, ease: "power1.out" }, at); return this; }
  pulse(at) { this.s.to(this.sel, { scale: 1.07, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 }, at); return this; }
  shake(at) {
    const t = this.s.t(at);
    [-14, 12, -8, 5, 0].forEach((x, i) => this.s.to(this.sel, { x, duration: 0.06, ease: "none" }, t + i * 0.06));
    return this;
  }
  move(at, vars, d = 0.6) { this.s.to(this.sel, { ...vars, duration: d, ease: "power3.inOut" }, at); return this; }
  // accent ring that draws attention to an element
  mark(at, tone = "primary") {
    const ring = this.s._child(this.id, "k-ring", "", "");
    this.s._css.push(`#${ring}{border-color:${tone === "neg" ? "var(--neg)" : "var(--primary)"}}`);
    this.s.fromTo(`#${ring}`, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }, at);
    return this;
  }
  strike(at, tone = "neg") {
    const line = this.s._child(this.id, "k-strike", "", "");
    this.s._css.push(`#${line}{background:${tone === "neg" ? "var(--neg)" : "var(--primary)"}}`);
    this.s.fromTo(`#${line}`, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, at);
    this.s.sfx("click", at, 0.35);
    return this;
  }
}

// ---------------------------------------------------------------------------
export class Scene {
  constructor({ id, theme, format, cues, duration, lines, isFirst = false }) {
    this.id = id;
    this.isFirst = isFirst;                 // composition id, e.g. "03-nominee"
    this.p = "s" + id.replace(/[^a-z0-9]/gi, ""); // letter-led id prefix
    this.T = THEMES[theme];
    this.F = FORMATS[format];
    this.u = Math.min(this.F.W, this.F.H) / 1080;
    this.stage = { w: this.F.stage.w, h: this.F.stage.h };
    this.duration = duration;
    this.lines = lines;           // [{ n, start, end, words: [{ text, spoken, start, end }] }] (scene-relative)
    this._cues = cues;
    this._n = 0;
    this._nodes = [];             // { id, parent, cls, style, inner }
    this._css = [];
    this._tw = [];
    this._shown = new Set();
    this._handles = new Set();
    this.sfxEvents = [];
    this.camOn = false;
  }

  // ---- time ----
  t(at) {
    if (Array.isArray(at)) return this.t(at[0]) + (at[1] || 0);
    if (typeof at === "number") return at;
    if (at == null) throw new Error(`scene ${this.id}: missing cue`);
    const t = this._cues(String(at), this);
    return t;
  }
  _clamp(t) { return r3(Math.max(0, Math.min(this.duration - 0.05, t))); }
  fromTo(sel, from, to, at) { this._tw.push(`tl.fromTo(${J(sel)},${J(from)},${J(to)},${this._clamp(this.t(at))});`); }
  to(sel, vars, at) { this._tw.push(`tl.to(${J(sel)},${J(vars)},${this._clamp(this.t(at))});`); }
  set(sel, vars, at) { this._tw.push(`tl.set(${J(sel)},${J(vars)},${this._clamp(this.t(at))});`); }
  sfx(name, at, vol = 0.4) { this.sfxEvents.push({ name, t: this._clamp(this.t(at)), vol }); }

  // ---- DOM ----
  _id() { return `${this.p}n${++this._n}`; }
  _node(parent, cls, style, inner, handle = true) {
    const id = this._id();
    this._nodes.push({ id, parent: parent ? parent.id || parent : null, cls, style, inner });
    if (handle) this._handles.add(id);
    return id;
  }
  _child(parentId, cls, style, inner) { return this._node(parentId, cls, style, inner, false); }
  _pos(o, extra = "") {
    const u = this.u;
    const parts = [`left:${r3(o.x ?? 0)}px`, `top:${r3(o.y ?? 0)}px`];
    if (o.w != null) parts.push(`width:${r3(o.w)}px`);
    if (o.h != null) parts.push(`height:${r3(o.h)}px`);
    return parts.join(";") + ";" + extra;
  }
  px(n) { return r3(n * this.u); }

  // ---- camera: push / pan the whole stage ----
  camera(at, { scale = 1.08, x = 0, y = 0, d = 2.5, ease = "sine.inOut" } = {}) {
    this.camOn = true;
    this.to(`#${this.p}cam`, { scale, x, y, duration: d, ease }, at);
  }

  // ---- components ----
  text(str, o = {}) {
    const size = this.px(o.size ?? 72);
    const font = { display: "var(--f-display)", body: "var(--f-body)", mono: "var(--f-mono)" }[o.font || "display"];
    const words = String(str).split(/\s+/).map((w) => `<span class="k-w">${rich(w)}</span>`).join(" ");
    const id = this._node(o.parent, "k-text", this._pos(o,
      `font-family:${font};font-size:${size}px;text-align:${o.align || "left"};color:${o.color ? `var(--${o.color})` : "var(--text)"};font-weight:${o.weight || 700}`), words);
    const h = new Handle(this, id);
    // word-by-word reveal; optionally each word lands as it's spoken (sync: line number)
    h.words = (at, stagger = 0.07) => { this._shown.add(id); this.set(h.sel, { opacity: 1 }, at);
      this.fromTo(`${h.sel} .k-w`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out", stagger }, at); return h; };
    h.say = (line) => {
      this._shown.add(id);
      const L = this.lines.find((l) => l.n === line);
      if (!L) throw new Error(`scene ${this.id}: text.say(${line}) but line ${line} isn't in this scene`);
      this.set(h.sel, { opacity: 1 }, L.start);
      const tokens = String(str).split(/\s+/);
      let k = 0;
      tokens.forEach((tok, i) => {
        const nw = normWord(tok);
        let hit = -1;
        for (let j = k; j < L.words.length; j++) if (normWord(L.words[j].text) === nw) { hit = j; break; }
        const t = hit >= 0 ? L.words[hit].start : (L.words[Math.min(k, L.words.length - 1)]?.start ?? L.start);
        if (hit >= 0) k = hit + 1;
        this.fromTo(`${h.sel} .k-w:nth-child(${i + 1})`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, t);
      });
      return h;
    };
    return h;
  }

  tag(str, o = {}) {
    const tone = o.tone || "accent";
    const id = this._node(o.parent, `k-tag k-tag-${tone}`, this._pos(o, `font-size:${this.px(o.size ?? 30)}px`),
      (o.icon ? svgIcon(o.icon) : "") + `<span>${rich(str)}</span>`);
    return new Handle(this, id);
  }

  icon(name, o = {}) {
    const size = this.px(o.size ?? 120);
    const tone = o.tone || "primary";
    const id = this._node(o.parent, `k-icon k-tone-${tone}${o.ring === false ? "" : " k-icon-ring"}`,
      this._pos(o, `width:${size}px;height:${size}px;padding:${o.ring === false ? 0 : r3(size * 0.2)}px`), svgIcon(name));
    return new Handle(this, id);
  }

  panel(o = {}) {
    const id = this._node(o.parent, `k-panel${o.tone === "neg" ? " k-panel-neg" : ""}${o.glass ? " k-panel-glass" : ""}`, this._pos(o), "");
    if (o.title) {
      this._child(id, "k-panel-head", "", `<span class="k-dot"></span><span>${esc(o.title)}</span>${o.meta ? `<span class="k-meta">${esc(o.meta)}</span>` : ""}`);
    }
    const h = new Handle(this, id);
    h.inner = { id, x0: 0 };
    return h;
  }

  stamp(str, o = {}) {
    const tone = o.tone || "neg";
    const id = this._node(o.parent, `k-stamp k-stamp-${tone}`,
      this._pos(o, `font-size:${this.px(o.size ?? 44)}px;rotate:${o.rotate ?? -8}deg`), esc(str));
    const h = new Handle(this, id);
    h.in = (at) => {
      this._shown.add(id);
      this.fromTo(h.sel, { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.28, ease: "power4.in" }, at);
      this.sfx("impact-bass-1", [at, 0.2], 0.45);
      return h;
    };
    return h;
  }

  stat(o = {}) {
    const size = this.px(o.size ?? 150);
    const fmt = o.format || "inr";
    const id = this._node(o.parent, "k-stat", this._pos(o, `text-align:${o.align || "left"}`),
      `<div class="k-stat-num" style="font-size:${size}px">${esc(o.prefix ?? (fmt === "inr" ? "₹" : ""))}<span class="k-stat-val">${esc(o.start ?? 0)}</span>${esc(o.suffix ?? "")}</div>` +
      (o.label ? `<div class="k-stat-label">${rich(o.label)}</div>` : ""));
    const h = new Handle(this, id);
    h.count = (at, d = 1.2, from = 0) => {
      const locale = fmt === "inr" ? "en-IN" : "en-US";
      const dec = o.decimals ?? 0;
      this._tw.push(`(function(){var o={v:${from}},e=document.querySelector("#${id} .k-stat-val");` +
        `tl.fromTo(o,{v:${from}},{v:${o.value},duration:${d},ease:"power2.out",onUpdate:function(){e.textContent=o.v.toLocaleString("${locale}",{minimumFractionDigits:${dec},maximumFractionDigits:${dec}});}},${this._clamp(this.t(at))});})();`);
      return h;
    };
    return h;
  }

  rows(items, o = {}) {
    const rowH = this.px(o.rowH ?? 118);
    const id = this._node(o.parent, "k-rows", this._pos({ ...o, h: o.h ?? r3(items.length * (rowH + this.px(16)) - this.px(16)) }), "");
    const rowIds = items.map((it, i) => this._child(id, "k-row",
      `top:${r3(i * (rowH + this.px(16)))}px;height:${rowH}px`,
      (it.icon ? `<div class="k-row-ico">${svgIcon(it.icon)}</div>` : "") +
      `<div class="k-row-label">${rich(it.label)}${it.sub ? `<div class="k-row-sub">${rich(it.sub)}</div>` : ""}</div>` +
      (it.value != null ? `<div class="k-row-val">${rich(it.value)}</div>` : "") +
      `<div class="k-row-status"></div>`));
    const h = new Handle(this, id);
    this._shown.add(id); this.set(h.sel, { opacity: 1 }, 0);
    h.row = (i, at, how = "left") => {
      const [from, to] = ENTER[how];
      this.fromTo(`#${rowIds[i]}`, from, { ...to, duration: 0.45 }, at);
      this.sfx("click-soft", at, 0.3);
      return h;
    };
    h.all = (at, stagger = 0.18) => { const t = this.t(at); items.forEach((_, i) => h.row(i, t + i * stagger)); return h; };
    h.status = (i, at, kind = "ok", label) => {
      const sid = `${rowIds[i]}st`;
      const icon = { ok: "check", bad: "x", wait: "hourglass" }[kind];
      this._nodes.find((n) => n.id === rowIds[i]).inner =
        this._nodes.find((n) => n.id === rowIds[i]).inner.replace('<div class="k-row-status"></div>',
          `<div class="k-row-status k-st-${kind}" id="${sid}">${svgIcon(icon)}${label ? `<span>${esc(label)}</span>` : ""}</div>`);
      this.fromTo(`#${sid}`, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, at);
      if (kind === "bad") this.to(`#${rowIds[i]}`, { borderColor: this.T.neg, duration: 0.3 }, at);
      this.sfx(kind === "bad" ? "error" : "pop", at, 0.3);
      return h;
    };
    h.rowSel = (i) => `#${rowIds[i]}`;
    return h;
  }

  chat(msgs, o = {}) {
    const id = this._node(o.parent, "k-chat", this._pos(o), "");
    let y = 0;
    const ids = msgs.map((m) => {
      const lines = Math.ceil(String(m.text).length / 26);
      const hgt = this.px(46 + 52 * lines + (m.name ? 34 : 0));
      const mid = this._child(id, `k-msg k-msg-${m.from === "me" ? "me" : "them"}`, `top:${r3(y)}px`,
        (m.name ? `<div class="k-msg-name">${esc(m.name)}</div>` : "") + `<div>${rich(m.text)}</div>`);
      const tid = this._child(id, `k-typing k-msg-${m.from === "me" ? "me" : "them"}`, `top:${r3(y)}px`, "<i></i><i></i><i></i>");
      y += hgt + this.px(22);
      return { mid, tid };
    });
    this._nodes.find((n) => n.id === id).style += `height:${r3(y)}px;`;
    const h = new Handle(this, id);
    this._shown.add(id); this.set(h.sel, { opacity: 1 }, 0);
    h.msg = (i, at, { typing = true } = {}) => {
      const t = this.t(at);
      const { mid, tid } = ids[i];
      if (typing) {
        this.fromTo(`#${tid}`, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.2 }, t - 0.7);
        this.fromTo(`#${tid} i`, { y: 0 }, { y: -8, duration: 0.18, yoyo: true, repeat: 3, stagger: 0.08, ease: "sine.inOut" }, t - 0.6);
        this.set(`#${tid}`, { opacity: 0 }, t);
      }
      this.fromTo(`#${mid}`, { opacity: 0, y: 20, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.6)" }, t);
      this.sfx("notification", t, 0.25);
      return h;
    };
    return h;
  }

  form(o = {}) {
    const id = this._node(o.parent, "k-panel k-form", this._pos({ ...o, h: o.h ?? this.px(130 + (o.fields || []).length * 150) }), "");
    if (o.title) this._child(id, "k-panel-head", "", `<span class="k-dot"></span><span>${esc(o.title)}</span>${o.meta ? `<span class="k-meta">${esc(o.meta)}</span>` : ""}`);
    const fids = (o.fields || []).map((f, i) => {
      const fid = this._child(id, "k-field", `top:${this.px(100 + i * 150)}px`,
        `<div class="k-field-label">${esc(f.label)}</div><div class="k-field-box"><span class="k-field-val">${esc(f.value || "")}</span><span class="k-field-flag"></span></div>`);
      return fid;
    });
    const h = new Handle(this, id);
    h.fill = (i, at, d) => {
      const val = (o.fields[i].value || "");
      const dur = d ?? Math.min(1.1, 0.06 * val.length + 0.15);
      this.fromTo(`#${fids[i]} .k-field-val`, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: dur, ease: `steps(${Math.max(1, val.length)})` }, at);
      this.sfx("typing", at, 0.25);
      return h;
    };
    h.flag = (i, at, kind = "bad", label) => {
      const lab = label ?? (kind === "bad" ? "MISSING" : "OK");
      const f = this._nodes.find((n) => n.id === fids[i]);
      f.inner = f.inner.replace('<span class="k-field-flag"></span>', `<span class="k-field-flag k-st-${kind}">${svgIcon(kind === "bad" ? "x" : "check")}${esc(lab)}</span>`);
      this.to(`#${fids[i]} .k-field-box`, { borderColor: kind === "bad" ? this.T.neg : this.T.primary, backgroundColor: kind === "bad" ? this.T.negSoft : this.T.primarySoft, duration: 0.3 }, at);
      this.fromTo(`#${fids[i]} .k-field-flag`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, at);
      this.sfx(kind === "bad" ? "error" : "pop", at, 0.3);
      return h;
    };
    // fields start with their values hidden until filled
    for (const fid of fids) this.set(`#${fid} .k-field-val`, { clipPath: "inset(0% 100% 0% 0%)" }, 0);
    return h;
  }

  flow(nodes, o = {}) {
    const dir = o.dir || "down";
    const nodeW = dir === "down" ? (o.w ?? 600) : this.px(o.nodeW ?? 220);
    const nodeH = this.px(o.nodeH ?? (dir === "down" ? 120 : 200));
    const gap = this.px(o.gap ?? 70);
    const n = nodes.length;
    const id = this._node(o.parent, "k-flow", this._pos({ ...o,
      w: dir === "down" ? nodeW : r3(n * nodeW + (n - 1) * gap),
      h: dir === "down" ? r3(n * nodeH + (n - 1) * gap) : nodeH }), "");
    const nIds = [], cIds = [];
    nodes.forEach((n, i) => {
      const x = dir === "down" ? 0 : i * (nodeW + gap);
      const y = dir === "down" ? i * (nodeH + gap) : 0;
      if (i > 0) {
        const cs = dir === "down"
          ? `left:${r3(nodeW / 2 - this.px(3))}px;top:${r3(y - gap)}px;width:${this.px(6)}px;height:${r3(gap)}px;transform-origin:top center`
          : `left:${r3(x - gap)}px;top:${r3(nodeH / 2 - this.px(3))}px;width:${r3(gap)}px;height:${this.px(6)}px;transform-origin:left center`;
        cIds.push(this._child(id, "k-conn", cs, `<span class="k-conn-x">${svgIcon("x")}</span>`));
      } else cIds.push(null);
      nIds.push(this._child(id, `k-node${n.tone === "neg" ? " k-node-neg" : ""}`,
        `left:${r3(x)}px;top:${r3(y)}px;width:${r3(nodeW)}px;height:${r3(nodeH)}px;${dir === "right" ? "flex-direction:column;text-align:center;justify-content:center" : ""}`,
        (n.icon ? svgIcon(n.icon) : "") + `<span>${rich(n.label)}</span>`));
    });
    const h = new Handle(this, id);
    this._shown.add(id); this.set(h.sel, { opacity: 1 }, 0);
    h.step = (i, at) => {
      const t = this.t(at);
      if (cIds[i]) this.fromTo(`#${cIds[i]}`, dir === "down" ? { scaleY: 0 } : { scaleX: 0 }, dir === "down" ? { scaleY: 1, duration: 0.3, ease: "power2.out" } : { scaleX: 1, duration: 0.3, ease: "power2.out" }, t - 0.3);
      this.fromTo(`#${nIds[i]}`, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, t);
      this.sfx("click-soft", t, 0.3);
      return h;
    };
    h.break = (i, at) => {
      this.to(`#${cIds[i]}`, { backgroundColor: this.T.neg, duration: 0.25 }, at);
      this.fromTo(`#${cIds[i]} .k-conn-x`, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, at);
      this.sfx("error", at, 0.35);
      return h;
    };
    h.nodeSel = (i) => `#${nIds[i]}`;
    return h;
  }

  people(count, o = {}) {
    const cols = o.cols ?? 10;
    const cell = (o.w ?? 900) / cols;
    const id = this._node(o.parent, "k-people", this._pos({ ...o, w: o.w ?? 900, h: r3(Math.ceil(count / cols) * cell * 1.1) }), "");
    const pIds = [];
    for (let i = 0; i < count; i++) {
      pIds.push(this._child(id, "k-person", `left:${r3((i % cols) * cell)}px;top:${r3(Math.floor(i / cols) * cell * 1.1)}px;width:${r3(cell * 0.82)}px;height:${r3(cell * 0.82)}px`, svgIcon("user")));
    }
    const h = new Handle(this, id);
    this._shown.add(id); this.set(h.sel, { opacity: 1 }, 0);
    h.in = (at, stagger = 0.02) => {
      this.fromTo(`#${id} .k-person`, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)", stagger }, at);
      return h;
    };
    h.color = (k, at, tone = "primary", stagger = 0.03) => {
      const which = Array.isArray(k) ? k : [...Array(k).keys()];
      const t = this.t(at);
      which.forEach((idx, j) => this.to(`#${pIds[idx]}`, { color: tone === "neg" ? this.T.neg : this.T.primary, scale: 1.08, duration: 0.25 }, t + j * stagger));
      return h;
    };
    return h;
  }

  bars(data, o = {}) {
    const n = data.length, W = o.w ?? 800, H = o.h ?? 500;
    const bw = (W / n) * 0.62;
    const max = Math.max(...data.map((d) => d.value));
    const id = this._node(o.parent, "k-bars", this._pos({ ...o, w: W, h: H }), "");
    const bIds = data.map((d, i) => {
      const bh = (H - this.px(90)) * (d.value / max);
      const x = i * (W / n) + (W / n - bw) / 2;
      return this._child(id, `k-bar${d.tone === "neg" ? " k-bar-neg" : ""}`, `left:${r3(x)}px;top:${r3(H - this.px(60) - bh)}px;width:${r3(bw)}px;height:${r3(bh)}px`,
        `<div class="k-bar-val">${esc(d.display ?? d.value)}</div><div class="k-bar-label">${esc(d.label)}</div>`);
    });
    const h = new Handle(this, id);
    this._shown.add(id); this.set(h.sel, { opacity: 1 }, 0);
    h.bar = (i, at) => { this.fromTo(`#${bIds[i]}`, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.55, ease: "power3.out" }, at); return h; };
    h.all = (at, stagger = 0.15) => { const t = this.t(at); data.forEach((_, i) => h.bar(i, t + i * stagger)); return h; };
    return h;
  }

  progress(o = {}) {
    const id = this._node(o.parent, "k-prog", this._pos(o),
      (o.label ? `<div class="k-prog-label"><span>${esc(o.label)}</span><span class="k-prog-meta">${esc(o.meta || "")}</span></div>` : "") +
      `<div class="k-prog-track"><div class="k-prog-fill${o.tone === "neg" ? " k-prog-neg" : ""}"></div></div>` +
      (o.ticks ? `<div class="k-prog-ticks">${o.ticks.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""));
    const h = new Handle(this, id);
    this.set(`#${id} .k-prog-fill`, { scaleX: 0 }, 0);
    h.fill = (pct, at, d = 1.2) => { this.to(`#${id} .k-prog-fill`, { scaleX: pct / 100, duration: d, ease: "power2.inOut" }, at); return h; };
    return h;
  }

  doc(o = {}) {
    const lines = o.lines ?? 6;
    const id = this._node(o.parent, "k-doc", this._pos(o),
      `<div class="k-doc-title">${svgIcon(o.icon || "file")}<span>${esc(o.title || "Document")}</span></div>` +
      Array.from({ length: lines }, (_, i) => `<div class="k-doc-line" style="width:${[92, 78, 86, 64, 88, 70, 82][i % 7]}%"></div>`).join("") +
      (o.sign ? `<div class="k-doc-sign">${esc(o.sign)}</div>` : ""));
    const h = new Handle(this, id);
    h.stamp = (str, at, tone = "neg") => {
      const sid = this._child(id, `k-stamp k-stamp-${tone}`, `right:${this.px(30)}px;bottom:${this.px(60)}px;font-size:${this.px(40)}px;rotate:-10deg`, esc(str));
      this.fromTo(`#${sid}`, { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.28, ease: "power4.in" }, at);
      this.sfx("impact-bass-1", [at, 0.2], 0.45);
      return h;
    };
    return h;
  }

  arrow(o = {}) {
    const [x1, y1] = o.from, [x2, y2] = o.to;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const id = this._node(o.parent, `k-arrow${o.tone === "neg" ? " k-arrow-neg" : ""}`,
      `left:${r3(x1)}px;top:${r3(y1 - this.px(3))}px;width:${r3(len)}px;height:${this.px(6)}px;rotate:${r3(ang)}deg`, "<i></i>");
    const h = new Handle(this, id);
    h.in = (at, d = 0.45) => {
      this._shown.add(id);
      this.fromTo(h.sel, { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: d, ease: "power2.out" }, at);
      this.sfx("whoosh-short", at, 0.2);
      return h;
    };
    return h;
  }

  // ---- compile ----
  html(sceneDur) {
    const kids = new Map();
    for (const n of this._nodes) {
      const k = n.parent || "__root";
      if (!kids.has(k)) kids.set(k, []);
      kids.get(k).push(n);
    }
    const render = (n) => `<div id="${n.id}" class="${n.cls}" style="${n.style}">${n.inner}${(kids.get(n.id) || []).map(render).join("")}</div>`;
    const body = (kids.get("__root") || []).map(render).join("\n");
    // anything placed but never brought in is simply visible from the start
    const autoShow = [...this._handles].filter((id) => !this._shown.has(id) && !this._nodes.find((n) => n.id === id).parent?.startsWith?.("__"));
    const showCode = autoShow.map((id) => `tl.set("#${id}",{opacity:1},0);`).join("");
    return { body, css: this._css.join("\n"), js: showCode + this._tw.join("\n"), dur: sceneDur };
  }
}

// Shared CSS for every scene (theme tokens are injected as CSS variables).
export function kitCss(T, u) {
  const p = (n) => r3(n * u);
  return `
  .k-text,.k-tag,.k-icon,.k-panel,.k-stamp,.k-stat,.k-rows,.k-chat,.k-flow,.k-people,.k-bars,.k-prog,.k-doc,.k-arrow{position:absolute;opacity:0}
  .k-text{line-height:1.12;letter-spacing:-0.01em}
  .k-text .k-w{display:inline-block}
  .k-key{color:var(--primary)}
  .k-ico{width:100%;height:100%;display:block}
  .k-tag{display:flex;align-items:center;gap:${p(12)}px;padding:${p(12)}px ${p(26)}px;border-radius:999px;font-family:var(--f-mono);font-weight:700;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap}
  .k-tag .k-ico{width:1.1em;height:1.1em}
  .k-tag-accent{background:var(--primary-soft);color:var(--primary);border:${p(2)}px solid var(--primary)}
  .k-tag-solid{background:var(--primary);color:var(--bg)}
  .k-tag-neg{background:var(--neg-soft);color:var(--neg);border:${p(2)}px solid var(--neg)}
  .k-tag-muted{background:var(--card2);color:var(--muted);border:${p(2)}px solid var(--border)}
  .k-icon{color:var(--primary)}
  .k-icon-ring{border-radius:28%;background:var(--card2);border:${p(2)}px solid var(--border);box-shadow:var(--shadow)}
  .k-tone-neg{color:var(--neg)} .k-tone-muted{color:var(--faint)} .k-tone-text{color:var(--text)}
  .k-panel{background:var(--card);border:${p(2)}px solid var(--border);border-radius:${p(22)}px;box-shadow:var(--shadow);overflow:hidden}
  .k-panel-glass{background:var(--card2)}
  .k-panel-neg{border-color:var(--neg)}
  .k-panel-head{display:flex;align-items:center;gap:${p(14)}px;height:${p(72)}px;padding:0 ${p(28)}px;border-bottom:${p(2)}px solid var(--border);font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}
  .k-dot{width:${p(14)}px;height:${p(14)}px;border-radius:50%;background:var(--primary)}
  .k-panel-neg .k-dot{background:var(--neg)}
  .k-meta{margin-left:auto;color:var(--faint)}
  .k-ring{position:absolute;inset:-${p(10)}px;border:${p(5)}px solid var(--primary);border-radius:${p(28)}px;opacity:0;pointer-events:none}
  .k-strike{position:absolute;left:-2%;width:104%;top:calc(50% - ${p(4)}px);height:${p(8)}px;border-radius:${p(4)}px;transform-origin:left center}
  .k-stamp{padding:${p(10)}px ${p(26)}px;border:${p(6)}px solid currentColor;border-radius:${p(12)}px;font-family:var(--f-mono);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap}
  .k-stamp-neg{color:var(--neg);background:var(--neg-soft)} .k-stamp-pos{color:var(--primary);background:var(--primary-soft)}
  .k-stat-num{font-family:var(--f-body);font-weight:700;color:var(--primary);line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums}
  .k-stat-label{margin-top:${p(14)}px;font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)}
  .k-row{position:absolute;left:0;right:0;display:flex;align-items:center;gap:${p(24)}px;padding:0 ${p(28)}px;background:var(--card);border:${p(2)}px solid var(--border);border-radius:${p(18)}px;box-shadow:var(--shadow);opacity:0}
  .k-row-ico{width:${p(64)}px;height:${p(64)}px;flex:none;color:var(--primary);background:var(--primary-soft);border-radius:${p(14)}px;padding:${p(12)}px}
  .k-row-label{flex:1;font-family:var(--f-body);font-weight:700;font-size:${p(38)}px;color:var(--text);line-height:1.15}
  .k-row-sub{font-family:var(--f-mono);font-weight:400;font-size:${p(28)}px;color:var(--faint);margin-top:${p(4)}px;letter-spacing:0.04em}
  .k-row-val{font-family:var(--f-body);font-weight:700;font-size:${p(38)}px;color:var(--primary)}
  .k-row-status{display:flex;align-items:center;gap:${p(8)}px;height:${p(56)}px;min-width:${p(56)}px;padding:0 ${p(12)}px;border-radius:${p(28)}px;font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;opacity:0}
  .k-row-status .k-ico{width:${p(32)}px;height:${p(32)}px}
  .k-st-ok{background:var(--primary-soft);color:var(--primary)} .k-st-bad{background:var(--neg-soft);color:var(--neg)} .k-st-wait{background:var(--card2);color:var(--muted)}
  .k-chat{} .k-msg,.k-typing{position:absolute;max-width:78%;padding:${p(22)}px ${p(30)}px;border-radius:${p(28)}px;font-family:var(--f-body);font-weight:500;font-size:${p(38)}px;line-height:1.3;opacity:0}
  .k-msg-them{left:0;background:var(--card2);color:var(--text);border:${p(2)}px solid var(--border);border-bottom-left-radius:${p(8)}px}
  .k-msg-me{right:0;background:var(--primary);color:var(--bg);border-bottom-right-radius:${p(8)}px}
  .k-msg-name{font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;letter-spacing:0.06em;text-transform:uppercase;opacity:0.7;margin-bottom:${p(6)}px}
  .k-typing{display:flex;gap:${p(10)}px;padding:${p(26)}px ${p(30)}px}
  .k-typing i{display:block;width:${p(14)}px;height:${p(14)}px;border-radius:50%;background:currentColor;opacity:0.6}
  .k-form{} .k-field{position:absolute;left:${p(30)}px;right:${p(30)}px}
  .k-field-label{font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;letter-spacing:0.08em;text-transform:uppercase;color:var(--faint);margin-bottom:${p(10)}px}
  .k-field-box{position:relative;display:flex;align-items:center;height:${p(76)}px;padding:0 ${p(22)}px;border:${p(2)}px solid var(--border);border-radius:${p(12)}px;background:var(--bg2)}
  .k-field-val{font-family:var(--f-body);font-weight:700;font-size:${p(36)}px;color:var(--text);white-space:nowrap}
  .k-field-flag{position:absolute;right:${p(14)}px;display:flex;align-items:center;gap:${p(8)}px;padding:${p(6)}px ${p(14)}px;border-radius:${p(20)}px;font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;opacity:0}
  .k-field-flag .k-ico{width:${p(26)}px;height:${p(26)}px}
  .k-node{position:absolute;display:flex;align-items:center;gap:${p(20)}px;padding:${p(18)}px ${p(28)}px;background:var(--card);border:${p(2)}px solid var(--border);border-radius:${p(18)}px;box-shadow:var(--shadow);font-family:var(--f-body);font-weight:700;font-size:${p(36)}px;color:var(--text);opacity:0}
  .k-node .k-ico{width:${p(56)}px;height:${p(56)}px;flex:none;color:var(--primary)}
  .k-node-neg{border-color:var(--neg)} .k-node-neg .k-ico{color:var(--neg)}
  .k-conn{position:absolute;background:var(--faint);border-radius:${p(3)}px}
  .k-conn-x{position:absolute;left:50%;top:50%;width:${p(54)}px;height:${p(54)}px;margin:-${p(27)}px 0 0 -${p(27)}px;padding:${p(10)}px;border-radius:50%;background:var(--neg);color:var(--bg);opacity:0}
  .k-person{position:absolute;color:var(--faint)}
  .k-bar{position:absolute;background:var(--primary);border-radius:${p(10)}px ${p(10)}px 0 0;transform-origin:bottom center;opacity:0}
  .k-bar-neg{background:var(--neg)}
  .k-bar-val{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:${p(10)}px;font-family:var(--f-body);font-weight:700;font-size:${p(34)}px;color:var(--text);white-space:nowrap}
  .k-bar-label{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:${p(14)}px;font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;color:var(--muted);white-space:nowrap;text-transform:uppercase}
  .k-prog-label{display:flex;justify-content:space-between;font-family:var(--f-mono);font-weight:700;font-size:${p(28)}px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:${p(14)}px}
  .k-prog-track{height:${p(40)}px;border-radius:${p(10)}px;background:var(--card2);border:${p(2)}px solid var(--border);overflow:hidden}
  .k-prog-fill{height:100%;background:var(--primary);transform-origin:left center}
  .k-prog-neg{background:var(--neg)}
  .k-prog-ticks{display:flex;justify-content:space-between;margin-top:${p(12)}px;font-family:var(--f-mono);font-size:${p(28)}px;color:var(--faint)}
  .k-doc{background:var(--card);border:${p(2)}px solid var(--border);border-radius:${p(14)}px;box-shadow:var(--shadow);padding:${p(36)}px ${p(36)}px}
  .k-doc-title{display:flex;align-items:center;gap:${p(16)}px;font-family:var(--f-body);font-weight:700;font-size:${p(36)}px;color:var(--text);margin-bottom:${p(30)}px}
  .k-doc-title .k-ico{width:${p(48)}px;height:${p(48)}px;color:var(--primary)}
  .k-doc-line{height:${p(14)}px;border-radius:${p(7)}px;background:var(--border);margin-bottom:${p(22)}px}
  .k-doc-sign{margin-top:${p(30)}px;font-family:var(--f-mono);font-size:${p(28)}px;color:var(--faint);border-top:${p(2)}px dashed var(--border);padding-top:${p(14)}px;width:50%}
  .k-doc .k-stamp{position:absolute;opacity:0}
  .k-arrow{background:var(--primary);border-radius:${p(3)}px;transform-origin:left center}
  .k-arrow i{position:absolute;right:-${p(4)}px;top:50%;width:${p(26)}px;height:${p(26)}px;margin-top:-${p(13)}px;border-top:${p(6)}px solid var(--primary);border-right:${p(6)}px solid var(--primary);rotate:45deg}
  .k-arrow-neg,.k-arrow-neg i{background:var(--neg);border-color:var(--neg)} .k-arrow-neg i{background:none}
  `;
}
