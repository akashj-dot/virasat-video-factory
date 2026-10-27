# Factory v2: how to author a video

v2 replaces the "one frame per narration line" build with **voice first, then visuals
timed to spoken words**. Pipeline:

```
job.json + SCRIPT.md ──> node v2/voice-first.mjs <dir> ──> assets/voice/*.wav + timings.json
storyboard.mjs ───────> node v2/build.mjs <dir>       ──> full HyperFrames project + brand finalize
                        npx hyperframes check / snapshot / render
```

## 1. Intake (only four questions)

Topic, theme (dark | light), language (hindi | hinglish | english), format
(9:16 | 4:5 | 1:1 | 16:9). Everything else is a default. Write `job.json`:

```json
{ "title": "...", "language": "hinglish", "theme": "dark", "format": "9:16", "voice": false, "v2": true }
```

`voice: false` stops the runner from re-voicing (v2 voices at authoring time; re-voicing
later would desync captions from audio).

## 2. SCRIPT.md

```
## Line 3
spoken: क्योंकि nominee का column खाली था।
caption: Kyunki *nominee* ka column khaali tha.
```

- **One line = one short sentence, 5 to 11 words.** Scenes group 2 to 3 lines.
- `spoken` (Hindi/Hinglish): Hindi words in Devanagari, **English words in English
  letters**. English written in Devanagari gets mispronounced.
- **Never a line made only of English terms**: the voice garbles it. Keep English
  inside a Hindi sentence ("जैसे death certificate, और ...").
- `spoken` may respell for pronunciation; `caption` shows the correct form.
  Known fixes: "legal heir" is unsayable (use "वारिसों का certificate"), NOC as
  "एन-ओ-सी", "minute" needs Hindi around it ("बस पांच मिनट").
- Numbers: spoken in Hindi words (बारह लाख), caption in digits (12 lakh).
- `spoken` and `caption` must have the **same word count** (word N = word N).
- `*word*` in captions = accent keyword (one word per asterisk pair).
- English videos: plain lines, no spoken/caption split needed.
- No em dashes anywhere. Put facts to verify at the top of SCRIPT.md.

- Pronunciation: `v2/lexicon.json` holds tested spellings (mostly Devanagari, e.g.
  nominee → नॉमिनी, RBI → आर-बी-आई) and is applied to `spoken` automatically, so just write
  English words in English letters. A new problem word: `node v2/tune-lexicon.mjs
  word=variant1,variant2,...` (voices each spelling 3x and keeps the clearest). Re-tune
  after changing the reference voice sample.
- Words at the very end of a sentence get swallowed ("lakh थे।" sounded like "laag");
  give them a following word ("lakh rupaye the").

Run `node v2/voice-first.mjs <dir>` (add `--lines=3,7` to redo only some lines). Every line is transcribed back by Whisper and
retaken (up to 3 tries) if garbled. A line still failing after 3 tries needs rewording.

## 3. storyboard.mjs

```js
export default {
  steps: ["Claim", "Documents", "Court", "RBI", "Fix"], // optional progress strip
  pauses: { 6: 0.7 },                                    // optional extra silence after a line
  bgm: "<file in BGM Sound/>",                          // optional
  scenes: [
    { slug: "claim-rejected", lines: [1, 3], step: 0, build(s) { /* ... */ } },
  ],
};
```

### Rules that make it look like the reference, not a slideshow

1. **Show the mechanism, not the sentence.** The screen acts out what the voice says
   (a form being rejected, money moving to a fund, documents piling up). Never put
   the narration itself on screen; captions already do that.
2. **A new visual event at least every ~2s.** `build.mjs` prints "longest still" per
   scene and flags anything over 2.5s.
3. **Fire events on spoken words**, not guessed seconds.
4. Scene 1 must have its main object on screen at t=0 (it's the thumbnail).
5. Each scene uses a different primary component (form, rows, flow, stat...).

### Stage and cues

Stage is `s.stage.w x s.stage.h` (9:16: 960 x 940, kept clear of Instagram's header, bottom UI and buttons). Positions are px inside it.

Cue spec: `"nominee"` (first match in scene), `"nominee#2"`, `"nominee.end"`, `"L3"`,
`"L3.end"`, `"L3:paisa"`, seconds as a number, or `[cue, offset]`.
Unknown cues fail the build with the list of available words.

### Components (all return a handle)

Every handle: `.in(at, how)` (how: rise drop left right pop zoom fade), `.out(at)`,
`.dim(at)`, `.undim(at)`, `.pulse(at)`, `.shake(at)`, `.mark(at, "neg"|"primary")`
(accent ring), `.strike(at)`, `.move(at, {x, y, scale})`.
Anything placed but never `.in()`-ed is visible from the start.

| Component | Extra methods |
|---|---|
| `s.text(str, {x,y,w,size,font:"display"/"body"/"mono",align})` | `.words(at)` stagger, `.say(lineN)` each word lands as spoken |
| `s.tag(str, {x,y,tone:"accent"/"solid"/"neg"/"muted",icon})` | |
| `s.icon(name, {x,y,size,tone,ring})` | names in `kit.mjs` ICONS |
| `s.panel({x,y,w,h,title,meta,tone})` | children: pass `parent: panel` |
| `s.form({x,y,w,h,title,meta,fields:[{label,value}]})` | `.fill(i, at)` types value, `.flag(i, at, "bad"/"ok", label)` |
| `s.rows(items, {x,y,w})` items `{icon,label,sub,value}` | `.row(i, at)`, `.all(at)`, `.status(i, at, "ok"/"bad"/"wait", label)` |
| `s.flow(nodes, {x,y,w,dir:"down"/"right"})` | `.step(i, at)`, `.break(i, at)` |
| `s.chat(msgs, {x,y,w})` msgs `{from:"me"/"them",name,text}` | `.msg(i, at)` with typing dots |
| `s.stat({x,y,w,value,prefix,suffix,label,size,align})` | `.count(at, dur)` en-IN formatting |
| `s.progress({x,y,w,label,meta,ticks,tone})` | `.fill(pct, at, dur)` |
| `s.bars(data, {x,y,w,h})` data `{label,value,display,tone}` | `.bar(i, at)`, `.all(at)` |
| `s.people(n, {x,y,w,cols})` | `.in(at)`, `.color(k, at, tone)` |
| `s.doc({x,y,w,title,lines,sign})` | `.stamp(text, at, tone)` |
| `s.stamp(str, {x,y,size,tone:"neg"/"pos",rotate})` | `.in(at)` slams with impact sfx |
| `s.arrow({from:[x,y], to:[x,y], tone})` | `.in(at)` draws |
| `s.camera(at, {scale,x,y,d})` | slow push on the whole stage |

Sound effects are attached automatically (stamp impact, row clicks, chat pings,
typing) and deduped; `s.sfx(name, at, vol)` adds one by hand.

## 4. Build, check, render

```bash
node v2/build.mjs <dir>              # also runs brand/finalize-brand.mjs (logo + outro)
cd <dir> && npx hyperframes check    # must pass with 0 errors
npx hyperframes snapshot --at 1,5,10 # eyeball frames
```

Then move the folder to `queue/` (job.json has `voice:false`, so the runner only renders).
