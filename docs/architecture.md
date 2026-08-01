# Architecture

The MVP keeps Zotero and TTS synthesis separated by a local HTTP API.

```text
Zotero plugin
    -> POST http://127.0.0.1:8765/synthesize
    -> receives audio/wav
    -> plays audio inside Zotero

FastAPI service
    -> validates request
    -> normalizes selected academic text
    -> delegates synthesis to a provider
    -> returns WAV bytes
```

The provider boundary is intentional. `FakeTTSProvider` is used for endpoint
tests and Zotero integration checks. `KokoroProvider` is the default provider
for real local speech in the MVP release when `LOCAL_TTS_PROVIDER=kokoro`.
