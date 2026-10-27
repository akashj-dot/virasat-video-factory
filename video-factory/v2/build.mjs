// v2 builder: timings.json (from voice-first.mjs) + storyboard.mjs -> a complete,
// render-ready HyperFrames project, with the Virasat brand finalize step applied.
//
//   node v2/build.mjs <projectDir> [--no-finalize]
//
// storyboard.mjs (authored per video):
//   export default {
//     steps: ["Death", "Documents", "Claim", "Money"],   // optional progress strip
//     bgm: "grand_project-better-today-documentary-informative-407230.mp3", // optional
//     pauses: { 4: 0.7 },                                  // optional extra silence after line 4
//     scenes: [
//       { slug: "hook", lines: [1, 2], step: 0, build(s) { ... } },  // see kit.mjs
//       ...
//     ],
//   };
// Every SCRIPT line must belong to exactly one scene, in order.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Scene, THEMES, FORMATS, kitCss, normWord } from "./kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FACTORY = path.dirname(HERE);
const dir = path.resolve(process.argv[2] || "");
if (!process.argv[2]) { console.error("usage: node v2/build.mjs <projectDir> [--no-finalize]"); process.exit(1); }
const FINALIZE = !process.argv.includes("--no-finalize");

const SFX_DIR = path.join(process.env.HOME, ".claude/skills/media-use/audio/assets/sfx");
const BGM_DIR = path.join(FACTORY, "BGM Sound");
const DEFAULT_BGM = "grand_project-better-today-documentary-informative-407230.mp3";
const BGM_VOLUME = 0.06; // user finds 0.12 too loud; 0.05-0.07 is the agreed band
const GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";
const LEAD_IN = 0.35, GAP = 0.28, GAP_SENTENCE = 0.42, SCENE_BREATH = 0.75, TAIL = 1.5;
const FONTS = [
  ["Fraunces", 700, "Fraunces-Bold.woff2"], ["Fraunces", 600, "Fraunces-SemiBold.woff2"],
  ["Space Grotesk", 400, "SpaceGrotesk-Regular.woff2"], ["Space Grotesk", 500, "SpaceGrotesk-Medium.woff2"],
  ["Space Grotesk", 700, "SpaceGrotesk-Bold.woff2"], ["Space Mono", 400, "SpaceMono-Regular.woff2"], ["Space Mono", 700, "SpaceMono-Bold.woff2"],
];

const r3 = (n) => Math.round(n * 1000) / 1000;
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- inputs ----------
const job = fs.existsSync(path.join(dir, "job.json")) ? readJSON(path.join(dir, "job.json")) : {};
const theme = job.theme || "dark";
const format = job.format || "9:16";
if (!THEMES[theme]) throw new Error(`theme must be one of ${Object.keys(THEMES)}`);
if (!FORMATS[format]) throw new Error(`format must be one of ${Object.keys(FORMATS)}`);
const T = THEMES[theme], F = FORMATS[format], u = Math.min(F.W, F.H) / 1080;
const timings = readJSON(path.join(dir, "timings.json"));
const sb = (await import(pathToFileURL(path.join(dir, "storyboard.mjs")).href + `?t=${Date.now()}`)).default;

// ---------- global line clock ----------
const lines = [...timings.lines].sort((a, b) => a.n - b.n);
let clock = LEAD_IN;
for (const L of lines) {
  L.start = r3(clock);
  L.end = r3(clock + L.duration);
  const last = L.words.at(-1)?.caption || "";
  // a scene's last beat needs time to be read before the cut, so scene changes breathe
  const sceneEnd = sb.scenes.some((sc) => sc.lines[1] === L.n);
  const gap = sb.pauses?.[L.n] ?? Math.max(/[?.!।]$/.test(last) ? GAP_SENTENCE : GAP, sceneEnd ? SCENE_BREATH : 0);
  clock = L.end + gap;
}
const byN = new Map(lines.map((L) => [L.n, L]));

