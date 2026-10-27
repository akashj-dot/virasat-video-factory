// v2 voice step: runs BEFORE the storyboard, so every animation and caption cue
// can be placed on a real spoken word instead of a guessed duration.
//
//   node v2/voice-first.mjs <projectDir> [--lines=3,7]   (--lines: redo only those lines)
//
// Input  SCRIPT.md lines in either form:
//   ## Line 1                      ## Line 1
//   spoken: <what the TTS says>    <plain text, used for both>
//   caption: <what's shown>
// For Hindi/Hinglish, `spoken` is Hindi words in Devanagari with ENGLISH words left in
// English letters ("अब family से ये documents मांगे गए"): Chatterbox mangles English
// written in Devanagari, and also mangles a line made only of English terms, so keep
// English inside a Hindi sentence. `spoken` may respell for pronunciation ("legal air").
// `caption` is Roman Hinglish with the SAME word count, so word N maps to word N.
//
// Output assets/voice/NN.wav (loudness-normalized) + timings.json:
//   { language, lines: [{ n, file, duration, words: [{ spoken, caption, start, end }] }] }
//
// Every line goes through a QA gate: Whisper transcribes it back and the transcript is
// aligned to the script. Lines that come out garbled or the wrong length get regenerated
// (Chatterbox samples randomly, so a retake usually fixes it).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const dir = path.resolve(process.argv[2] || "");
if (!process.argv[2]) { console.error("usage: node v2/voice-first.mjs <projectDir>"); process.exit(1); }
const HOME = os.homedir();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PY = path.join(HOME, ".voice-clone-venv", "bin", "python");
// Hindi/Hinglish: the multilingual checkpoint (Turbo is English-only and babbles Hindi).
// English: Turbo, the engine of every approved English video.
const TTS_MODEL_HI = "mlx-community/chatterbox-fp16", TTS_MODEL_EN = "mlx-community/chatterbox-turbo-fp16";
const WHISPER_MODEL_FILE = "ggml-large-v3-turbo-q5_0.bin";
const MAX_ATTEMPTS = 4;
const MIN_TAKES = 2;            // every line gets at least this many takes; the clearest wins
const MIN_CLEAR = 0.85;         // fraction of words that must be pronounced clearly (keywords always)
const SECS_PER_CHAR = [0.035, 0.16]; // sane speaking-rate band; turbo-on-Hindi babble lands far outside it

// ---------- language + reference voice ----------
function readLanguage() {
  const job = path.join(dir, "job.json");
  if (fs.existsSync(job)) {
    const l = JSON.parse(fs.readFileSync(job, "utf8")).language;
    if (l) return String(l).toLowerCase();
  }
  const brief = path.join(dir, "BRIEF.md");
  if (fs.existsSync(brief)) {
    const m = fs.readFileSync(brief, "utf8").match(/^language:\s*(\w+)/im);
    if (m) return m[1].toLowerCase();
  }
  return "en";
}
const LANGUAGE = readLanguage();
const TTS_LANG = LANGUAGE === "en" || LANGUAGE === "english" ? "en" : "hi"; // hinglish is voiced from Devanagari
const TTS_MODEL = TTS_LANG === "en" ? TTS_MODEL_EN : TTS_MODEL_HI;

// Hindi/Hinglish clones from a Hinglish recording when one exists (accent + rhythm
// carry over from the reference), English from the original English sample.
function referenceSample() {
  const desk = path.join(HOME, "Desktop");
  const candidates = TTS_LANG === "hi"
    ? ["voice-sample-hinglish.wav", "voice-sample-hinglish.m4a", "voice-sample-2-raw.wav"]
    : ["voice-sample-2-raw.wav"];
  for (const c of candidates) {
    const p = path.join(desk, c);
    if (!fs.existsSync(p)) continue;
    if (p.endsWith(".wav")) return p;
    const cacheDir = path.join(HERE, ".ref");
    fs.mkdirSync(cacheDir, { recursive: true });
    const wav = path.join(cacheDir, c.replace(/\.\w+$/, ".wav"));
    if (!fs.existsSync(wav) || fs.statSync(wav).mtimeMs < fs.statSync(p).mtimeMs) {
      // Chatterbox only conditions on roughly the first 10s, so pack more speech into it:
      // trim the edges, shorten long pauses, level-match. Only a LIGHT denoise: the clone
      // copies the reference's room hiss (2026-10-25: a quiet memo boosted 16 dB gave
      // audibly hissy narration), but heavy cleaning makes the voice sound processed.
      execFileSync("ffmpeg", ["-y", "-v", "error", "-i", p, "-af",
        "highpass=f=70,afftdn=nr=10:nf=-55," +
        "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.05," +
        "silenceremove=stop_periods=-1:stop_threshold=-40dB:stop_duration=0.35:stop_silence=0.3," +
        "loudnorm=I=-18:TP=-1.5:LRA=11", "-ac", "1", "-ar", "24000", wav]);
    }
    return wav;
  }
  console.error("no reference voice sample found on the Desktop"); process.exit(1);
}

