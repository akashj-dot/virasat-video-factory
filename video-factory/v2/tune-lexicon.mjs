// Pronunciation tuner: for each English word the Hindi voice keeps mangling, try several
// spellings inside a neutral Hindi carrier sentence, voice each a few times, and keep the
// spelling Whisper hears most clearly. Winners go to v2/lexicon.json, which voice-first.mjs
// applies automatically to every `spoken:` line.
//
//   node v2/tune-lexicon.mjs                    # tune the default problem words
//   node v2/tune-lexicon.mjs pension=pension,पेंशन,पैंशन   # add/retune specific words
//
// Re-run whenever the reference voice sample changes: pronunciation follows the sample.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { words, norm, align, pron, CLEAR } from "./speechqa.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PY = path.join(os.homedir(), ".voice-clone-venv", "bin", "python");
const REF = path.join(HERE, ".ref", "voice-sample-hinglish.wav");
const LEX = path.join(HERE, "lexicon.json");
const TAKES = 3;
const CARRIER = (w) => `मुझे आज ये ${w} वाली बात समझ आई।`;

const DEFAULTS = {
  nominee: ["nominee", "नॉमिनी", "नोमिनी", "nomini"],
  column: ["column", "कॉलम", "कालम", "kolam"],
  RBI: ["RBI", "आर-बी-आई", "आरबीआई", "R.B.I."],
  fund: ["fund", "फंड", "फ़ंड"],
  simple: ["simple", "सिंपल", "सिम्पल"],
  add: ["add", "ऐड", "एड"],
  certificate: ["certificate", "सर्टिफिकेट", "सर्टिफ़िकेट"],
  court: ["court", "कोर्ट", "कोट"],
  account: ["account", "अकाउंट", "एकाउंट"],
  bank: ["bank", "बैंक"],
  claim: ["claim", "क्लेम"],
  documents: ["documents", "डॉक्यूमेंट्स", "डॉक्युमेंट्स"],
};
const custom = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.split("="); return [k, v.split(",")]; }));
const TARGETS = Object.keys(custom).length ? custom : DEFAULTS;

if (!fs.existsSync(REF)) { console.error(`no prepared reference at ${REF}; run voice-first.mjs on any Hinglish project first`); process.exit(1); }
const wmodel = execFileSync(PY, ["-c", "from huggingface_hub import hf_hub_download as d; print(d('ggerganov/whisper.cpp','ggml-large-v3-turbo-q5_0.bin'))"], { encoding: "utf8" }).trim().split("\n").pop();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lex-"));

const jobs = [];
for (const [word, variants] of Object.entries(TARGETS))
  variants.forEach((v, vi) => { for (let t = 0; t < TAKES; t++) jobs.push({ id: `${word}__${vi}__${t}`, word, v, text: CARRIER(v) }); });
fs.writeFileSync(path.join(tmp, "job.json"), JSON.stringify({ model: "mlx-community/chatterbox-fp16", ref: REF, lang: "hi", temperature: 0.7, outdir: tmp, seed: Date.now() % 100000, lines: jobs.map(({ id, text }) => ({ id, text })) }));
console.log(`voicing ${jobs.length} test clips (${Object.keys(TARGETS).length} words)...`);
execFileSync(PY, [path.join(HERE, "tts_worker.py"), path.join(tmp, "job.json")], { stdio: "ignore" });

const scores = {};
for (const j of jobs) {
  const wav = path.join(tmp, `${j.id}.wav`), w16 = path.join(tmp, "w16.wav"), pre = path.join(tmp, "w16");
  if (!fs.existsSync(wav)) continue;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wav, "-ar", "16000", "-ac", "1", w16]);
  execFileSync("whisper-cli", ["-m", wmodel, "-l", "hi", "-ml", "1", "-sow", "-oj", "-np", "-of", pre, "-f", w16], { stdio: "ignore" });
  const heard = JSON.parse(fs.readFileSync(pre + ".json", "utf8")).transcription.map((s) => ({ text: s.text.trim() })).filter((s) => norm(s.text));
  const carrier = words(CARRIER(j.v)).map((w) => [w, w]);
  const k = carrier.findIndex((p) => p[0] === j.v.split(/\s+/)[0]);
  carrier[k] = [j.v, j.word];                      // judge the target against its real English form
  const m = align(carrier, heard);
  const s = m[k] ? pron(carrier[k], m[k].text) : 0;
  ((scores[j.word] ??= {})[j.v] ??= []).push({ s, heard: m[k]?.text ?? "-" });
}

const lex = fs.existsSync(LEX) ? JSON.parse(fs.readFileSync(LEX, "utf8")) : { hi: {} };
for (const [word, byV] of Object.entries(scores)) {
  const ranked = Object.entries(byV).map(([v, r]) => ({ v, avg: r.reduce((a, x) => a + x.s, 0) / r.length, clear: r.filter((x) => x.s >= CLEAR).length, heard: r.map((x) => x.heard) }))
    .sort((a, b) => b.clear - a.clear || b.avg - a.avg);
  const win = ranked[0];
  console.log(`\n${word}:`);
  for (const r of ranked) console.log(`  ${r === win ? "★" : " "} ${r.v.padEnd(14)} clear ${r.clear}/${TAKES}  avg ${r.avg.toFixed(2)}  heard: ${r.heard.join(" | ")}`);
  if (win.v.toLowerCase() !== word.toLowerCase()) lex.hi[word.toLowerCase()] = win.v;
  else delete lex.hi[word.toLowerCase()];
}
fs.writeFileSync(LEX, JSON.stringify(lex, null, 2) + "\n");
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nlexicon.json: ${JSON.stringify(lex.hi)}`);
