# Zotero Plugin Manual Test

Use a dedicated Zotero development profile for this test.

## Build

```powershell
cd D:\research\zotero朗读插件\plugin
npm run build
```

Expected output:

```text
D:\research\zotero朗读插件\plugin\build\local-academic-tts-0.1.10.xpi
```

## Install

1. Open Zotero with a development profile.
2. Go to `Tools -> Plugins`.
3. Drag `plugin\build\local-academic-tts-0.1.10.xpi` into the Plugins window.
4. Allow Zotero to install it.
5. Restart Zotero if prompted.

## Verify

1. Start the backend:

   ```powershell
   cd D:\research\zotero朗读插件\server
   uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
   ```

2. Open Zotero's `Tools` menu.
3. Confirm these items are visible:
   - `Local TTS: Test Connection`
   - `Local TTS: Play Test Audio`
   - `Local TTS: Play From Local Service`
   - `Local TTS: Stop`
4. Click `Local TTS: Test Connection`.
5. Confirm Zotero shows the local service provider.
6. Click `Local TTS: Play Test Audio`.
7. Confirm a short bundled tone plays.
8. Click `Local TTS: Play From Local Service`.
9. Confirm the returned backend WAV plays.
10. Click `Local TTS: Stop`.
11. Confirm playback stops immediately.
12. Open `Help -> Debug Output Logging -> View Output`.
13. Confirm the log contains `[Local Academic TTS]`.
14. Open a PDF in Zotero Reader.
15. Select a short English sentence.
16. Confirm the text selection popup shows `Local TTS Read`.
17. Click `Local TTS Read`.
18. Confirm the selected text is sent to the local service and audio plays.
