# Zotero Local Academic TTS

Zotero Local Academic TTS is a Zotero plugin plus a local FastAPI text-to-speech
service for reading selected English academic text inside Zotero PDF Reader.

The speech synthesis backend is built on
[Kokoro](https://github.com/hexgrad/kokoro) /
[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M). This project provides
the Zotero integration, local HTTP service, text normalization, playback
controls, packaging, and Windows workflow around Kokoro; it does not train or
claim ownership of the Kokoro model.

The MVP is intentionally focused:

- Select English text in Zotero PDF Reader.
- Click `Local TTS Read` in the selection popup.
- Synthesize speech through a local Kokoro backend.
- Play WAV audio inside Zotero.
- Pause/resume from a floating Reader control.
- Stop playback from `Tools -> Local TTS -> Stop`.

Voice cloning, full-document reading, sentence highlighting, and replacing
Zotero's built-in Read Aloud are out of scope for the first milestone.

## Current Release

MVP release: `v0.1.21`

The local release bundle is generated at:

```text
D:\research\zotero-local-tts-release
```

It contains:

- `localtts0121.xpi`
- `start_kokoro.ps1`
- `README-中文使用说明.md`
- `测试清单.md`

## Features

- Zotero PDF Reader selected-text reading
- Local-only HTTP backend on `127.0.0.1:8765`
- Kokoro real TTS provider
- Fake provider for tests and diagnostics
- Long selection chunking and sequential playback
- Floating pause/resume button in the PDF Reader
- Backup playback controls in `Tools -> Local TTS`
- Zotero Preferences pane for backend URL, voice, speed, and debug menu
- Optional automatic backend startup when Zotero opens

## Requirements

- Windows
- Zotero with plugin support
- Python 3.12
- PowerShell
- Internet access during first model/dependency installation

## Backend Setup

From the project root:

```powershell
py -3.12 -m venv .venv-tts
.\.venv-tts\Scripts\python -m pip install --upgrade pip setuptools wheel
.\.venv-tts\Scripts\python -m pip install -r server\requirements.txt
.\.venv-tts\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.\.venv-tts\Scripts\python -m pip install -r server\requirements-model.txt -i https://pypi.org/simple
```

Start the Kokoro backend:

```powershell
.\server\scripts\start_kokoro.ps1
```

If you run the copied script from a release directory, pass the project root:

```powershell
.\start_kokoro.ps1 -ProjectRoot "D:\research\zotero朗读插件"
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

Expected provider for normal use:

```json
{
  "status": "ok",
  "provider": "kokoro",
  "model_loaded": true
}
```

## Install the Zotero Plugin

1. Open Zotero.
2. Go to `Tools -> Add-ons`.
3. Choose `Install Add-on From File...`.
4. Select `localtts0121.xpi`.
5. Restart Zotero if prompted.

Configure the plugin in `Edit -> Settings -> Local Academic TTS`.

The plugin can also auto-start the backend when Zotero opens. In Zotero
Settings, keep `Auto start` enabled and make sure `Project root` points to this
repository directory.

## Build the XPI

```powershell
cd plugin
python scripts\build_xpi.py
```

The XPI is written to `plugin/build/`.

## Tests

Run normal backend tests:

```powershell
cd server
..\.venv-tts\Scripts\python -m pytest tests
```

Run Kokoro model tests:

```powershell
cd server
$env:LOCAL_TTS_RUN_MODEL_TESTS = "1"
..\.venv-tts\Scripts\python -m pytest tests -m model
```

## Documentation

- [中文使用说明](docs/README-中文使用说明.md)
- [Release 测试清单](docs/release-test-checklist-zh.md)
- [Architecture](docs/architecture.md)
- [API](docs/api.md)

## License

MIT

Kokoro and Kokoro-82M are separate upstream projects with their own licenses.
See the Kokoro project pages for model/library licensing details.
