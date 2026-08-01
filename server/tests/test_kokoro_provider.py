import os
import wave

import pytest

from app.providers.base import VoiceNotFoundError
from app.providers.kokoro import KokoroProvider


def test_kokoro_provider_exposes_voice_catalogue_without_loading_model() -> None:
    provider = KokoroProvider()

    assert provider.name == "kokoro"
    assert provider.model_loaded is False
    assert [voice.id for voice in provider.voices()] == ["af_heart", "bf_emma"]


def test_kokoro_provider_rejects_unknown_voice_without_loading_model() -> None:
    provider = KokoroProvider()

    with pytest.raises(VoiceNotFoundError):
        provider.synthesize(
            text="The proposed method improves generalization.",
            voice_id="unknown",
            language="en-US",
            speed=1.0,
        )

    assert provider.model_loaded is False


@pytest.mark.model
@pytest.mark.skipif(
    os.environ.get("LOCAL_TTS_RUN_MODEL_TESTS") != "1",
    reason="Set LOCAL_TTS_RUN_MODEL_TESTS=1 to run Kokoro model tests.",
)
def test_kokoro_provider_generates_wav_audio(tmp_path) -> None:
    provider = KokoroProvider()

    audio = provider.synthesize(
        text="The proposed method improves generalization.",
        voice_id="af_heart",
        language="en-US",
        speed=1.0,
    )
    output_path = tmp_path / "speech.wav"
    output_path.write_bytes(audio)

    assert audio.startswith(b"RIFF")
    assert len(audio) > 1000

    with wave.open(str(output_path), "rb") as wav:
        assert wav.getframerate() == 24000
