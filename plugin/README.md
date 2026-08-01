# Zotero Plugin

This directory contains the Zotero plugin for Local Academic TTS.

Current scope:

- Load as a Zotero plugin.
- Register `Local TTS Read` in PDF Reader text selection popups.
- Call the local FastAPI service and play returned WAV audio.
- Chunk long selections and play them sequentially.
- Add a floating pause/resume control in the PDF Reader.
- Register a Zotero Preferences pane.
- Keep diagnostic commands behind the optional Debug menu.

## Build

```powershell
cd plugin
npm run build
```

The XPI is written to:

```text
plugin/build/local-academic-tts-0.1.22.xpi
```

Install that XPI in a dedicated Zotero development profile, not your daily
research library profile.
