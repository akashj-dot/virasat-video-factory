// Shared speech QA: word alignment + pronunciation scoring (voice-first.mjs, tune-lexicon.mjs).
// ---------- alignment ----------
const words = (s) => s.split(/\s+/).filter(Boolean);
const norm = (w) => w.normalize("NFC").toLowerCase().replace(/[\p{P}\p{S}़]/gu, ""); // drop punctuation + nukta

function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

// Whisper writes the same spoken word in either script (नॉमिनी / nominee), so words are
// also compared as a script-free consonant skeleton: Devanagari is transliterated, then
// aspiration and vowels are dropped and look-alike consonants merged.
const CONS = { क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "n", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n", ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "f", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h" };
const VOW = { अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऑ: "o" };
const MATRA = { "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ं": "n", "ँ": "n", "ः": "h" };
function translit(w) {
  const s = w.normalize("NFD").replace(/़/g, "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i], next = s[i + 1];
    if (CONS[c]) { out += CONS[c]; if (next && !MATRA[next] && next !== "्" && CONS[next]) out += "a"; }
    else if (VOW[c]) out += VOW[c];
    else if (MATRA[c]) out += MATRA[c];
    else if (c !== "्") out += c;
  }
  return out;
}
function skeleton(w) {
  let s = translit(norm(w)).toLowerCase().replace(/[^a-z0-9]/g, "");
  s = s.replace(/c(?=[eiy])/g, "s").replace(/ch/g, "C").replace(/c|q/g, "k").replace(/ph/g, "f").replace(/w/g, "v").replace(/z/g, "j").replace(/x/g, "ks");
  s = s.replace(/([kgCjtdpbs])h/g, "$1");
  const cons = s.slice(0, 1) + s.slice(1).replace(/[aeiouy]/g, "");
  return cons.replace(/(.)\1+/g, "$1");
}
const phon = (a, b) => { const x = skeleton(a), y = skeleton(b); return x && y ? similarity(x, y) : 0; };

// Pronunciation check (stricter than alignment): vowels are kept, so "naumine" no longer
// passes for "nominee" and "kolang" fails for "column". Only long/short pairs are merged.
// acronyms are spoken as letter names: RBI -> "ar bi ai"
const LETTER = { A: "e", B: "bi", C: "si", D: "di", E: "i", F: "ef", G: "ji", H: "ech", I: "ai", J: "je", K: "ke", L: "el", M: "em",
  N: "en", O: "o", P: "pi", Q: "kyu", R: "ar", S: "es", T: "ti", U: "yu", V: "vi", W: "dablyu", X: "eks", Y: "vai", Z: "jed" };
function vform(w) {
  const bare = w.replace(/[^\p{L}\p{N}]/gu, "");
  if (/^[A-Z]{2,5}$/.test(bare)) w = [...bare].map((c) => LETTER[c]).join("");
  let s = translit(norm(w)).toLowerCase().replace(/[^a-z0-9]/g, "");
  s = s.replace(/c(?=[eiy])/g, "s").replace(/ch/g, "C").replace(/c|q/g, "k").replace(/ph/g, "f").replace(/w/g, "v").replace(/z/g, "j").replace(/x/g, "ks");
  s = s.replace(/([kgCjtdpbs])h/g, "$1").replace(/ee|ea/g, "i").replace(/oo/g, "u").replace(/aa/g, "a").replace(/ai|ay/g, "e").replace(/y$/, "i").replace(/a$/, "");
  return s.replace(/(.)\1+/g, "$1");
}
const isDeva = (w) => /[ऀ-ॿ]/.test(w);
// short words get a stricter bar: one wrong sound in "saal" or "lag" is a real slip
const pron1 = (f, h) => {
  const x = vform(f), y = vform(h);
  const best = Math.max(isDeva(f) === isDeva(h) ? similarity(f, h) : 0, x && y ? similarity(x, y) : 0);
  return Math.max(x.length, y.length) <= 4 && best < 1 ? best - 0.1 : best;
};
const pron = (pair, h) => Math.max(pron1(pair[0], h), pron1(pair[1], h));
const CLEAR = 0.65;
// Listeners don't notice slurred filler words, and Whisper writes numbers as digits
// ("78,000" for "78 hazaar"), so neither may fail a take. Content words stay strict.
const FILLER = new Set("ka ke ki ko se hai hain ho toh to par pe ab yeh ye woh vo aur jo mein me ne the tha thi bhi hi koi kar na nahi".split(" "));
const isFiller = (pair) => FILLER.has(norm(pair[1]).replace(/\*/g, ""));
const isNumberish = (pair) => /\d/.test(pair[1]) || /^(hazaar|hazar|lakh|crore|sau)$/.test(norm(pair[1]).replace(/\*/g, ""));
const pronQA = (pair, h) => (isNumberish(pair) && /\d/.test(h) ? 1 : pron(pair, h));

// Needleman-Wunsch over words: script tokens vs Whisper tokens (which carry times).
// Script tokens are [spoken, caption] pairs; a heard word may match either form.
const sim2 = (pair, h) => Math.max(similarity(pair[0], h), similarity(pair[1], h), phon(pair[0], h), phon(pair[1], h));
function align(script, heard) {
  const n = script.length, m = heard.length, GAP = -0.4;
  const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { S[i][0] = i * GAP; B[i][0] = 1; }
  for (let j = 1; j <= m; j++) { S[0][j] = j * GAP; B[0][j] = 2; }
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const diag = S[i - 1][j - 1] + sim2(script[i - 1], heard[j - 1].text) * 2 - 1;
      const up = S[i - 1][j] + GAP, left = S[i][j - 1] + GAP;
      if (diag >= up && diag >= left) { S[i][j] = diag; B[i][j] = 0; }
      else if (up >= left) { S[i][j] = up; B[i][j] = 1; }
      else { S[i][j] = left; B[i][j] = 2; }
    }
  const match = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 || j > 0;) {
    if (i > 0 && j > 0 && B[i][j] === 0) {
      if (sim2(script[i - 1], heard[j - 1].text) >= 0.5) match[i - 1] = heard[j - 1];
      i--; j--;
    } else if (i > 0 && (j === 0 || B[i][j] === 1)) i--;
    else j--;
  }
  return match;
}

// Matched words keep Whisper's times; unmatched runs are spread across the gap
// between their matched neighbours, weighted by word length.
function timeWords(script, match, duration) {
  const out = script.map((pair, i) => ({ w: pair[1], start: match[i]?.start, end: match[i]?.end }));
  let i = 0;
  while (i < out.length) {
    if (out[i].start != null) { i++; continue; }
    let j = i;
    while (j < out.length && out[j].start == null) j++;
    const from = i > 0 ? out[i - 1].end : 0;
    const to = j < out.length ? out[j].start : duration;
    const weights = out.slice(i, j).map((o) => norm(o.w).length + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = from;
    for (let k = i; k < j; k++) {
      const len = ((to - from) * weights[k - i]) / total;
      out[k].start = t; out[k].end = t + len; t += len;
    }
    i = j;
  }
  for (let k = 1; k < out.length; k++) out[k].start = Math.max(out[k].start, out[k - 1].end);
  return out.map((o) => ({ start: +o.start.toFixed(3), end: +Math.max(o.end, o.start).toFixed(3) }));
}


export { words, norm, similarity, CONS, VOW, MATRA, translit, skeleton, phon, LETTER, vform, isDeva, pron1, pron, CLEAR, FILLER, isFiller, isNumberish, pronQA, sim2, align, timeWords };
