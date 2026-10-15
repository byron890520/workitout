"""Builds the social share images in public/og/ (1200x630 PNG).

Only needed when you add a new calculator or change a title. Requires: pip install pillow fonttools brotli
Run from the project folder after `npm install`:  python scripts/make-og.py
"""
import io
from pathlib import Path
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og"
NM = ROOT / "node_modules"

PANEL, GRID, INK = (18, 58, 45), (255, 255, 255, 22), (243, 247, 242)
FYN, FYN_DEEP = (29, 90, 69), (16, 51, 38)
MARI, MARI_DEEP, ON_MARI = (240, 174, 43), (185, 124, 12), (42, 30, 5)
SURFACE, LINE_DEEP = (250, 251, 248), (185, 195, 186)

PAGES = [
    ("home", "WORK IT OUT", "South African calculators and daily word hints", None),
    ("salary-calculator", "Salary after tax calculator", "Take-home pay after PAYE, UIF and medical aid credits", ("R", False)),
    ("vat-calculator", "VAT calculator (15%)", "Add or remove South African VAT in one tap", ("15%", True)),
    ("compound-interest-calculator", "Compound interest calculator", "See how savings and monthly top-ups grow over time", ("%↑", False)),
    ("electricity-calculator", "Prepaid electricity calculator", "Units per rand and what each appliance costs to run", ("kWh", True)),
    ("transfer-duty-calculator", "Bond transfer duty calculator", "SARS transfer duty on a property purchase", ("13%", False)),
    ("word-hints", "Daily word game hints", "Spoiler-free Wordle and Wortel clues, every day", ("A?", True)),
    ("woord-van-die-dag", "Woord van die Dag", "One Afrikaans word a day, explained in English", ("Aa", True)),
    ("wordle", "Wordle hint today", "Gentle clues first, the answer only if you want it", ("W?", False)),
    ("wortel", "Wortel-wenk vandag", "Sagte leidrade eers, die antwoord net as jy wil", ("W?", True)),
]


def load(woff2, size, wght=None):
    f = TTFont(woff2)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    font = ImageFont.truetype(buf, size)
    if wght:
        try:
            font.set_variation_by_axes([96, wght])
        except Exception:
            pass
    return font


BRICO = NM / "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2"
ATK = NM / "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2"
ATKB = NM / "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2"


def keycap(img, x, y, w, h, text, alt, font, rot=-5):
    """Draws a raised key with a 3D lip and soft shadow, rotated slightly."""
    face, lip, ink = (MARI, MARI_DEEP, ON_MARI) if alt else (SURFACE, LINE_DEEP, PANEL)
    pad = 60
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((pad + 6, pad + 28, pad + w - 6, pad + h + 26), 26, fill=(0, 0, 0, 120))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((pad, pad + 12, pad + w, pad + h + 12), 26, fill=lip)
    d.rounded_rectangle((pad, pad, pad + w, pad + h), 26, fill=face)
    tb = d.textbbox((0, 0), text, font=font, anchor="mm")
    d.text((pad + w / 2, pad + h / 2 + 2), text, font=font, fill=ink, anchor="mm")
    layer = layer.rotate(rot, resample=Image.BICUBIC, expand=False)
    img.alpha_composite(layer, (x - pad, y - pad))


def wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def make(slug, title, sub, glyph):
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), PANEL + (255,))
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(grid)
    for x in range(0, W, 30):
        g.line((x, 0, x, H), fill=GRID)
    for y in range(0, H, 30):
        g.line((0, y, W, y), fill=GRID)
    img.alpha_composite(grid)
    d = ImageDraw.Draw(img)

    if glyph is None:  # home: the tile board
        tile_font = load(BRICO, 92, 800)
        rows = ["WORK", "IT", "OUT"]
        size, gap = 118, 18
        for r, row in enumerate(rows):
            total = len(row) * size + (len(row) - 1) * gap
            x0 = (W - total) // 2
            for c, ch in enumerate(row):
                keycap(img, x0 + c * (size + gap), 60 + r * (size + gap + 8), size, size, ch, True, tile_font, rot=(-3 + c * 2))
        f = load(ATKB, 38)
        d.text((W / 2, 545), sub, font=f, fill=INK, anchor="mm")
    else:
        key_font = load(BRICO, 92 if len(glyph[0]) <= 2 else 70, 800)
        keycap(img, 80, 90, 190, 190, glyph[0], glyph[1], key_font)
        tf = load(BRICO, 84, 800)
        lines = wrap(d, title, tf, 820)
        y = 330 if len(lines) == 1 else 300
        for i, line in enumerate(lines):
            d.text((80, y + i * 92), line, font=tf, fill=INK)
        sf = load(ATK, 36)
        d.text((80, y + len(lines) * 92 + 18), sub, font=sf, fill=(205, 222, 212))
        # brand mark, top right
        bf = load(BRICO, 40, 800)
        mark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        keycap(mark, 870, 70, 70, 70, "W", True, load(BRICO, 44, 800), rot=-6)
        img.alpha_composite(mark)
        d.text((960, 105), "Work It Out", font=bf, fill=INK, anchor="lm")
    df = load(ATKB, 28)
    d.text((W - 60, H - 40), "workitout.co.za", font=df, fill=MARI, anchor="rs")
    OUT.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT / f"{slug}.png", optimize=True)


for page in PAGES:
    make(*page)
print(f"Made {len(PAGES)} share images in {OUT}")
