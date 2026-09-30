"""페이지 카드 썸네일 촬영: public/pages/page-0N.html → public/images/card-0N-page.webp (--alpha 는 .png)

기본: 불투명. 페이지 번호 구멍은 캐러셀 배경과 같은 검정으로 채웁니다.
  (카드가 투명하면 캐러셀에서 구멍으로 뒤 카드가 비쳐 카드끼리 겹쳐 보이므로)
--alpha: 구멍을 투명하게. headless Chrome 스크린샷은 알파가 없어서,
  구멍 뒤를 검정/흰색으로 두 번 찍어 투명도를 계산합니다.

사용: python3 scripts/shoot-page.py 1 2 3   (인자 없으면 1~8)
      python3 scripts/shoot-page.py --alpha 2
"""
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageChops

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).resolve().parent.parent


def shot(n, bg, out):
    url = (ROOT / f"public/pages/page-0{n}.html").as_uri() + f"?shot&embed&holebg={bg}"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", "--window-size=1008,756",
                    "--virtual-time-budget=6000", f"--screenshot={out}", url],
                   check=True, capture_output=True)


args = [a for a in sys.argv[1:] if a != "--alpha"]
ALPHA = "--alpha" in sys.argv[1:]

for n in [int(a) for a in args] or range(1, 9):
    if not ALPHA:
        # 캐러셀 텍스처로 쓰는 썸네일은 WebP (PNG 대비 1/10 크기, 사진이 든 1번 카드는 1MB → 약 100KB)
        dst = ROOT / f"public/images/card-0{n}-page.webp"
        with tempfile.TemporaryDirectory() as t:
            tmp = Path(t, "shot.png")
            shot(n, "000", tmp)
            Image.open(tmp).convert("RGB").save(dst, "WEBP", quality=90, method=6)
        print("saved", dst.name)
        continue
    with tempfile.TemporaryDirectory() as t:
        b, w = Path(t, "b.png"), Path(t, "w.png")
        shot(n, "000", b); shot(n, "fff", w)
        ib, iw = Image.open(b).convert("RGB"), Image.open(w).convert("RGB")
    # 알파 = 1 - (흰 배경 - 검정 배경) / 255, 색 = 검정 배경 결과 / 알파
    diff = ImageChops.subtract(iw, ib).convert("L")
    alpha = diff.point(lambda v: 255 - v)
    out = ib.convert("RGBA")
    px, pa, pb = out.load(), alpha.load(), ib.load()
    W, H = out.size
    for y in range(H):
        for x in range(W):
            a = pa[x, y]
            if a == 255:
                continue
            r, g, bl = pb[x, y]
            px[x, y] = (0, 0, 0, 0) if a == 0 else (min(255, r * 255 // a), min(255, g * 255 // a), min(255, bl * 255 // a), a)
    dst = ROOT / f"public/images/card-0{n}-page.png"
    out.save(dst)
    print("saved", dst.name)
