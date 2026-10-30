"""Turn six generated ship paintings into small, palette-limited game sprites.

usage: python3 -I scripts/build-chess-sprites.py <dir with sloop.png, frigate.png, brig.png,
       ship-of-the-line.png, man-of-war.png, flagship.png> <output dir>

(e.g. output dir: src/assets/chess-at-sea)

Each source is a ship (bow up) on a plain white background. The script
  1. cuts the ship out (flood-fills the white background from the border and
     strips the magenta halo the image generator leaves at the edges),
  2. scales all six by ONE common factor so the bigger ships stay bigger,
  3. centres each on its hull in a square frame,
  4. forces every sprite onto a single shared 16-colour palette (EGA style),
  5. writes two fleets: `amber` (the paintings' natural cream sails) and `red`
     (the same ships with the sails and pennant recoloured red).

Needs Pillow and numpy. Nothing here ships to the browser — only the PNGs it
writes do.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# chess piece -> source file (without .png)
SOURCES = {
    'p': 'sloop',
    'n': 'frigate',
    'b': 'brig',
    'r': 'ship-of-the-line',
    'q': 'man-of-war',
    'k': 'flagship',
}
FRAME = 96          # sprites are FRAME x FRAME pixels
SHIP_HEIGHT = 92    # the tallest ship fills this much of the frame
WORK_WIDTH = 1500   # working resolution for the cut-out
COLORS = 16
SAIL_MIN_LUMA = 160  # palette entries at least this light are sail cloth (and the pennant)
RED_DARK = np.array([128, 14, 22], float)
RED_LIGHT = np.array([238, 78, 78], float)
WHITE_MIN = 232     # a pixel this light on every channel counts as background


def grow(mask):
    out = mask.copy()
    out[1:] |= mask[:-1]
    out[:-1] |= mask[1:]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def border_connected(mask):
    """The parts of `mask` that connect to the image border (the background)."""
    reach = np.zeros_like(mask)
    reach[0] = mask[0]
    reach[-1] |= mask[-1]
    reach[:, 0] |= mask[:, 0]
    reach[:, -1] |= mask[:, -1]
    while True:
        nxt = grow(reach) & mask
        if (nxt == reach).all():
            return reach
        reach = nxt


def cut_out(path):
    im = Image.open(path).convert('RGB')
    im = im.resize((WORK_WIDTH, round(im.height * WORK_WIDTH / im.width)), Image.LANCZOS)
    arr = np.asarray(im).astype(np.int16)

    near_white = (arr.min(axis=2) >= WHITE_MIN)
    background = border_connected(near_white)

    # The generator leaves a magenta halo just outside the dark outline.
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    magenta = (b - g > 45) & (r - g > 45)
    # Only strip halo pixels that touch the background (not real purples inside the ship).
    near_bg = background.copy()
    for _ in range(6):
        near_bg = grow(near_bg)
    halo = magenta & near_bg
    alpha = ~(background | halo)

    ys, xs = np.nonzero(alpha)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    rgb = np.asarray(im)[box[1]:box[3], box[0]:box[2]]
    a = alpha[box[1]:box[3], box[0]:box[2]]
    return rgb, a


def resize_rgba(rgb, a, scale):
    """Premultiplied resize, so edges don't pick up dark or light halos."""
    h, w = a.shape
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    af = Image.fromarray((a * 255).astype(np.uint8), 'L').resize(size, Image.LANCZOS)
    chans = []
    for c in range(3):
        premult = Image.fromarray((rgb[..., c] * a).astype(np.uint8), 'L').resize(size, Image.LANCZOS)
        chans.append(np.asarray(premult).astype(np.float32))
    alpha = np.asarray(af).astype(np.float32)
    out = np.zeros(size[::-1] + (3,), np.float32)
    ok = alpha > 0
    for c in range(3):
        out[..., c][ok] = chans[c][ok] / alpha[ok] * 255
    return np.clip(out, 0, 255).astype(np.uint8), alpha >= 128


def main(src_dir, out_dir):
    src_dir, out_dir = Path(src_dir), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cut = {k: cut_out(src_dir / f'{stem}.png') for k, stem in SOURCES.items()}
    tallest = max(a.shape[0] for _, a in cut.values())
    scale = SHIP_HEIGHT / tallest

    frames = {}
    for key, (rgb, a) in cut.items():
        srgb, sa = resize_rgba(rgb, a, scale)
        h, w = sa.shape
        # centre on the hull: the median column of the lower half of the ship
        ys, xs = np.nonzero(sa[int(h * 0.55):int(h * 0.85)])
        hull_x = int(np.median(xs)) if len(xs) else w // 2
        ox = FRAME // 2 - hull_x
        oy = (FRAME - h) // 2
        canvas = np.zeros((FRAME, FRAME, 3), np.uint8)
        mask = np.zeros((FRAME, FRAME), bool)
        for y in range(h):
            for x in range(w):
                fx, fy = x + ox, y + oy
                if sa[y, x] and 0 <= fx < FRAME and 0 <= fy < FRAME:
                    canvas[fy, fx] = srgb[y, x]
                    mask[fy, fx] = True
        frames[key] = (canvas, mask)

    # One palette for the whole fleet, built from every ship pixel.
    pixels = np.concatenate([c[m] for c, m in frames.values()])
    strip = Image.fromarray(pixels.reshape(1, -1, 3), 'RGB')
    palette = strip.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)

    pal = np.asarray(palette.getpalette()[:COLORS * 3], np.uint8).reshape(-1, 3)
    luma = pal @ np.array([0.299, 0.587, 0.114])
    sail = [i for i in range(len(pal)) if luma[i] >= SAIL_MIN_LUMA]
    lo, hi = luma[sail].min(), luma[sail].max()
    # Red sails keep the paintings' light-to-shade ramp.
    red = {i: (RED_DARK + (RED_LIGHT - RED_DARK) * ((luma[i] - lo) / max(1e-6, hi - lo))).astype(np.uint8) for i in sail}

    for key, (canvas, mask) in frames.items():
        q = np.asarray(Image.fromarray(canvas, 'RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGB'))
        alpha = (mask * 255).astype(np.uint8)
        red_q = q.copy()
        for i, color in red.items():
            red_q[(q == pal[i]).all(axis=2)] = color
        for fleet, pixels in (('amber', q), ('red', red_q)):
            (out_dir / fleet).mkdir(exist_ok=True)
            Image.fromarray(np.dstack([pixels, alpha]), 'RGBA').save(out_dir / fleet / f'{key}.png', optimize=True)
    print('sail palette entries recoloured:', len(sail), 'of', COLORS)
    print('scale', round(scale, 4), 'tallest source', tallest)


if __name__ == '__main__':
    main(*sys.argv[1:3])