// ---------- scenes: time windows ----------
const scenes = sb.scenes.map((sc, i) => ({ ...sc, idx: i, num: String(i + 1).padStart(2, "0") }));
{
  const seen = scenes.flatMap((sc) => { const [a, b] = sc.lines; return Array.from({ length: b - a + 1 }, (_, k) => a + k); });
  const want = lines.map((L) => L.n);
  if (seen.join() !== want.join()) throw new Error(`storyboard scenes must cover lines ${want.join(",")} in order exactly once; got ${seen.join(",")}`);
}
scenes.forEach((sc, i) => {
  sc.start = i === 0 ? 0 : scenes[i - 1].end;
  sc.end = i === scenes.length - 1 ? r3(byN.get(sc.lines[1]).end + TAIL) : r3(byN.get(scenes[i + 1].lines[0]).start - 0.1);
  sc.duration = r3(sc.end - sc.start);
  sc.id = `${sc.num}-${sc.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
});
const TOTAL = scenes.at(-1).end;

// Scene-relative cue resolver (see kit.mjs header for the grammar).
function makeResolver(sc) {
  const own = lines.filter((L) => L.n >= sc.lines[0] && L.n <= sc.lines[1]);
  return (spec) => {
    let m = spec.match(/^L(\d+)(\.end)?$/i);
    if (m) {
      const L = byN.get(+m[1]);
      if (!L) throw new Error(`scene ${sc.id}: no line ${m[1]}`);
      return r3((m[2] ? L.end : L.start) - sc.start);
    }
    m = spec.match(/^(?:L(\d+):)?(.+?)(?:#(\d+))?(\.end)?$/i);
    const [, ln, word, nth, end] = m;
    const pool = (ln ? [byN.get(+ln)] : own).filter(Boolean);
    const target = normWord(word);
    const hits = [];
    for (const L of pool) for (const w of L.words)
      if (normWord(w.caption) === target || normWord(w.spoken) === target) hits.push({ L, w });
    const hit = hits[(+nth || 1) - 1];
    if (!hit) {
      const avail = own.map((L) => `L${L.n}: ${L.words.map((w) => w.caption).join(" ")}`).join("\n  ");
      throw new Error(`scene ${sc.id}: cue "${spec}" not found. Words in this scene:\n  ${avail}`);
    }
    return r3(hit.L.start + (end ? hit.w.end : hit.w.start) - sc.start);
  };
}

// ---------- output dirs + assets ----------
const framesDir = path.join(dir, "compositions", "frames");
const ovDir = path.join(dir, "compositions", "overlays");
for (const d of [framesDir, ovDir]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
for (const sub of ["fonts", "sfx", "bgm"]) fs.mkdirSync(path.join(dir, "assets", sub), { recursive: true });
for (const [, , file] of FONTS) fs.copyFileSync(path.join(HERE, "assets", "fonts", file), path.join(dir, "assets", "fonts", file));
fs.copyFileSync(path.join(FACTORY, "brand", `virasat-frame-${theme}.md`), path.join(dir, "frame.md"));

const fontFaces = FONTS.map(([fam, w, file]) =>
  `@font-face{font-family:"${fam}";src:url("assets/fonts/${file}") format("woff2");font-weight:${w};font-display:block}`).join("\n");
const vars = `--bg:${T.bg};--bg2:${T.bg2};--card:${T.card};--card2:${T.card2};--border:${T.border};--text:${T.text};--muted:${T.muted};--faint:${T.faint};` +
  `--primary:${T.primary};--primary-soft:${T.primarySoft};--neg:${T.neg};--neg-soft:${T.negSoft};--shadow:${T.shadow};` +
  `--f-display:"Fraunces",serif;--f-body:"Space Grotesk",sans-serif;--f-mono:"Space Mono",monospace`;


// Auto-fit: measure the scene's laid-out content and scale/centre it to fill the stage,
// so authored layouts never leave the lower half empty. Opt out per scene with fit:false.
function fitJs(P, max) {
  return `    (function(){var f=document.getElementById("${P}fit"),k=f.children,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      for(var i=0;i<k.length;i++){var e=k[i];x0=Math.min(x0,e.offsetLeft);y0=Math.min(y0,e.offsetTop);x1=Math.max(x1,e.offsetLeft+e.offsetWidth);y1=Math.max(y1,e.offsetTop+e.offsetHeight);}
      if(!(x1>x0&&y1>y0))return;var W=${F.stage.w},H=${F.stage.h},bw=x1-x0,bh=y1-y0,s=Math.min(W/bw,H/bh,${max});
      f.style.transform="translate("+((W-bw*s)/2-x0*s)+"px,"+((H-bh*s)/2-y0*s)+"px) scale("+s+")";})();`;
}

// ---------- scenes -> frame compositions ----------
const allSfx = [];
const report = [];
for (const sc of scenes) {
  const own = lines.filter((L) => L.n >= sc.lines[0] && L.n <= sc.lines[1]).map((L) => ({
    n: L.n, start: r3(L.start - sc.start), end: r3(L.end - sc.start),
    words: L.words.map((w) => ({ text: w.caption, spoken: w.spoken, start: r3(L.start + w.start - sc.start), end: r3(L.start + w.end - sc.start) })),
  }));
  const s = new Scene({ id: sc.id, theme, format, cues: makeResolver(sc), duration: sc.duration, lines: own, isFirst: sc.idx === 0 });
  try { sc.build(s); } catch (e) { console.error(`\n✗ scene ${sc.id}: ${e.message}`); process.exit(1); }
  const out = s.html(sc.duration);
  const P = s.p;
  const isLast = sc.idx === scenes.length - 1;
  const html = `<template>
<div id="root" data-composition-id="${sc.id}" data-width="${F.W}" data-height="${F.H}" data-duration="${sc.duration}">
  <style>
${fontFaces}
    #root{position:relative;width:100%;height:100%;overflow:hidden;background:${T.bg};${vars}}
    .${P}bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 45% at 50% 40%,${T.glow},rgba(0,0,0,0) 70%),radial-gradient(circle,${T.grid} ${r3(2 * u)}px,rgba(0,0,0,0) ${r3(2.5 * u)}px) 0 0/${r3(36 * u)}px ${r3(36 * u)}px}
    .${P}cam{position:absolute;inset:0;transform-origin:50% 42%}
    .${P}stage{position:absolute;left:${F.stage.x}px;top:${F.stage.y}px;width:${F.stage.w}px;height:${F.stage.h}px}
    .${P}fit{position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0}