function whisperModel() {
  return execFileSync(PY, ["-c",
    `from huggingface_hub import hf_hub_download as d; print(d('ggerganov/whisper.cpp','${WHISPER_MODEL_FILE}'))`],
    { encoding: "utf8" }).trim().split("\n").pop();
}

// ---------- SCRIPT.md ----------
function parseScript() {
  const p = path.join(dir, "SCRIPT.md");
  if (!fs.existsSync(p)) { console.error("no SCRIPT.md"); process.exit(1); }
  const lines = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const spoken = (cur.spoken ?? cur.plain.join(" ")).trim();
    const caption = (cur.caption ?? spoken).trim();
    if (spoken) lines.push({ n: cur.n, spoken, caption });
    cur = null;
  };
  for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
    const m = raw.match(/^##\s+Line\s+(\d+)/i);
    if (m) { flush(); cur = { n: +m[1], plain: [] }; continue; }
    if (!cur) continue;
    const t = raw.trim();
    const kv = t.match(/^(spoken|caption):\s*(.*)$/i);
    if (kv) { cur[kv[1].toLowerCase()] = kv[2]; continue; }
    if (t && !t.startsWith("**") && !t.startsWith("#")) cur.plain.push(t);
  }
  flush();
  // tested pronunciation spellings (tune-lexicon.mjs): English words the Hindi voice
  // mangles are swapped for the spelling it says most clearly. Captions are untouched.
  const lexPath = path.join(HERE, "lexicon.json");
  const lex = TTS_LANG === "hi" && fs.existsSync(lexPath) ? JSON.parse(fs.readFileSync(lexPath, "utf8")).hi || {} : {};
  for (const l of lines) {
    l.spoken = words(l.spoken).map((tok) => {
      const m = tok.match(/^([A-Za-z.]+?)([,.?!।:;]*)$/);
      const hit = m && lex[m[1].replace(/\.$/, "").toLowerCase()];
      return hit ? hit + m[2] : tok;
    }).join(" ");
  }
  const bad = lines.filter((l) => words(l.spoken).length !== words(l.caption).length);
  if (bad.length) {
    for (const l of bad) console.error(`line ${l.n}: spoken has ${words(l.spoken).length} words, caption has ${words(l.caption).length}; they must match 1:1`);
    process.exit(1);
  }
  return lines;
}

// ---------- alignment + pronunciation QA (shared) ----------
import { words, norm, similarity, CONS, VOW, MATRA, translit, skeleton, phon, LETTER, vform, isDeva, pron1, pron, CLEAR, FILLER, isFiller, isNumberish, pronQA, sim2, align, timeWords } from "./speechqa.mjs";

// ---------- audio helpers ----------
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));

function finalize(raw, out) {
  // trim edge silence (keeps 80ms of air), normalize to the factory's hot voice level
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08," +
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse," +
    "loudnorm=I=-14:TP=-1.5:LRA=8", "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", out]);
}

function transcribe(wav, model, tmp) {
  const w16 = path.join(tmp, "w16.wav"), prefix = path.join(tmp, "w16");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wav, "-ar", "16000", "-ac", "1", w16]);
  execFileSync("whisper-cli", ["-m", model, "-l", TTS_LANG, "-ml", "1", "-sow", "-oj", "-np", "-of", prefix, "-f", w16], { stdio: "ignore" });
  const j = JSON.parse(fs.readFileSync(prefix + ".json", "utf8"));
  return j.transcription
    .map((s) => ({ text: s.text.trim(), start: s.offsets.from / 1000, end: s.offsets.to / 1000 }))
    .filter((s) => norm(s.text));
}

