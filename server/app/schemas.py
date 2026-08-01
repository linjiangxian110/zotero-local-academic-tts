from typing import Literal

from pydantic import BaseModel, Field

LanguageCode = Literal["en-US", "en-GB"]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    provider: str
    model_loaded: bool


class VoiceInfo(BaseModel):
    id: str
    language: LanguageCode
    accent: str
    gender: str


class VoicesResponse(BaseModel):
    voices: list[VoiceInfo]


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    voice_id: str = Field(min_length=1)
    language: LanguageCode
    speed: float = Field(ge=0.5, le=2.0)
