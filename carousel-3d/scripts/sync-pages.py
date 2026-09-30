"""public/pages 가 원본. 여기서 고친 뒤 이 스크립트로 ../pages(단독 열람용 사본)에 복사합니다.
사본에서는 이미지 경로를 캐러셀의 public/images 로 바꿔, 이미지를 한 벌만 둡니다.

사용: python3 scripts/sync-pages.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/pages"
DST = ROOT.parent / "pages"

for f in sorted(SRC.glob("page-0*.html")):
    s = f.read_text().replace('"../images/', '"../carousel-3d/public/images/')
    (DST / f.name).write_text(s)
    print("synced", f.name)
shutil.copy(SRC / "page.css", DST / "page.css")
print("synced page.css")
