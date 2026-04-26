#!/bin/bash
# Halve the volume of all audio files in this directory.
# Overwrites originals (backs up to .bak first).

for f in *.wav *.mp3 *.ogg; do
  [ -f "$f" ] || continue
  echo "Processing: $f"
  cp "$f" "${f}.bak"
  ffmpeg -y -i "${f}.bak" -filter:a "volume=0.5" "$f" 2>/dev/null
  rm "${f}.bak"
  echo "  Done: $f"
done

echo "All files processed."
