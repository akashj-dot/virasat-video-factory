# v2 TTS worker: loads Chatterbox Multilingual once and voices a batch of lines.
# Called by voice-first.mjs; not meant to be run by hand.
# Usage: python tts_worker.py <job.json>
#   job.json = {"model", "ref", "lang", "temperature", "outdir", "lines": [{"id", "text"}]}
# Writes <outdir>/<id>.wav (raw, 24k mono) for every line.
import json
import sys

import mlx.core as mx
import numpy as np
from mlx_audio.audio_io import write as audio_write
from mlx_audio.tts.utils import load_model

job = json.load(open(sys.argv[1]))
model = load_model(job["model"])

# Same sampling settings as the `mlx_audio.tts.generate` CLI run the user A/B-approved
# (2026-10-25); the model's own generate() defaults (exaggeration 0.1, rep 1.2, top_p 1.0)
# speak noticeably faster and flatter.
EXAGGERATION = 0.5
TURBO = "turbo" in job["model"]
if TURBO:
    # English: Chatterbox Turbo, the engine behind every approved English video. It
    # caches the reference itself and only honours temperature (0.75, user-tuned).
    model.prepare_conditionals(job["ref"])
else:
    conds = model.prepare_conditionals(job["ref"], model.sample_rate, EXAGGERATION)

# Every take needs its own seed: a fresh process otherwise replays the same random
# stream, so "retakes" came out identical to the first take.
seed = int(job.get("seed", 0))
for i, line in enumerate(job["lines"]):
    mx.random.seed(seed + i * 101)
    chunks, sr = [], None
    gen = (model.generate(text=line["text"], temperature=job.get("temperature", 0.75), verbose=False)
           if TURBO else model.generate(
        text=line["text"],
        conds=conds,
        lang_code=job["lang"],
        exaggeration=EXAGGERATION,
        temperature=job.get("temperature", 0.7),
        top_p=0.9,
        repetition_penalty=1.1,
        verbose=False,
    ))
    for r in gen:
        chunks.append(np.array(r.audio))
        sr = r.sample_rate
    if not chunks:
        print(f"FAIL {line['id']}", flush=True)
        continue
    audio_write(f"{job['outdir']}/{line['id']}.wav", np.concatenate(chunks), sr)
    print(f"OK {line['id']}", flush=True)
