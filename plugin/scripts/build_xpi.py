from __future__ import annotations

import shutil
import zipfile
import json
from pathlib import Path


def main() -> None:
    plugin_root = Path(__file__).resolve().parents[1]
    repo_root = plugin_root.parent
    addon_root = plugin_root / "addon"
    package_json = plugin_root / "package.json"
    sample_audio = repo_root / "samples" / "test.wav"
    build_root = plugin_root / "build"
    version = json.loads(package_json.read_text(encoding="utf-8"))["version"]
    xpi_path = build_root / f"local-academic-tts-{version}.xpi"

    if not addon_root.exists():
        raise FileNotFoundError(f"Missing addon directory: {addon_root}")

    if not sample_audio.exists():
        raise FileNotFoundError(f"Missing sample audio: {sample_audio}")

    if build_root.exists():
        shutil.rmtree(build_root)
    build_root.mkdir(parents=True)

    with zipfile.ZipFile(xpi_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(addon_root.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(addon_root).as_posix())

        zf.write(sample_audio, "samples/test.wav")

    print(xpi_path)


if __name__ == "__main__":
    main()
