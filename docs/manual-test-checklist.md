# Manual Test Checklist

This checklist becomes relevant once the Zotero plugin is added.

- Start the backend on `127.0.0.1:8765`.
- Confirm `GET /health` returns `status: ok`.
- Open Zotero with a dedicated development profile.
- Confirm the plugin can play bundled static WAV audio.
- Confirm the plugin can call `/synthesize` and play the returned WAV.
- Confirm Tools contains one `Local TTS` submenu with `Open Settings in Zotero Preferences...`, `Pause`, `Resume`, `Stop`, and `Debug`.
- Open Zotero Preferences from `Edit` -> `Settings` and confirm the Local Academic TTS pane is visible.
- Change speed in Zotero Preferences, save, and confirm speech speed changes.
- Change voice in Zotero Preferences and confirm speech voice changes.
- Pause and resume current playback.
- Select one English sentence in a PDF and run Local TTS.
- Select two short English paragraphs and run Local TTS.
- Select a long English passage over 1500 characters and confirm it plays in sequence.
- Confirm the PDF Reader page shows one floating Local TTS pause/resume icon.
- Use one single mouse press on the floating icon to pause playback.
- Use one single mouse press on the floating icon again to resume playback.
- Click Local TTS while previous audio is playing.
- Stop playback while a long selection is playing and confirm no later chunks continue.
- Stop the backend and confirm Zotero shows a clear service error.
