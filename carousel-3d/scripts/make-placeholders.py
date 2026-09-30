"""public/images/card-NN.jpg 플레이스홀더를 다시 그립니다.

기본: 차콜(#2C2C2E) 불투명 단색 4:3 카드 + 큰 흰 숫자. 검은 배경·흰 테두리·노란 포인트와 어울리는 차분한 톤.
  글씨 없이:      python3 scripts/make-placeholders.py --no-numbers
  숫자+제목:      python3 scripts/make-placeholders.py --titles
  다른 카드 색:   python3 scripts/make-placeholders.py --fill "#EAEAEA" --ink "#111111"
  반투명 유리:    python3 scripts/make-placeholders.py --fill "#5FC999" --alpha 0.35

카드 색과 투명도는 이미지(PNG 알파)가 담고, 테두리·모서리는 셰이더(3D 카드)와 CSS(상세 창)가 그립니다:
src/config.js CARD_BORDER / CARD_RADIUS. 셰이더는 텍스처 알파를 그대로 씁니다.
"""
import re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 500, 375  # CARD_ASPECT 4:3

args = sys.argv[1:]
WITH_NUMBERS = '--no-numbers' not in args
WITH_TITLES = '--titles' in args


def opt(name, default):
    return args[args.index(name) + 1] if name in args else default


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# 차콜. 다른 후보: 딥 그린 #2E5E4A, 딥 네이비 #23304D, 웜 아이보리 #ECE7DD(--ink "#111111")
FILL = hex_rgb(opt('--fill', '#2C2C2E'))
ALPHA = int(round(float(opt('--alpha', '1')) * 255))
INK = hex_rgb(opt('--ink', '#FFFFFF'))    # 숫자/제목 색 (불투명)


def font(size, bold=True):
    for path in ('/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(path, size, index=1 if bold else 0)
        except Exception:
            pass
    return ImageFont.load_default()


data = (ROOT / 'src' / 'data' / 'projects.js').read_text(encoding='utf-8')
items = re.findall(r'image:\s*"([^"]+)",\s*(?:page:\s*"[^"]*",\s*)?title:\s*"([^"]+)"', data)

for i, (image, title) in enumerate(items):
    if image.endswith('-page.png'):  # 페이지 스크린샷 카드는 건드리지 않음 (projects.js 의 page 항목)
        continue
    img = Image.new('RGBA', (W, H), FILL + (ALPHA,))  # 그라디언트 없이 단색 + 알파
    d = ImageDraw.Draw(img)
    if WITH_NUMBERS:
        d.text((28, 24), f'{i + 1:02d}', font=font(64), fill=INK + (255,))
    if WITH_TITLES:
        f = font(36, bold=False)
        lines, line = [], ''
        for word in title.split(' '):
            test = (line + ' ' + word).strip()
            if d.textlength(test, font=f) > W - 56 and line:
                lines.append(line); line = word
            else:
                line = test
        lines.append(line)
        y0 = H - 40 - 44 * len(lines)
        for j, ln in enumerate(lines):
            d.text((28, y0 + j * 44), ln, font=f, fill=INK + (255,))
    img.save(ROOT / 'public' / image.lstrip('/'))  # .png (알파 유지)

label = ', '.join(x for x, on in [('numbers', WITH_NUMBERS), ('titles', WITH_TITLES)] if on) or 'no text'
print(f'{len(items)} images written ({label}, fill #{FILL[0]:02X}{FILL[1]:02X}{FILL[2]:02X} @ {ALPHA / 255:.2f})')
