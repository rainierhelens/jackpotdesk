"""Build square home-screen icons from the crown in the header logo."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "logo.png"
OUT = ROOT / "public"
ICONS = OUT / "icons"
BG = (7, 11, 16, 255)


def crown() -> Image.Image:
    im = Image.open(SRC).convert("RGBA")
    return im.crop((10, 9, 71, 59))


def square(mark: Image.Image, size: int, pad: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    inner = max(1, int(size * (1 - 2 * pad)))
    fitted = mark.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas.convert("RGB")


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    mark = crown()
    jobs = [
        (ICONS / "icon-192.png", 192, 0.16),
        (ICONS / "icon-512.png", 512, 0.16),
        (ICONS / "icon-192-maskable.png", 192, 0.22),
        (ICONS / "icon-512-maskable.png", 512, 0.22),
        (OUT / "apple-touch-icon.png", 180, 0.16),
        (OUT / "favicon.png", 32, 0.12),
    ]
    for path, size, pad in jobs:
        square(mark, size, pad).save(path, "PNG", optimize=True)
        print("wrote", path.relative_to(ROOT), size)


if __name__ == "__main__":
    main()
