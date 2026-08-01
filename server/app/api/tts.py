from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import Settings, get_settings
from app.providers.base import TTSProvider, TTSProviderError, VoiceNotFoundError
from app.providers.fake import FakeTTSProvider
from app.providers.kokoro import KokoroProvider
from app.schemas import HealthResponse, SynthesisRequest, VoiceInfo, VoicesResponse
from app.services.text_normalizer import normalize_academic_text

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_AUDIO_PATH = PROJECT_ROOT / "samples" / "test.wav"

_provider: TTSProvider | None = None


def create_provider(settings: Settings) -> TTSProvider:
    if settings.provider == "kokoro":
        return KokoroProvider()

    return FakeTTSProvider(sample_path=SAMPLE_AUDIO_PATH)


def get_tts_provider(settings: Settings = Depends(get_settings)) -> TTSProvider:
    global _provider

    if _provider is None:
        _provider = create_provider(settings)

    return _provider


@router.get("/health", response_model=HealthResponse)
def health(provider: TTSProvider = Depends(get_tts_provider)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        provider=provider.name,
        model_loaded=provider.model_loaded,
    )


@router.get("/voices", response_model=VoicesResponse)
def voices(provider: TTSProvider = Depends(get_tts_provider)) -> VoicesResponse:
    return VoicesResponse(
        voices=[
            VoiceInfo(
                id=voice.id,
                language=voice.language,
                accent=voice.accent,
                gender=voice.gender,
            )
            for voice in provider.voices()
        ]
    )


@router.post("/synthesize")
def synthesize(
    request: SynthesisRequest,
    provider: TTSProvider = Depends(get_tts_provider),
) -> Response:
    normalized_text = normalize_academic_text(request.text)

    if not normalized_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is empty after normalization.",
        )

    try:
        audio = provider.synthesize(
            text=normalized_text,
            voice_id=request.voice_id,
            language=request.language,
            speed=request.speed,
        )
    except VoiceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except TTSProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return Response(
        content=audio,
        media_type="audio/wav",
        headers={"Content-Disposition": 'attachment; filename="speech.wav"'},
    )
