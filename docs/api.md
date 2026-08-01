# API

Default bind address:

```text
127.0.0.1:8765
```

## `GET /health`

Response:

```json
{
  "status": "ok",
  "provider": "fake",
  "model_loaded": true
}
```

When `LOCAL_TTS_PROVIDER=kokoro`, `provider` is `kokoro`. `model_loaded` remains
`false` until the first synthesis request lazily initializes the model.

## `GET /voices`

Response:

```json
{
  "voices": [
    {
      "id": "af_heart",
      "language": "en-US",
      "accent": "American",
      "gender": "female"
    },
    {
      "id": "bf_emma",
      "language": "en-GB",
      "accent": "British",
      "gender": "female"
    }
  ]
}
```

## `POST /synthesize`

Request:

```json
{
  "text": "The proposed method improves generalization.",
  "voice_id": "af_heart",
  "language": "en-US",
  "speed": 1.0
}
```

Response:

```text
Content-Type: audio/wav
```

Validation limits:

- `text`: 1 to 1500 characters
- `language`: `en-US` or `en-GB`
- `speed`: 0.5 to 2.0
