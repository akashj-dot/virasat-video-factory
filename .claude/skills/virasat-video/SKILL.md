---
name: virasat-video
description: Make a Virasat explainer video (Reels/Shorts/feed/YouTube) with the v2 factory from just four answers, topic, theme, language and format. Use whenever anyone in this folder asks for a new Virasat video, a reel, or a batch of videos. Asks only those four questions, then researches, scripts, voices, storyboards, builds, self-reviews and queues the render with no further questions.
---

# /virasat-video: four questions in, finished video out

You are the whole production team. Ask the four intake questions, then work
autonomously to a queued render. Do not ask anything else: tone, length, music,
voice, facts and visuals are your calls. All paths are relative to
`video-factory/` (the folder next to this repo's CLAUDE.md).

Read `v2/AUTHORING.md` before step 4; it is the API and script reference.
This skill is the process and the quality bar.

## 0. Factory running

If nothing listens on port 4300 (`lsof -i :4300 -sTCP:LISTEN`), run
`../start-factory.sh` (repo root) so the dashboard shows progress.

## 1. Intake: exactly four answers

- **Topic**: take it from the request or the command arguments. If missing,
  ask in one plain sentence (it is free text, so not a multiple-choice question).
  Several topics means a batch: same three answers below for all, unless told otherwise.
- **Theme, language, format**: one `AskUserQuestion` call with these three questions:
  - Theme: Dark (Recommended) / Light
  - Language: Hinglish (Recommended) / Hindi / English
  - Format: Reels 9:16 (Recommended) / Feed 4:5 / Square 1:1 / YouTube 16:9
  Skip any the user already answered. Never add a fifth question.

Then: `node v2/new.mjs --topic "<topic>" --theme <dark|light> --language <hinglish|hindi|english> --format <9:16|4:5|1:1|16:9>`
It prints the project dir (`building/<slug>`); work there.

## 2. Research (facts are the product)

2-4 web searches, preferring primary sources (RBI, SEBI, IRDAI, EPFO, gazette,
Income Tax, court judgments, government portals). Write `RESEARCH.md`: each
fact, its source URL, and the date. Use only facts you can source; anything
uncertain is phrased qualitatively or dropped. Every number on screen must be
in RESEARCH.md. Topics are Virasat's world: inheritance, nominees, wills,
claims, insurance, unclaimed money, family financial paperwork.

## 3. Script (`SCRIPT.md`, AUTHORING.md section 2 format)

- 40-60 seconds: 10-16 lines, one short sentence each (5-11 words).
- Shape: **hook** (a person it happened to, or a startling true fact) →
  **mechanism** (what actually happens, step by step) → **consequence** →
  **fix** (the concrete action, how long it takes) → **last line = the action**.
- Virasat promotion is automatic (logo + waitlist outro are appended). Do not
  name Virasat in the script; end on the problem being solved so the
  outro's "We're building the fix for this" lands as the answer.
- Hinglish: Hindi words in Devanagari, English words in English letters, as
  people actually speak; `caption` in Roman with the same word count. Hindi:
  mostly Hindi words, same caption rule. Numbers spoken as words, captioned as
  digits. Mark 1-2 keywords per line with `*word*`.
- No em dashes anywhere. Plain language, no jargon without an example.

## 4. Voice

`node v2/voice-first.mjs building/<slug>`. Lines that fail QA print the
unclear words. Fix, then rerun only those lines with `--lines=3,7`:
- An English word mangled in Hindi: `node v2/tune-lexicon.mjs word=v1,v2,v3`
  (Latin, Devanagari, hyphenated spellings) and rerun the line.
- A swallowed sentence-final word: give it a following word.
- A rushed short line: add a comma or a word.
Two repair rounds at most; then keep the best takes and note the line in your report.

## 5. Storyboard (`storyboard.mjs`, AUTHORING.md section 3 API)

This is where quality is decided. Hold every scene to these:
1. **Show the mechanism, not the sentence.** Every scene is an object doing
   something: a form being filled or rejected, a ledger, documents piling up,
   money moving to a fund, a chat with the bank, a timeline filling. Never
   put the narration on screen as text; captions already do.
2. **A new visual event at least every 2 seconds**, fired on spoken words.
3. **Scenes of 2-3 lines**, each built around a different main component.
4. **Scene 1 is the thumbnail**: its main object is visible at t=0, with a slow
   `s.camera` push.
5. **The last beat of every scene fires a word or two before the scene ends**
   so it can be read.
6. **Progress strip**: `steps` of 3-5 labels, at most 9 characters each for
   9:16 (`Claim`, `Documents`, `Court`, `Fix`); every scene sets `step`.
7. Design for the stage of the chosen format (`s.stage.w x s.stage.h`):
   9:16 is 960x950 (kept clear of Instagram's UI), 4:5 is 960x800, 1:1 is 960x640, 16:9 is 1720x700. The
   builder auto-centres and enlarges a scene that fits, but it must shrink one
   that overflows, which pushes labels under the 28px phone floor. So on the
   shorter formats use fewer elements per scene (2-3 rows, not 4) and on 16:9
   put things side by side instead of stacked.
8. One stamp-slam and one big stat per video at most; they lose power when repeated.

## 6. Build and self-review (the quality gate)

```bash
node v2/build.mjs building/<slug>                      # also adds logo + outro
cd building/<slug> && npx hyperframes check            # 0 errors required
npx hyperframes snapshot --at <midpoint of each scene>
```
Read the contact sheet like a viewer would. Fix and rebuild until:
- `check` shows 0 errors and no `line_unread`, `content_overlap` or `text_below_floor`;
- no scene's "longest still" exceeds 2.5s;
- no scene looks empty or top-heavy at its midpoint, nothing overlaps, and
  every frame is readable on a phone.
At most three fix rounds; then ship and list what's imperfect.

## 7. Hand off and report

`mv building/<slug> queue/<slug>`. The runner renders, masters to -14 LUFS and
drops the MP4 in `output/` and `~/Desktop/ready-to-post/` (job.json has
`voice:false, v2:true`; do not change that).

Tell the user, briefly: the topic and slug, the dashboard URL
(http://localhost:4300), the facts to double-check (from RESEARCH.md, with
sources), and anything you couldn't get perfect. For a batch, one line per video.
