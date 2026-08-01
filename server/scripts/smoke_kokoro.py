from pathlib import Path
import sys

SERVER_ROOT = Path(__file__).resolve().parents[1]

if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.providers.kokoro import KokoroProvider

OUTPUT_DIR = SERVER_ROOT / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def generate_sample(
    text: str,
    language: str,
    voice_id: str,
    output_name: str,
) -> Path:
    provider = KokoroProvider()
    audio = provider.synthesize(
        text=text,
        voice_id=voice_id,
        language=language,
        speed=1.0,
    )
    output_path = OUTPUT_DIR / output_name
    output_path.write_bytes(audio)
    return output_path


if __name__ == "__main__":
    sample_text = (
        "The proposed method significantly improves cross-domain "
        "generalization while preserving prediction diversity."
    )

    american = generate_sample(
        text=sample_text,
        language="en-US",
        voice_id="af_heart",
        output_name="kokoro-american.wav",
    )
    print(f"Saved: {american}")

    british = generate_sample(
        text=sample_text,
        language="en-GB",
        voice_id="bf_emma",
        output_name="kokoro-british.wav",
    )
    print(f"Saved: {british}")
