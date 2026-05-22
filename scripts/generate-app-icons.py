#!/usr/bin/env python3
"""Regenerate Expo app icons from web Account_UI logo (logo-source.png or bundled path)."""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
DEFAULT_SRC = Path("/tmp/Account_UI/public/logo.png")
SRC = ASSETS / "logo-source.png"
if not SRC.is_file():
    SRC = DEFAULT_SRC if DEFAULT_SRC.is_file() else None
if SRC is None or not SRC.is_file():
    raise SystemExit(f"Logo not found. Place logo at {ASSETS / 'logo-source.png'}")


def make_square_icon(src: Image.Image, size: int, bg=(255, 255, 255, 255)) -> Image.Image:
    src = src.convert("RGBA")
    pad = int(size * 0.12)
    inner = size - 2 * pad
    w, h = src.size
    scale = min(inner / w, inner / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def main() -> None:
    logo = Image.open(SRC)
    ASSETS.mkdir(parents=True, exist_ok=True)
    for name, size in [
        ("icon.png", 1024),
        ("adaptive-icon.png", 1024),
        ("splash-icon.png", 1024),
        ("favicon.png", 48),
    ]:
        make_square_icon(logo, size).save(ASSETS / name, "PNG")
        print("wrote", ASSETS / name)

    h = 48
    w = int(logo.width * (h / logo.height))
    logo.convert("RGBA").resize((w, h), Image.Resampling.LANCZOS).save(
        ASSETS / "brand-logo.png", "PNG"
    )
    print("wrote", ASSETS / "brand-logo.png")


if __name__ == "__main__":
    main()
