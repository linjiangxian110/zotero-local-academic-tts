from dataclasses import dataclass
from typing import Protocol, Sequence


@dataclass(frozen=True)
class Voice:
    id: str
    language: str
    accent: str
    gender: str


class TTSProviderError(RuntimeError):
    """Raised when a provider cannot synthesize audio."""


class VoiceNotFoundError(ValueError):
    """Raised when a request references an unsupported voice."""


class TTSProvider(Protocol):
    @property
    def name(self) -> str:
        """Provider identifier exposed through `/health`."""

    @property
    def model_loaded(self) -> bool:
        """Whether the backing model is ready to synthesize."""

    def voices(self) -> Sequence[Voice]:
        """Return supported voices."""

    def synthesize(
        self,
        text: str,
        voice_id: str,
        language: str,
        speed: float,
    ) -> bytes:
        """Return synthesized WAV bytes."""
