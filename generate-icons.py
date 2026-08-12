"""
SynActivity Icon Generator
Creates icon-16.png, icon-48.png, icon-128.png using Pillow.
Run: python3 generate-icons.py
"""

import os
import math

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing Pillow...")
    os.system("pip3 install Pillow -q")
    from PIL import Image, ImageDraw

os.makedirs("icons", exist_ok=True)


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.ellipse([x0, y0, x0 + 2*r, y0 + 2*r], fill=fill)
    draw.ellipse([x1 - 2*r, y0, x1, y0 + 2*r], fill=fill)
    draw.ellipse([x0, y1 - 2*r, x0 + 2*r, y1], fill=fill)
    draw.ellipse([x1 - 2*r, y1 - 2*r, x1, y1], fill=fill)


def create_icon(size):
    # 2x supersampling for clean edges
    ss = 2
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background gradient (dark navy → deep purple)
    bg_top    = (10, 12, 32)
    bg_bottom = (20, 10, 50)
    radius    = S // 4

    # Draw gradient background
    for y in range(S):
        t = y / S
        color = lerp_color(bg_top, bg_bottom, t) + (255,)
        draw.line([(0, y), (S, y)], fill=color)

    # Mask to rounded rect
    mask = Image.new("L", (S, S), 0)
    mask_draw = ImageDraw.Draw(mask)
    draw_rounded_rect(mask_draw, [0, 0, S - 1, S - 1], radius, 255)
    img.putalpha(mask)

    # Purple glow (top-left)
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    gx, gy, gr = S // 3, S // 3, S // 2
    for ri in range(gr, 0, -1):
        alpha = int(40 * (ri / gr) ** 2)
        gd.ellipse([gx - ri, gy - ri, gx + ri, gy + ri], fill=(124, 58, 237, alpha))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # ── Clock face ───────────────────────────────────────────
    # Center & radius
    cx, cy = S // 2, S // 2
    cr     = int(S * 0.30)
    cring  = max(2, S // 40)

    # Outer ring (purple to cyan gradient effect via concentric circles)
    for ri in range(cr, cr - cring - 1, -1):
        t = (cr - ri) / cring
        c = lerp_color((124, 58, 237), (6, 182, 212), t) + (255,)
        draw.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], outline=c)

    # Clock face fill (semi-transparent dark)
    draw.ellipse(
        [cx - cr + cring, cy - cr + cring, cx + cr - cring, cy + cr - cring],
        fill=(15, 18, 48, 200)
    )

    # Hour marks (4 marks at 12/3/6/9)
    mark_len = max(2, S // 24)
    mark_thick = max(1, S // 64)
    for angle_deg in [0, 90, 180, 270]:
        rad = math.radians(angle_deg - 90)
        inner = cr - cring - max(2, S // 32)
        outer = cr - cring - max(1, S // 64)
        x1 = int(cx + inner * math.cos(rad))
        y1 = int(cy + inner * math.sin(rad))
        x2 = int(cx + outer * math.cos(rad))
        y2 = int(cy + outer * math.sin(rad))
        draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255, 180), width=mark_thick)

    # Minute hand (pointing to ~10)
    hand_len_m = int(cr * 0.58)
    angle_m    = math.radians(300 - 90)  # ~10 o'clock position
    hx = int(cx + hand_len_m * math.cos(angle_m))
    hy = int(cy + hand_len_m * math.sin(angle_m))
    draw.line([(cx, cy), (hx, hy)], fill=(200, 200, 255, 230), width=max(1, S // 48))

    # Hour hand (pointing to ~2)
    hand_len_h = int(cr * 0.40)
    angle_h    = math.radians(60 - 90)  # ~2 o'clock
    hx2 = int(cx + hand_len_h * math.cos(angle_h))
    hy2 = int(cy + hand_len_h * math.sin(angle_h))
    draw.line([(cx, cy), (hx2, hy2)], fill=(255, 255, 255, 255), width=max(2, S // 36))

    # Center dot (cyan)
    cd = max(3, S // 20)
    draw.ellipse([cx - cd, cy - cd, cx + cd, cy + cd], fill=(6, 182, 212, 255))

    # Downscale to final size with LANCZOS
    img = img.resize((size, size), Image.LANCZOS)
    return img


for size in [16, 48, 128]:
    icon = create_icon(size)
    path = f"icons/icon-{size}.png"
    icon.save(path)
    print(f"✓ Created {path} ({size}×{size})")

print("\nAll icons generated successfully!")
