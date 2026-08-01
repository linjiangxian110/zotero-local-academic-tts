from pathlib import Path
from typing import Sequence

from app.providers.base import TTSProviderError, Voice, VoiceNotFoundError


class FakeTTSProvider:
    """Test provider that returns a static bundled WAV file."""

    _voices = (
        Voice(
            id="af_heart",
            language="en-US",
            accent="American",
            gender="female",
        ),
        Voice(
            id="bf_emma",
            language="en-GB",
            accent="British",
            gender="female",
        ),
    )

    def __init__(self, sample_path: Path) -> None:
        self.sample_path = sample_path

    @property
    def name(self) -> str:
        return "fake"

    @property
    def model_loaded(self) -> bool:
        return True

    def voices(self) -> Sequence[Voice]:
        return self._voices

    def synthesize(
        self,
        text: str,
        voice_id: str,
        language: str,
        speed: float,
    ) -> bytes:
        self._validate_voice(voice_id=voice_id, language=language)

        if not self.sample_path.exists():
            raise TTSProviderError(f"Missing sample audio: {self.sample_path}")

        return self.sample_path.read_bytes()

    def _validate_voice(self, voice_id: str, language: str) -> None:
        for voice in self._voices:
            if voice.id == voice_id and voice.language == language:
                return

        raise VoiceNotFoundError(
            f"Unsupported voice/language combination: {voice_id} ({language})"
        )