${kitCss(T, u)}
${out.css}
  </style>
  <div class="${P}bg"></div>
  <div id="${P}cam" class="${P}cam"><div class="${P}stage"><div id="${P}fit" class="${P}fit">
${out.body}
  </div></div></div>
  <script src="${GSAP}"></script>
  <script>
  (function(){
${sc.fit === false ? "" : fitJs(P, sc.fit?.max ?? 1.3)}
    var tl = gsap.timeline({ paused: true });
${sc.idx === 0 ? "" : `    tl.fromTo("#${P}cam",{opacity:0},{opacity:1,duration:0.3,ease:"power1.out"},0);\n`}${out.js}
${isLast ? "" : `    tl.to("#${P}cam",{opacity:0,duration:0.22,ease:"power1.in"},${r3(sc.duration - 0.22)});`}
    window.__timelines["${sc.id}"] = tl;
  })();
  </script>
</div>
</template>
`;
  fs.writeFileSync(path.join(framesDir, `${sc.id}.html`), html);
  for (const e of s.sfxEvents) allSfx.push({ ...e, t: r3(sc.start + e.t) });

  // density QA: longest stretch inside the spoken part of the scene with no new animation
  const times = [...out.js.matchAll(/,(\d+(?:\.\d+)?)\);/g)].map((m) => +m[1]).filter((t) => t > 0.05).sort((a, b) => a - b);
  const speechEnd = own.at(-1).end;
  const marks = [0, ...times.filter((t) => t <= speechEnd), speechEnd];
  let worst = 0, at = 0;
  for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > worst) { worst = marks[i] - marks[i - 1]; at = marks[i - 1]; }
  report.push({ id: sc.id, dur: sc.duration, events: times.length, worst: r3(worst), at: r3(at) });
}

// ---------- captions overlay (karaoke, Roman script, keywords in accent) ----------
const capMaxWords = format === "16:9" ? 8 : 5, capMaxChars = format === "16:9" ? 48 : 32;
const groups = [];
for (const L of lines) {
  let cur = [];
  const flush = () => { if (cur.length) groups.push({ L, words: cur }); cur = []; };
  L.words.forEach((w, i) => {
    const chars = cur.reduce((a, x) => a + x.caption.length + 1, 0) + w.caption.length;
    if (cur.length && (cur.length >= capMaxWords || chars > capMaxChars)) flush();
    cur.push(w);
    if (/[,.?!।:;]$/.test(w.caption.replace(/\*/g, "")) && cur.length >= 2 && i < L.words.length - 1) flush();
  });
  flush();
}
for (const g of groups) g.start = r3(g.L.start + g.words[0].start - 0.06);
groups.forEach((g, i) => {
  const next = groups[i + 1];
  const lineEnd = g.L.end + 0.2;
  g.end = r3(next && next.L === g.L ? next.start : Math.min(lineEnd, next ? next.start : lineEnd));
});
const capFont = r3((format === "9:16" ? 64 : 54) * u);
const capHtml = `<template>
<div id="caproot" data-composition-id="captions" data-width="${F.W}" data-height="${F.H}" data-duration="${TOTAL}">
  <style>
