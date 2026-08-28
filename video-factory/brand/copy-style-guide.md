# Virasat copy style guide

Applies to every video going forward — narration script, on-screen text
(hooks, tags, stat callouts, CTAs, the outro card), and captions.

## No em dashes

Never use an em dash (—) anywhere in video-facing text: not in the
narration script, not in on-screen copy, not in auto-generated captions.

Rephrase instead — split into two sentences, use a comma, a colon, or a
period. If a caption pipeline auto-generates text from the narration audio
(e.g. Whisper transcription), check the output and strip any em dash it
introduces before it ships.

This does not apply to internal project docs (BRIEF.md, STORYBOARD.md,
CLAUDE.md, this repo's own READMEs) — only to anything that actually
renders inside the video.

## The company name is "Virasat", not "Dot Virasat"

`.Virasat` (with the leading dot) is the **logo/wordmark's visual
styling** — it belongs on the graphic mark only. The company itself is
called **Virasat**. Never write "dot Virasat" into a narration script or
any spoken line — say "Virasat" plainly. On-screen text should likewise
name the company as "Virasat" in body copy; the dot-prefixed
".Virasat" styling is for the wordmark/logo element specifically, not
for how the name is written in headlines, taglines, or narration.

## Pronunciation: "Virasat" in TTS narration

Cloned-voice TTS (Chatterbox) has mispronounced "Virasat" as an
indistinct "Vira-sth" rather than the intended "Vira-SAT" (rhyming with
"cat" / "hat" / "sat") when the word is spelled as one unfamiliar unit —
the model isn't a real English dictionary word, so its default
grapheme-to-phoneme guess reduces and mumbles the final syllable.

**Workaround: in the `SCRIPT.md` spoken-text block only** (never in
on-screen text, which should still read "Virasat"), spell it hyphenated
as **"Vira-sat"** to nudge the TTS into treating "sat" as its own
stressed syllable rather than a reduced final one. This is unverified by
ear (no audio playback available when authoring) — listen to the
generated line and adjust the respelling (try "Vira sat" as two words,
or "Vira-Saat", if "Vira-sat" still comes out wrong) before shipping.
