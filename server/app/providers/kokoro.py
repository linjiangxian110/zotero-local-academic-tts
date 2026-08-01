from __future__ import annotations

from io import BytesIO
import os
from pathlib import Path
import shutil
import tempfile
from typing import Any, Sequence

from app.providers.base import TTSProviderError, Voice, VoiceNotFoundError


class KokoroProvider:
    """Kokoro-backed TTS provider loaded lazily on first synthesis."""

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
    _lang_codes = {
        "en-US": "a",
        "en-GB": "b",
    }

    def __init__(self) -> None:
        self._pipelines: dict[str, Any] = {}

    @property
    def name(self) -> str:
        return "kokoro"

    @property
    def model_loaded(self) -> bool:
        return bool(self._pipelines)

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

        lang_code = self._lang_codes[language]
        pipeline = self._get_pipeline(lang_code)

        try:
            generator = pipeline(
                text,
                voice=voice_id,
                speed=speed,
                split_pattern=r"\n+",
            )
            audio_segments = [self._to_numpy(audio) for _, _, audio in generator]
        except Exception as exc:
            raise TTSProviderError(f"Kokoro synthesis failed: {exc}") from exc

        if not audio_segments:
            raise TTSProviderError("Kokoro did not return any audio.")

        try:
            import numpy as np
            import soundfile as sf

            audio = (
                audio_segments[0]
                if len(audio_segments) == 1
                else np.concatenate(audio_segments)
            )
            output = BytesIO()
            sf.write(output, audio, 24000, format="WAV")
            return output.getvalue()
        except Exception as exc:
            raise TTSProviderError(f"Failed to encode Kokoro WAV: {exc}") from exc

    def _get_pipeline(self, lang_code: str) -> Any:
        if lang_code not in self._pipelines:
            try:
                espeak_library, espeak_data = self._prepare_espeak_runtime()
                self._apply_espeak_runtime(espeak_library, espeak_data)

                from kokoro import KPipeline

                # misaki sets eSpeak paths when kokoro is imported, so apply
                # our Windows-safe paths again before KPipeline creates G2P.
                self._apply_espeak_runtime(espeak_library, espeak_data)
                self._pipelines[lang_code] = KPipeline(lang_code=lang_code)
            except Exception as exc:
                raise TTSProviderError(
                    "Failed to initialize Kokoro. Install model dependencies "
                    "and make sure espeak-ng is available on PATH."
                ) from exc

        return self._pipelines[lang_code]

    def _validate_voice(self, voice_id: str, language: str) -> None:
        for voice in self._voices:
            if voice.id == voice_id and voice.language == language:
                return

        raise VoiceNotFoundError(
            f"Unsupported voice/language combination: {voice_id} ({language})"
        )

    @staticmethod
    def _to_numpy(audio: Any) -> Any:
        if hasattr(audio, "detach"):
            return audio.detach().cpu().numpy()

        if hasattr(audio, "cpu") and hasattr(audio.cpu(), "numpy"):
            return audio.cpu().numpy()

        return audio

    @classmethod
    def _prepare_espeak_runtime(cls) -> tuple[Path, Path]:
        try:
            import espeakng_loader

            source_library = Path(espeakng_loader.get_library_path())
            source_data = Path(espeakng_loader.get_data_path())
        except Exception as exc:
            raise TTSProviderError("Failed to locate bundled espeak-ng.") from exc

        override_library = os.environ.get("LOCAL_TTS_ESPEAK_LIBRARY")
        override_data = os.environ.get("LOCAL_TTS_ESPEAK_DATA_PATH")
        if override_library and override_data:
            return Path(override_library), Path(override_data)

        if cls._is_ascii_path(source_library) and cls._is_ascii_path(source_data):
            return source_library, source_data

        runtime_root = cls._select_ascii_runtime_root()
        target_library = runtime_root / source_library.name
        target_data = runtime_root / "espeak-ng-data"

        try:
            runtime_root.mkdir(parents=True, exist_ok=True)
            if not target_library.is_file():
                shutil.copy2(source_library, target_library)
            if not (target_data / "phontab").is_file():
                if target_data.exists():
                    shutil.rmtree(target_data)
                shutil.copytree(source_data, target_data)
        except Exception as exc:
            raise TTSProviderError(
                f"Failed to prepare espeak-ng runtime at {runtime_root}."
            ) from exc

        return target_library, target_data

    @staticmethod
    def _apply_espeak_runtime(library: Path, data: Path) -> None:
        os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = str(library)
        os.environ["PHONEMIZER_ESPEAK_DATA_PATH"] = str(data)

        try:
            from phonemizer.backend.espeak.wrapper import EspeakWrapper

            EspeakWrapper.set_library(str(library))
            EspeakWrapper.set_data_path(str(data))
        except Exception as exc:
            raise TTSProviderError("Failed to configure espeak-ng runtime.") from exc

    @classmethod
    def _select_ascii_runtime_root(cls) -> Path:
        candidates: list[Path] = []

        if runtime_dir := os.environ.get("LOCAL_TTS_RUNTIME_DIR"):
            candidates.append(Path(runtime_dir))

        if local_app_data := os.environ.get("LOCALAPPDATA"):
            candidates.append(Path(local_app_data) / "ZoteroLocalTTS")

        for parent in Path(__file__).resolve().parents:
            if cls._is_ascii_path(parent):
                candidates.append(parent / "zotero-local-tts-runtime")
                break

        system_drive = os.environ.get("SystemDrive", "C:")
        candidates.append(Path(system_drive + "\\") / "Users" / "Public" / "ZoteroLocalTTS")
        candidates.append(Path(tempfile.gettempdir()) / "ZoteroLocalTTS")

        for candidate in candidates:
            if not cls._is_ascii_path(candidate):
                continue

            try:
                candidate.mkdir(parents=True, exist_ok=True)
                return candidate
            except OSError:
                continue

        raise TTSProviderError(
            "Could not find a writable ASCII-only path for espeak-ng runtime."
        )

    @staticmethod
    def _is_ascii_path(path: Path) -> bool:
        try:
            str(path).encode("ascii")
        except UnicodeEncodeError:
            return False

        return True
