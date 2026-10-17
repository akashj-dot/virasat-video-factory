// Universal voice step — the reliable replacement for the template-coupled revoice.py.
// Reads SCRIPT.md, generates one cloned-voice WAV per line into assets/voice/NN.wav,
// loudness-normalized. No storyboard/assemble coupling — works for ANY composition that
// references assets/voice/NN.wav in <audio> elements. Usage: node voice.mjs <projectDir>
//
// Voice cloning backend is platform-specific (per "Views on Autopilot" ch. 4B):
// Mac (darwin) uses Chatterbox via mlx_audio — Apple Silicon only, MLX doesn't run
// elsewhere. Windows uses Coqui XTTS v2 (voice-windows-xtts.py) as the free local
// equivalent. Both paths feed the same ffmpeg loudness chain below.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const dir = process.argv[2];
if (!dir) { console.error("usage: node voice.mjs <projectDir>"); process.exit(1); }
const HOME = os.homedir();
const PLATFORM = os.platform();
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(HOME, "Desktop", "voice-sample-2-raw.wav");

const MAC_VENV_PY = path.join(HOME, ".voice-clone-venv", "bin", "python");
const MAC_MODEL = "mlx-community/chatterbox-turbo-fp16";

const WIN_VENV_PY = path.join(HOME, ".voice-clone-venv", "Scripts", "python.exe");
const WIN_XTTS_SCRIPT = path.join(SCRIPT_DIR, "voice-windows-xtts.py");
const WIN_LANGUAGE = process.env.VOICE_LANG || "en";

// Generates one line's raw (unnormalized) clone WAV into `tmp`, named `${prefix}...wav`.
// Returns the generated filename (relative to tmp), or undefined on failure.
function generateClone(spoken, tmp, prefix) {
  if (PLATFORM === "darwin") {
    if (!fs.existsSync(MAC_VENV_PY)) {
      console.error(`Mac voice-clone venv not found at ${MAC_VENV_PY}. See video-factory/brand/README.md.`);
      process.exit(1);
    }
    execFileSync(MAC_VENV_PY, ["-m", "mlx_audio.tts.generate", "--model", MAC_MODEL, "--text", spoken,
      "--ref_audio", REF, "--output_path", tmp, "--file_prefix", prefix], { stdio: "ignore" });
    return fs.readdirSync(tmp).filter((f) => f.startsWith(prefix) && f.endsWith(".wav")).sort()[0];
  }
  if (PLATFORM === "win32") {
    if (!fs.existsSync(WIN_VENV_PY)) {
      console.error(
        `Windows voice-clone venv not found at ${WIN_VENV_PY}.\n` +
        `One-time setup: python -m venv .voice-clone-venv, activate it, then ` +
        `pip install torch torchaudio coqui-tts — see the team guide's Windows voice cloning section.`
      );
      process.exit(1);
    }
    const outFile = path.join(tmp, `${prefix}.wav`);
    execFileSync(WIN_VENV_PY, [WIN_XTTS_SCRIPT, "--text", spoken, "--ref_audio", REF,
      "--output_path", outFile, "--language", WIN_LANGUAGE], { stdio: "ignore" });
    return fs.existsSync(outFile) ? path.basename(outFile) : undefined;
  }
  console.error(`Voice cloning isn't wired up for platform "${PLATFORM}" (only darwin/win32 are supported).`);
  process.exit(1);
}

// Parse SCRIPT.md: "## Line N (...)" headers, spoken text on following line(s).
function parseLines(scriptPath) {
  const text = fs.readFileSync(scriptPath, "utf8").split("\n");
  const lines = [];
  let cur = null, buf = [];
  const flush = () => { if (cur != null && buf.length) lines.push({ n: cur, text: buf.join(" ").trim() }); buf = []; };
  const hdr = /^##\s+Line\s+(\d+)/i;
  for (const ln of text) {
    const m = ln.match(hdr);
    if (m) { flush(); cur = parseInt(m[1], 10); continue; }
    if (cur == null) continue;
    const t = ln.trim();
    if (t && !t.startsWith("**") && !t.startsWith("#")) buf.push(t);
  }
  flush();
  return lines;
}

const scriptPath = path.join(dir, "SCRIPT.md");
if (!fs.existsSync(scriptPath)) { console.error("no SCRIPT.md"); process.exit(1); }
const lines = parseLines(scriptPath);
if (!lines.length) { console.error("no lines parsed from SCRIPT.md"); process.exit(1); }

const voiceDir = path.join(dir, "assets/voice");
const tmp = path.join(dir, ".vtmp");
fs.mkdirSync(voiceDir, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

for (const { n, text } of lines) {
  const nn = String(n).padStart(2, "0");
  // "buildcheap.app" etc. reads better spoken with "dot"
  const spoken = text.replace(/\b([a-z0-9-]+)\.(app|io|com|host)\b/gi, "$1 dot $2");
  const prefix = `line${nn}`;
  for (const f of fs.readdirSync(tmp)) if (f.startsWith(prefix)) fs.rmSync(path.join(tmp, f));
  const raw = generateClone(spoken, tmp, prefix);
  if (!raw) { console.error(`no wav for line ${n}`); process.exit(1); }
  // loudness-normalize to hot voice (~-14 LUFS), 24k mono
  execFileSync("ffmpeg", ["-y", "-i", path.join(tmp, raw), "-af", "loudnorm=I=-14:TP=-1.5:LRA=8",
    "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", path.join(voiceDir, `${nn}.wav`)], { stdio: "ignore" });
  console.log(`voice ${nn}: ${text.slice(0, 40)}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`voiced ${lines.length} lines -> assets/voice/`);