// ---------- main ----------
const allLines = parseScript();
const only = (process.argv.find((a) => a.startsWith("--lines=")) || "").slice(8).split(",").filter(Boolean).map(Number);
const prevTimings = only.length && fs.existsSync(path.join(dir, "timings.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "timings.json"), "utf8")) : null;
if (only.length && !prevTimings) { console.error("--lines needs an existing timings.json"); process.exit(1); }
const lines = only.length ? allLines.filter((l) => only.includes(l.n)) : allLines;
const ref = referenceSample();
const wmodel = whisperModel();
const voiceDir = path.join(dir, "assets", "voice");
const tmp = path.join(dir, ".vtmp");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(voiceDir, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
console.log(`language=${LANGUAGE} tts=${TTS_LANG} ref=${path.basename(ref)} lines=${lines.length}`);

const best = new Map(); // n -> { score, file, duration, words }
let pending = lines;
for (let attempt = 1; attempt <= MAX_ATTEMPTS && pending.length; attempt++) {
  const job = path.join(tmp, "job.json");
  fs.writeFileSync(job, JSON.stringify({
    model: TTS_MODEL, ref, lang: TTS_LANG, temperature: TTS_LANG === "en" ? 0.75 : 0.7, outdir: tmp, seed: attempt * 7919 + Date.now() % 100000,
    lines: pending.map((l) => ({ id: `raw${l.n}`, text: l.spoken })),
  }));
  execFileSync(PY, [path.join(HERE, "tts_worker.py"), job], { stdio: "inherit" });

  const retry = [];
  for (const l of pending) {
    const raw = path.join(tmp, `raw${l.n}.wav`);
    if (!fs.existsSync(raw)) { retry.push(l); continue; }
    const nn = String(l.n).padStart(2, "0");
    const cand = path.join(tmp, `cand${nn}_${attempt}.wav`);
    finalize(raw, cand);
    const d = dur(cand);
    const script = words(l.spoken).map((w, i) => [w, words(l.caption)[i]]);
    const heard = transcribe(cand, wmodel, tmp);
    const match = align(script, heard);
    // pronunciation: every word scored against what Whisper heard (unmatched = 0)
    const heardDigits = heard.some((h) => /\d/.test(h.text));
    const pr = script.map((pair, i) => (match[i] ? pronQA(pair, match[i].text) : isNumberish(pair) && heardDigits ? 1 : 0));
    const counted = script.map((pair, i) => i).filter((i) => !isFiller(script[i]) || script[i][1].includes("*"));
    const clearRate = counted.filter((i) => pr[i] >= CLEAR).length / Math.max(1, counted.length);
    const unclear = counted.filter((i) => pr[i] < CLEAR).map((i) => script[i][1].replace(/\*/g, ""));
    const keysClear = script.every((pair, i) => !pair[1].includes("*") || pr[i] >= CLEAR);
    const rate = d / norm(l.spoken).length;
    const ok = clearRate >= MIN_CLEAR && keysClear && rate >= SECS_PER_CHAR[0] && rate <= SECS_PER_CHAR[1];
    const score = pr.reduce((a, b) => a + b, 0) / pr.length - (ok ? 0 : 1);
    const prev = best.get(l.n);
    const keep = !prev || score > prev.score;
    console.log(`line ${nn} take ${attempt}: ${d.toFixed(2)}s, ${(clearRate * 100).toFixed(0)}% clear` +
      (unclear.length ? ` (unclear: ${unclear.join(", ")})` : "") + (keep && prev ? "  <- better take" : ""));
    if (keep) best.set(l.n, { score, ok, unclear, cand, duration: d, timed: timeWords(script, match, d) });
    // always take at least MIN_TAKES and keep the clearest; beyond that, retry only failures
    const b = best.get(l.n);
    if ((attempt < MIN_TAKES && b.score < 0.95) || !b.ok) retry.push(l);
  }
  pending = retry;
}

const out = { language: LANGUAGE, reference: path.basename(ref), lines: prevTimings ? prevTimings.lines.filter((L) => !only.includes(L.n)) : [] };
const failed = [];
for (const l of lines) {
  const b = best.get(l.n);
  if (!b) { failed.push(l.n); continue; }
  const nn = String(l.n).padStart(2, "0");
  fs.copyFileSync(b.cand, path.join(voiceDir, `${nn}.wav`));
  const sp = words(l.spoken), cap = words(l.caption);
  out.lines.push({
    n: l.n, file: `assets/voice/${nn}.wav`, duration: +b.duration.toFixed(3), qaPassed: b.ok,
    words: b.timed.map((t, i) => ({ spoken: sp[i], caption: cap[i], ...t })),
  });
  if (!b.ok) failed.push(`${l.n} (${b.unclear.join(", ") || "length"})`);
}
out.lines.sort((a, b) => a.n - b.n);
fs.writeFileSync(path.join(dir, "timings.json"), JSON.stringify(out, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`timings.json written (${out.lines.length} lines)`);
if (failed.length) {
  console.error(`QA still failing after ${MAX_ATTEMPTS} tries on line(s): ${failed.join(", ")}; rewrite those lines (shorter, simpler words) and rerun`);
  process.exit(2);
}
