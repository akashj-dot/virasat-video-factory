// v2 intake scaffold: the four answers -> a new project in building/ (shows up on the
// dashboard as "Building" right away).
//
//   node v2/new.mjs --topic "Bank locker after death" --theme dark --language hinglish --format 9:16
//
// Prints the project directory. Everything else (tone, length, BGM, voice, research)
// is a default, decided by the /virasat-video workflow, not asked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FACTORY = path.dirname(HERE);
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };

const topic = arg("topic");
const theme = (arg("theme") || "dark").toLowerCase();
const language = (arg("language") || "hinglish").toLowerCase();
const format = arg("format") || "9:16";
const THEMES = ["dark", "light"], LANGS = ["hindi", "hinglish", "english"], FORMATS = ["9:16", "4:5", "1:1", "16:9"];
const bad = [];
if (!topic) bad.push("--topic is required");
if (!THEMES.includes(theme)) bad.push(`--theme must be ${THEMES.join("|")}`);
if (!LANGS.includes(language)) bad.push(`--language must be ${LANGS.join("|")}`);
if (!FORMATS.includes(format)) bad.push(`--format must be ${FORMATS.join("|")}`);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }

const base = (arg("slug") || topic).toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "")
  .trim().split(/\s+/).slice(0, 6).join("-").replace(/-+/g, "-") || "video";
let slug = base, n = 2;
const taken = (s) => ["building", "queue", "work", "done", "failed"].some((d) => fs.existsSync(path.join(FACTORY, d, s)));
while (taken(slug)) slug = `${base}-${n++}`;

const dir = path.join(FACTORY, "building", slug);
fs.mkdirSync(dir, { recursive: true });
const aspect = { "9:16": "1080x1920", "4:5": "1080x1350", "1:1": "1080x1080", "16:9": "1920x1080" }[format];
const lang = language === "english" ? "en" : language;
fs.writeFileSync(path.join(dir, "job.json"), JSON.stringify({ title: topic, language: lang, theme, format, voice: false, v2: true }, null, 2) + "\n");
fs.writeFileSync(path.join(dir, "BRIEF.md"), `---
workflow: virasat-v2
topic: "${topic.replace(/"/g, "'")}"
language: ${lang}
theme: ${theme}
format: ${format}
aspect: ${aspect}
created: ${new Date().toISOString().slice(0, 10)}
---

# ${topic}

Intake answers above. Defaults (not asked): 40-60s, tone chosen from the topic,
facts researched from public sources, cloned voice, factory BGM at 0.06, Virasat
logo + waitlist outro. Build: video-factory/v2/AUTHORING.md.
`);
console.log(dir);
