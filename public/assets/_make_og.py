# -*- coding: utf-8 -*-
"""Generate the Open Graph card for atzingen.dev. Run once.

Output: public/assets/og-image.png (1200x630).
"""
from PIL import Image, ImageDraw, ImageFont
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "og-image.png"
PORTRAIT = ROOT / "public" / "assets" / "rosto.jpeg"

W, H = 1200, 630
BG = (13, 15, 18)
FG = (232, 233, 234)
ACC = (212, 161, 74)
DIM = (155, 160, 168)


def load_font(candidates, size):
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # warm radial in the upper-right corner
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for radius, alpha in [(420, 30), (320, 40), (220, 55)]:
        glow_draw.ellipse(
            (W - radius - 80, -radius // 2, W + radius // 2, radius + 200),
            fill=(*ACC, alpha),
        )
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    serif = load_font(
        [
            r"C:\Windows\Fonts\georgia.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        ],
        96,
    )
    serif_it = load_font(
        [
            r"C:\Windows\Fonts\georgiai.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
        ],
        96,
    )
    sans = load_font(
        [
            r"C:\Windows\Fonts\segoeui.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ],
        28,
    )
    sans_small = load_font(
        [
            r"C:\Windows\Fonts\segoeui.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ],
        22,
    )
    mono = load_font(
        [
            r"C:\Windows\Fonts\consola.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        ],
        20,
    )

    x = 80

    # title block: "Gustavo von Atzingen" — left aligned, 2 lines so portrait fits
    draw.text((x, 100), "Gustavo", fill=FG, font=serif)
    g_w = draw.textlength("Gustavo ", font=serif)
    draw.text((x + g_w, 100), "von", fill=ACC, font=serif_it)
    von_w = draw.textlength("von ", font=serif_it)
    # second line:
    draw.text((x, 210), "Atzingen", fill=FG, font=serif)

    draw.text((x, 340), "Professor · Pesquisador · Engenheiro", fill=DIM, font=sans)
    draw.text(
        (x, 390),
        "IA aplicada e ciência de dados — visão computacional, deep learning, EEG e plataformas de dados.",
        fill=FG,
        font=sans_small,
    )

    roles = "IFSP · CEPAD-IFSP · Plataforma Nilo Peçanha · Quickium"
    draw.text((x, 500), roles, fill=ACC, font=mono)
    draw.text((x, 540), "atzingen.dev", fill=DIM, font=mono)

    # round portrait — top-right, smaller and more inset
    if PORTRAIT.exists():
        size = 220
        portrait = Image.open(PORTRAIT).convert("RGB").resize((size, size))
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        # gold ring
        ring = Image.new("RGBA", (size + 12, size + 12), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse(
            (0, 0, size + 12, size + 12), outline=(*ACC, 110), width=4
        )
        px = W - size - 80
        py = 90
        img.paste(portrait, (px, py), mask)
        img.paste(ring, (px - 6, py - 6), ring)

    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
