import os
import sys

transcript_path = r"C:\Users\saumy\.gemini\antigravity\brain\cfb0fc8b-f0e4-4cbd-aab0-d89adf2f6f74\.system_generated\logs\transcript.jsonl"

if not os.path.exists(transcript_path):
    print("Transcript not found.")
    sys.exit(0)

print("Searching transcript.jsonl...")
with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "chrome" in line.lower() or "9222" in line.lower() or "run_command" in line.lower():
            # Print matching lines with context
            print(f"Line {i}: {line[:300]}...")
