"""Turn the generated pirate troop paintings into small, palette-limited game sprites.

usage: python3 -I scripts/build-troop-sprites.py <source dir> <output dir>

The source dir holds one PNG per unit and facing, named <unit>-<facing>.png:
  units:   swordsman, archer, captain
  facings: left, right, up, down        (e.g. archer-left.png)

For each image the script
  1. cuts the figure out (uses the PNG's transparency, or flood-fills a plain
     white background) and strips the magenta halo the image generator leaves,
  2. scales ALL twelve by one common factor, so the three characters keep their
     relative size and every facing of one character matches,
  3. centres each in a fixed frame (wide for left/right, narrow for up/down),
     standing on a common baseline,
  4. forces every sprite onto one shared palette (EGA-style, but 32 colours — the
     figures need more than the ships do).

Needs Pillow and numpy. Only the PNGs it writes ship to the browser.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

UNITS = ['swordsman', 'archer', 'captain']
FACINGS = ['left', 'right', 'up', 'down']
FIGURE_HEIGHT = 72     # the tallest figure is this many pixels high in its frame
FRAME_SIDE = (136, 80)  # (w, h) frame for left/right facings
FRAME_TOP = (72, 80)    # (w, h) frame for up/down facings
BASELINE_MARGIN = 4    # empty pixels under the feet
WORK_WIDTH = 1500      # working resolution for the cut-out
COLORS = 32
WHITE_MIN = 232


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
    src = Image.open(path)
    has_alpha = src.mode == 'RGBA' and np.asarray(src.getchannel('A')).min() < 255
    im = src.convert('RGBA' if has_alpha else 'RGB')
    scale = WORK_WIDTH / im.width
    im = im.resize((WORK_WIDTH, round(im.height * scale)), Image.LANCZOS)
    full = np.asarray(im)
    rgb = full[..., :3]
    arr = rgb.astype(np.int16)

    background = full[..., 3] < 128 if has_alpha else border_connected(arr.min(axis=2) >= WHITE_MIN)

    # The generator leaves a magenta halo just outside the dark outline.
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    magenta = (b - g > 35) & (r - g > 35)
    near_bg = background.copy()
    for _ in range(8):
        near_bg = grow(near_bg)
    alpha = ~(background | (magenta & near_bg))

    ys, xs = np.nonzero(alpha)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return rgb[box[1]:box[3], box[0]:box[2]], alpha[box[1]:box[3], box[0]:box[2]]


def resize_rgba(rgb, a, scale):
    """Premultiplied resize, so edges don't pick up dark or light halos."""
    h, w = a.shape
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    alpha = np.asarray(Image.fromarray((a * 255).astype(np.uint8), 'L').resize(size, Image.LANCZOS)).astype(np.float32)
    out = np.zeros(size[::-1] + (3,), np.float32)
    ok = alpha > 0
    for c in range(3):
        premult = np.asarray(Image.fromarray((rgb[..., c] * a).astype(np.uint8), 'L').resize(size, Image.LANCZOS)).astype(np.float32)
        out[..., c][ok] = premult[ok] / alpha[ok] * 255
    return np.clip(out, 0, 255).astype(np.uint8), alpha >= 128


def main(src_dir, out_dir, colors=COLORS):
    src_dir, out_dir = Path(src_dir), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cut = {(u, f): cut_out(src_dir / f'{u}-{f}.png') for u in UNITS for f in FACINGS}
    scale = FIGURE_HEIGHT / max(a.shape[0] for _, a in cut.values())

    frames = {}
    for (unit, facing), (rgb, a) in cut.items():
        srgb, sa = resize_rgba(rgb, a, scale)
        h, w = sa.shape
        fw, fh = FRAME_SIDE if facing in ('left', 'right') else FRAME_TOP
        ox, oy = (fw - w) // 2, fh - BASELINE_MARGIN - h
        canvas = np.zeros((fh, fw, 3), np.uint8)
        mask = np.zeros((fh, fw), bool)
        for y in range(h):
            for x in range(w):
                fx, fy = x + ox, y + oy
                if sa[y, x] and 0 <= fx < fw and 0 <= fy < fh:
                    canvas[fy, fx] = srgb[y, x]
                    mask[fy, fx] = True
        frames[(unit, facing)] = (canvas, mask)

    pixels = np.concatenate([c[m] for c, m in frames.values()])
    strip = Image.fromarray(pixels.reshape(1, -1, 3), 'RGB')
    palette = strip.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)

    for (unit, facing), (canvas, mask) in frames.items():
        q = np.asarray(Image.fromarray(canvas, 'RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGB'))
        rgba = np.dstack([q, (mask * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(out_dir / f'{unit}-{facing}.png', optimize=True)
    print('scale', round(scale, 4), '| palette colours', colors, '| sprites', len(frames))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else COLORS)
