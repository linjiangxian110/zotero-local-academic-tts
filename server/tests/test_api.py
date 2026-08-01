from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.tts import get_tts_provider
from app.main import create_app
from app.providers.fake import FakeTTSProvider

SAMPLE_AUDIO_PATH = Path(__file__).resolve().parents[2] / "samples" / "test.wav"


@pytest.fixture()
def client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_tts_provider] = lambda: FakeTTSProvider(
        sample_path=SAMPLE_AUDIO_PATH
    )
    return TestClient(app)


def test_health_returns_provider_status(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "provider": "fake",
        "model_loaded": True,
    }


def test_voices_returns_catalogue(client: TestClient) -> None:
    response = client.get("/voices")

    assert response.status_code == 200
    assert response.json()["voices"] == [
        {
            "id": "af_heart",
            "language": "en-US",
            "accent": "American",
            "gender": "female",
        },
        {
            "id": "bf_emma",
            "language": "en-GB",
            "accent": "British",
            "gender": "female",
        },
    ]


def test_synthesize_returns_wav_audio(client: TestClient) -> None:
    response = client.post(
        "/synthesize",
        json={
            "text": "The proposed method improves generalization.",
            "voice_id": "af_heart",
            "language": "en-US",
            "speed": 1.0,
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.content.startswith(b"RIFF")


def test_synthesize_rejects_whitespace_only_text(client: TestClient) -> None:
    response = client.post(
        "/synthesize",
        json={
            "text": "   \n\t   ",
            "voice_id": "af_heart",
            "language": "en-US",
            "speed": 1.0,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Text is empty after normalization."


def test_synthesize_rejects_unknown_voice(client: TestClient) -> None:
    response = client.post(
        "/synthesize",
        json={
            "text": "The proposed method improves generalization.",
            "voice_id": "unknown",
            "language": "en-US",
            "speed": 1.0,
        },
    )

    assert response.status_code == 400
    assert "Unsupported voice/language combination" in response.json()["detail"]


def test_synthesize_rejects_invalid_speed(client: TestClient) -> None:
    response = client.post(
        "/synthesize",
        json={
            "text": "The proposed method improves generalization.",
            "voice_id": "af_heart",
            "language": "en-US",
            "speed": 3.0,
        },
    )

    assert response.status_code == 422


def test_synthesize_rejects_too_long_text(client: TestClient) -> None:
    response = client.post(
        "/synthesize",
        json={
            "text": "a" * 1501,
            "voice_id": "af_heart",
            "language": "en-US",
            "speed": 1.0,
        },
    )

    assert response.status_code == 422
