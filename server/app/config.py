import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

ProviderName = Literal["fake", "kokoro"]


@dataclass(frozen=True)
class Settings:
    provider: ProviderName = "fake"
    max_text_length: int = 1500


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    provider = os.environ.get("LOCAL_TTS_PROVIDER", "fake").lower()

    if provider not in {"fake", "kokoro"}:
        provider = "fake"

    return Settings(provider=provider)  # type: ignore[arg-type]
