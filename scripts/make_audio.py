#!/usr/bin/env python3
"""Record Persian audio for every text listed on stdin, with Microsoft's Iranian neural voice.

Files go to audio/fa/<first 16 hex chars of SHA-1 of the text>.mp3; existing files are kept,
so only new or changed texts are recorded. Run by .github/workflows/audio.yml.
"""
import asyncio, hashlib, os, sys
import edge_tts

VOICE = os.environ.get("FA_VOICE", "fa-IR-DilaraNeural")
OUT = sys.argv[1] if len(sys.argv) > 1 else "audio/fa"


def name(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16] + ".mp3"


async def one(text, sem, stats):
    path = os.path.join(OUT, name(text))
    if os.path.exists(path):
        return
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate="-10%").save(path)
                stats["made"] += 1
                return
            except Exception as e:  # retry, then skip this one
                if attempt == 2:
                    print("failed:", text[:40], e, file=sys.stderr)
                    stats["failed"] += 1
                    if os.path.exists(path):
                        os.remove(path)
                await asyncio.sleep(2 + attempt * 3)


async def main():
    os.makedirs(OUT, exist_ok=True)
    texts = [t.strip() for t in sys.stdin.read().split("\n") if t.strip()]
    sem, stats = asyncio.Semaphore(6), {"made": 0, "failed": 0}
    await asyncio.gather(*(one(t, sem, stats) for t in texts))
    print(f"{len(texts)} texts, {stats['made']} recorded, {stats['failed']} failed")


asyncio.run(main())