${fontFaces}
    #caproot{position:absolute;inset:0;pointer-events:none;${vars}}
    .cpg{visibility:hidden;position:absolute;left:${r3(F.W * 0.06)}px;right:${r3(F.W * 0.06)}px;top:${F.captions.y}px;height:${F.captions.h}px;display:flex;align-items:center;justify-content:center;text-align:center;opacity:0;
      font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:${capFont}px;line-height:1.18;letter-spacing:-0.01em;color:var(--text);text-shadow:0 ${r3(3 * u)}px ${r3(22 * u)}px ${T.bg}}
    .cpg span{opacity:0.36} .cpg span.ck{color:var(--primary)}
  </style>
${groups.map((g, i) => `  <div class="cpg" id="cpg${i}" data-layout-allow-overlap><div>${g.words.map((w, j) => {
    const key = /\*/.test(w.caption);
    return `<span id="cpw${i}x${j}"${key ? ' class="ck"' : ""}>${esc(w.caption.replace(/\*/g, ""))}</span>`;
  }).join(" ")}</div></div>`).join("\n")}
  <script src="${GSAP}"></script>
  <script>
  (function(){
    var tl = gsap.timeline({ paused: true });
${groups.map((g, i) => [
    `tl.set("#cpg${i}",{visibility:"visible"},${g.start});`,
    `tl.fromTo("#cpg${i}",{opacity:0,y:${r3(12 * u)}},{opacity:1,y:0,duration:0.14,ease:"power2.out"},${g.start});`,
    ...g.words.map((w, j) => `tl.to("#cpw${i}x${j}",{opacity:1,duration:0.08},${r3(g.L.start + w.start)});`),
    `tl.set("#cpg${i}",{opacity:0,visibility:"hidden"},${g.end});`,
  ].map((l) => "    " + l).join("\n")).join("\n")}
    tl.to({}, { duration: ${TOTAL} }, 0);
    window.__timelines["captions"] = tl;
  })();
  </script>
</div>
</template>
`;
fs.writeFileSync(path.join(ovDir, "captions.html"), capHtml);

// ---------- progress strip overlay (optional, topic-specific steps) ----------
let chromeHost = "";
if (sb.steps?.length) {
  const n = sb.steps.length, gap = r3(12 * u);
  const pw = r3((F.W - 2 * F.stage.x - gap * (n - 1)) / n);
  const chromeHtml = `<template>
<div id="chrroot" data-composition-id="chrome" data-width="${F.W}" data-height="${F.H}" data-duration="${TOTAL}">
  <style>
${fontFaces}
    #chrroot{position:absolute;inset:0;pointer-events:none;${vars}}
    .chs{position:absolute;top:${F.chrome.y}px;left:${F.stage.x}px;display:flex;gap:${gap}px;opacity:0}
    .chp{width:${pw}px;height:${F.chrome.h}px;display:flex;align-items:center;justify-content:center;gap:${r3(8 * u)}px;border-radius:${r3(12 * u)}px;
      border:${r3(2 * u)}px solid var(--border);background:var(--card);color:var(--faint);font-family:"Space Mono",monospace;font-weight:700;font-size:${r3(28 * u)}px;letter-spacing:0.01em;text-transform:uppercase;white-space:nowrap;overflow:hidden}
  </style>
  <div class="chs" id="chs">${sb.steps.map((l, i) => `<div class="chp" id="chp${i}">${esc(l)}</div>`).join("")}</div>
  <script src="${GSAP}"></script>
  <script>
  (function(){
    var tl = gsap.timeline({ paused: true });
    tl.fromTo("#chs",{opacity:0,y:${r3(-16 * u)}},{opacity:1,y:0,duration:0.4,ease:"power2.out"},0.1);
${scenes.filter((sc) => sc.step != null).map((sc) => sb.steps.map((_, i) => {
    const st = i < sc.step ? { backgroundColor: T.primarySoft, color: T.primary, borderColor: T.primarySoft }
      : i === sc.step ? { backgroundColor: T.primary, color: T.bg, borderColor: T.primary }
        : { backgroundColor: T.card, color: T.faint, borderColor: T.border };
    return `    tl.to("#chp${i}",${JSON.stringify({ ...st, duration: 0.25 })},${r3(Math.max(0, sc.start - 0.05))});`;
  }).join("\n")).join("\n")}
    tl.to({}, { duration: ${TOTAL} }, 0);
    window.__timelines["chrome"] = tl;
  })();
  </script>
