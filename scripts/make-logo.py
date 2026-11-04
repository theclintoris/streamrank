#!/usr/bin/env python3
"""Render the StreamRank addon icon to public/logo.png with Pillow."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 512
SCALE = 2
S = SIZE * SCALE
ROOT = Path(__file__).resolve().parent.parent

BG_TOP_LEFT = (33, 23, 71)
BG_MID = (14, 13, 24)
BG_BOTTOM_RIGHT = (8, 16, 24)
BAR_BOTTOM = (124, 92, 245)
BAR_MID = (180, 155, 255)
BAR_TOP = (103, 232, 249)
GOLD = (245, 197, 24)
CREAM = (255, 244, 194)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def background() -> Image.Image:
    img = Image.new("RGB", (S, S))
    px = img.load()
    for y in range(S):
        for x in range(S):
            t = (x / S + y / S) / 2
            if t < 0.55:
                color = lerp(BG_TOP_LEFT, BG_MID, t / 0.55)
            else:
                color = lerp(BG_MID, BG_BOTTOM_RIGHT, (t - 0.55) / 0.45)
            # A very soft purple bloom in the top-left corner.
            d = math.hypot(x - S * 0.16, y - S * 0.12) / (S * 0.9)
            bloom = max(0.0, 1 - d) ** 2 * 0.22
            color = tuple(min(255, round(c + (72 - c) * bloom * (c < 120))) for c in color)
            px[x, y] = color
    return img


def vertical_gradient(width: int, height: int, stops: list[tuple[float, tuple[int, int, int]]]) -> Image.Image:
    grad = Image.new("RGBA", (width, height))
    px = grad.load()
    for y in range(height):
        t = y / max(1, height - 1)
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                local = (t - t0) / max(1e-6, t1 - t0)
                color = lerp(c0, c1, local)
                break
        else:
            color = stops[-1][1]
        for x in range(width):
            px[x, y] = (*color, 255)
    return grad


def main() -> None:
    img = background().convert("RGBA")

    # Rounded app-icon mask.
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.227), fill=255)
    img.putalpha(mask)

    # Hairline border.
    ImageDraw.Draw(img).rounded_rectangle(
        (3, 3, S - 4, S - 4),
        radius=int(S * 0.222),
        outline=(255, 255, 255, 28),
        width=max(2, S // 170),
    )

    # Faint grid.
    grid = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for i in range(1, 6):
        y = int(S * (0.28 + i * 0.11))
        gd.line((int(S * 0.16), y, int(S * 0.84), y), fill=(255, 255, 255, 14), width=max(1, S // 512))
    img = Image.alpha_composite(img, grid)

    # Bars: draw a blurred glow layer, then the crisp gradient bars.
    bars = [
        (0.215, 0.585, 0.093, 0.188, 0.72),
        (0.355, 0.500, 0.093, 0.273, 0.84),
        (0.495, 0.405, 0.093, 0.368, 1.0),
        (0.635, 0.305, 0.093, 0.468, 1.0),
    ]
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for x, y, w, h, alpha in bars:
        box = (int(S * x), int(S * y), int(S * (x + w)), int(S * (y + h)))
        gdraw.rounded_rectangle(box, radius=int(S * 0.032), fill=(150, 130, 255, int(150 * alpha)))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(S * 0.035)))

    for x, y, w, h, alpha in bars:
        bw, bh = int(S * w), int(S * h)
        grad = vertical_gradient(
            bw,
            bh,
            [(0.0, BAR_TOP), (0.40, BAR_MID), (1.0, BAR_BOTTOM)],
        )
        shape = Image.new("L", (bw, bh), 0)
        ImageDraw.Draw(shape).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=int(S * 0.032), fill=255)
        grad.putalpha(shape.point(lambda v: int(v * alpha)))
        img.alpha_composite(grad, (int(S * x), int(S * y)))

    # Play badge.
    cx, cy, radius = int(S * 0.735), int(S * 0.265), int(S * 0.113)
    badge = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    bd.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(11, 11, 18, 255), outline=(245, 197, 24, 150), width=max(2, S // 256))
    triangle = [
        (cx - radius * 0.26, cy - radius * 0.43),
        (cx - radius * 0.26, cy + radius * 0.43),
        (cx + radius * 0.50, cy),
    ]
    bd.polygon(triangle, fill=(*GOLD, 255))
    img = Image.alpha_composite(img, badge)

    # A small bright glint on the play triangle.
    glint = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glint).polygon(triangle[:2] + [(cx + radius * 0.06, cy)], fill=(*CREAM, 110))
    img = Image.alpha_composite(img, glint)

    out = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    out.save(ROOT / "public" / "logo.png", optimize=True)
    print(f"wrote {ROOT / 'public' / 'logo.png'} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
