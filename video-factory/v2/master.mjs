// v2 final audio master: brings the rendered mix to -14 LUFS (same level as v1 videos
// and typical Reels/Shorts loudness), two-pass loudnorm, video stream copied untouched.
//   node v2/master.mjs <video.mp4>       (rewrites the file in place)
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

const mp4 = process.argv[2];
if (!mp4 || !fs.existsSync(mp4)) { console.error("usage: node v2/master.mjs <video.mp4>"); process.exit(1); }
const TARGET = "I=-14:TP=-1.5:LRA=11";

// pass 1: measure (loudnorm reports on stderr)
const res = spawnSync("ffmpeg", ["-hide_banner", "-i", mp4, "-vn", "-af", `loudnorm=${TARGET}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const log = res.stderr;
const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
const second = `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const tmp = mp4.replace(/\.mp4$/, ".mastered.mp4");
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp4, "-map", "0", "-c:v", "copy", "-af", second, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp]);
fs.renameSync(tmp, mp4);
console.log(`mastered ${mp4}: ${m.input_i} LUFS -> -14 LUFS`);
