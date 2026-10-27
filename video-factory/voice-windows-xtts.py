#!/usr/bin/env python3
# Windows voice-clone generator — Coqui XTTS v2, the free local Chatterbox/mlx
# equivalent for Windows ("Views on Autopilot" ch. 4B, Path A). Called once per
# script line by voice.mjs; output feeds the same ffmpeg loudness chain as Mac.
#
# Usage: python voice-windows-xtts.py --text "..." --ref_audio ref.wav --output_path out.wav [--language en]
import argparse
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--ref_audio", required=True)
    parser.add_argument("--output_path", required=True)
    parser.add_argument("--language", default="en")
    args = parser.parse_args()

    try:
        from TTS.api import TTS
    except ImportError:
        sys.stderr.write(
            "Coqui TTS is not installed in this venv.\n"
            "Run: pip install torch torchaudio coqui-tts\n"
            "(see the team guide's Windows voice cloning section)\n"
        )
        sys.exit(1)

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    tts.tts_to_file(
        text=args.text,
        speaker_wav=args.ref_audio,
        language=args.language,
        file_path=args.output_path,
    )


if __name__ == "__main__":
    main()