</div>
</template>
`;
  fs.writeFileSync(path.join(ovDir, "chrome.html"), chromeHtml);
  chromeHost = `      <div id="el-chrome" class="overlay" data-composition-id="chrome" data-composition-src="compositions/overlays/chrome.html" data-start="0" data-duration="${TOTAL}" data-track-index="20"></div>\n`;
}

// ---------- sfx (deduped, never stacked) ----------
allSfx.sort((a, b) => a.t - b.t);
const sfxOut = [];
for (const e of allSfx) {
  if (sfxOut.length && e.t - sfxOut.at(-1).t < 0.14) continue;
  const src = path.join(SFX_DIR, `${e.name}.mp3`);
  if (!fs.existsSync(src)) { console.warn(`sfx "${e.name}" not found, skipped`); continue; }
  const dest = path.join(dir, "assets", "sfx", `${e.name}.mp3`);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  sfxOut.push({ ...e, d: r3(Math.min(1.2, dur(dest))) });
}
const laneEnds = [];
for (const e of sfxOut) {
  let k = laneEnds.findIndex((end) => end <= e.t);
  if (k < 0) { k = laneEnds.length; laneEnds.push(0); }
  laneEnds[k] = e.t + e.d;
  e.track = 30 + k;
}

// ---------- bgm ----------
const bgmName = sb.bgm || job.bgm || DEFAULT_BGM;
fs.copyFileSync(path.join(BGM_DIR, bgmName), path.join(dir, "assets", "bgm", "track.mp3"));

// ---------- index.html ----------
const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${F.W}, height=${F.H}" />
    <script src="${GSAP}"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${F.W}px; height: ${F.H}px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${T.bg}; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
      .overlay { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 50; pointer-events: none; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${TOTAL}"
      data-width="${F.W}"
      data-height="${F.H}"
    >
${scenes.map((sc, i) => `      <div
        id="el-${sc.id}"
        class="scene"
        data-composition-id="${sc.id}"
        data-composition-src="compositions/frames/${sc.id}.html"
        data-start="${sc.start}"
        data-duration="${sc.duration}"
        data-track-index="${i % 2}"
      ></div>`).join("\n")}
${lines.map((L) => `      <audio id="el-voice-${String(L.n).padStart(2, "0")}" src="${L.file}" data-start="${L.start}" data-duration="${r3(L.duration)}" data-track-index="10" data-volume="1"></audio>`).join("\n")}
${sfxOut.map((e, i) => `      <audio id="el-sfx-${i}" src="assets/sfx/${e.name}.mp3" data-start="${e.t}" data-duration="${e.d}" data-track-index="${e.track}" data-volume="${e.vol}"></audio>`).join("\n")}
      <div id="el-captions-v2" class="overlay" data-composition-id="captions" data-composition-src="compositions/overlays/captions.html" data-track-kind="captions" data-start="0" data-duration="${TOTAL}" data-track-index="21"></div>
${chromeHost}      <audio
        id="el-bgm"
        data-timeline-role="music"
        src="assets/bgm/track.mp3"
        data-start="0"
        data-duration="${TOTAL}"
        data-track-index="12"
        data-volume="${BGM_VOLUME}"
      ></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
      (function () { var tl = window.__timelines["main"];
        tl.to({}, { duration: ${TOTAL} }, 0); // full-span anchor
      })();
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(dir, "index.html"), index);
if (!fs.existsSync(path.join(dir, "hyperframes.json"))) {
  fs.writeFileSync(path.join(dir, "hyperframes.json"), JSON.stringify({
    $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
    registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
    paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
    media: { autoProxy: true },
  }, null, 2));
}

// ---------- report ----------
console.log(`built ${scenes.length} scenes, ${lines.length} lines, ${sfxOut.length} sfx, ${TOTAL.toFixed(1)}s (+ outro)`);
for (const r of report) {
  const flag = r.worst > 2.5 ? `  ⚠ ${r.worst}s with no new motion from ${r.at}s; add a beat` : "";
  console.log(`  ${r.id.padEnd(28)} ${r.dur.toFixed(1).padStart(5)}s  ${String(r.events).padStart(3)} anim events  longest still ${r.worst}s${flag}`);
}

if (FINALIZE) {
  const res = spawnSync("node", [path.join(FACTORY, "brand", "finalize-brand.mjs"), dir, `--theme=${theme}`], { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
