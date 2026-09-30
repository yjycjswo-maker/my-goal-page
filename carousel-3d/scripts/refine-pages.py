"""1회용 정리 스크립트 (impeccable harden · layout · extract · distill).
public/pages/page-0N.html 을 고칩니다. 다 고친 뒤 scripts/sync-pages.py 로 ../pages 에 복사.
"""
import re
from pathlib import Path

PAGES = Path(__file__).resolve().parent.parent / "public/pages"
log = []


def cut(s, start, end, label, required=True):
    """start 부터 end 직전까지 삭제"""
    i = s.find(start)
    if i < 0:
        assert not required, label
        return s
    j = s.index(end, i)
    log.append(label)
    return s[:i] + s[j:]


def drop(s, text, label, required=True):
    if text not in s:
        assert not required, label
        return s
    log.append(label)
    return s.replace(text, "")


P3_MEDIA = '''  /* 사진이 들어간 행: 설명 아래(오른쪽 칸)에 사진. 행 높이 안에 맞춰 줄어듭니다 */'''
GALLERY = '''  /* 로고 시안 모음: 윗줄에 정사각형 시안 4개, 아랫줄에 워드마크(남은 높이에 맞춤) */
  .gallery {
    height: 100%; display: grid; gap: 12px;
    grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: auto minmax(0, 1fr);
  }
  .gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid var(--line); }
  .gallery img:last-child {
    grid-column: 1 / -1; width: auto; height: 100%; max-width: 100%; aspect-ratio: auto;
    object-fit: contain; justify-self: start;
  }
  @media (max-width: 767px) {
    .gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  }
'''
REFS = '''  /* 레퍼런스 사진 모음: 5칸 격자, 칸마다 사진 전체가 보이도록 */
  .refs {
    display: grid; gap: 10px; align-content: start;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .refs img { width: 100%; aspect-ratio: 4 / 5; object-fit: contain; background: #fff; border: 1px solid var(--line); }
  @media (max-width: 767px) {
    .refs { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  }
'''

for n in range(1, 9):
    p = PAGES / f"page-0{n}.html"
    s = p.read_text()
    log.clear()

    # ── distill: 지운 헤더·CTA·KO/EN·커서 칩의 CSS ──
    s = cut(s, "  /* ───────── 고정 UI ───────── */\n", "  /* 페이지 번호:", "dead fixed-ui css")
    s = drop(s, "    --chip:      #ffffff;\n", "--chip")
    s = drop(s, "  /* 캐러셀 창 안: 창의 × 버튼(오른쪽 위)과 겹치지 않게 CTA 를 왼쪽으로 */\n  .is-embedded .cta { right: calc(var(--margin) + 64px); }\n", "embedded cta")
    s = drop(s, "  @media (max-width: 767px) {\n    .is-embedded .header { width: calc(100vw - 2 * var(--margin) - 114px); }\n  }\n", "embedded header")
    s = drop(s, "  .is-shot .cursor-chip { display: none; }\n", "shot chip")
    s = drop(s, ", .is-instant .tagline span", "instant tagline")
    s = drop(s, "    .tagline span { transition: none; }\n", "rm tagline")
    s = drop(s, "  /* 투명 그라디언트: html 배경이 완전히 비면 body 의 종이색이 화면 전체로 번져(배경 전파) 구멍이 막히므로 */\n", "dup comment", required=False)
    s = s.replace("     캐러셀 창에서는 페이지 뒤에 로고 판(ProjectWindow HoleLogo)이 깔려 구멍으로 보입니다 */",
                  "     캐러셀 창에서는 뒤의 장면(클로드 로고)이 구멍으로 보입니다 */")

    # ── distill: 태그라인 전환 JS, data-tagline / data-chip / chip ──
    if "swapTagline" in s:
        s = cut(s, "  // 구분선 진행도 + 헤더 태그라인\n", "  function update() {", "tagline js")
        s = s.replace("  function update() {", "  // 구분선 진행도\n  const rows = [...document.querySelectorAll(\".row\")];\n\n  function update() {", 1)
        s = drop(s, "    const active = sections.filter(s => s.getBoundingClientRect().top < vh * 0.4).pop() || sections[0];\n    swapTagline(active.dataset.tagline);\n", "tagline update")
    s, k = re.subn(r' data-tagline="[^"]*"', "", s); log.append(f"data-tagline x{k}")
    s, k = re.subn(r' data-chip="[^"]*"', "", s); log.append(f"data-chip x{k}")
    s, k = re.subn(r', chip: "[^"]*"', "", s); log.append(f"chip x{k}")

    # ── harden: 인트로 제목을 h1 로 ──
    i = s.index('<p class="intro-title">')
    j = s.index("</p>", i)
    s = s[:i] + '<h1 class="intro-title">' + s[i + len('<p class="intro-title">'):j] + "</h1>" + s[j + 4:]
    s, k = re.subn(r"  \.intro p\.intro-title \{[^}]*\}\n", "", s); log.append(f"intro css x{k}")

    # ── layout: 설명 폭을 페이지마다 재던 스크립트 → page.css 의 공통 폭 ──
    s = cut(s, "  // 설명 왼쪽 정렬:", "  // 진입 리빌", "alignDesc js", required=(n != 1))
    s = drop(s, "  /* 모든 행의 설명이 같은 왼쪽 선에서 시작하도록, 가장 긴 설명의 폭(--desc-w, 스크립트가 계산)으로 통일 */\n  @media (min-width: 768px) {\n    .desc { width: var(--desc-w, auto); max-width: none; }\n  }\n", "desc-w css", required=(n != 1))

    # ── extract: 사진 행 CSS 는 page.css 로 (페이지 고유 모음 CSS 만 남김) ──
    if n in (4, 5, 6, 7):
        s = cut(s, "  /* 이 페이지는 행이 높아(480)", "  /* 스크롤 끝 = 모든 행이", "media css 4-7")
        extra = {4: REFS, 6: GALLERY}.get(n, "")
        s = s.replace("  /* 스크롤 끝 = 모든 행이", extra + "  /* 스크롤 끝 = 모든 행이", 1)
        s = drop(s, "    --row-h: 480px; /* 사진 행이 있어 다른 페이지(360)보다 높게 */\n", "row-h 480")
        s = s.replace("--row-h: 600px; --header-h: 72px;", "--row-h: 375px; --header-h: 72px;", 1)
    if n == 3:
        s = cut(s, P3_MEDIA, "  /* 스크롤 끝 = 모든 행이", "media css 3")

    # ── page.css 연결 ──
    if 'href="page.css"' not in s:
        s = s.replace("</style>", '</style>\n<link rel="stylesheet" href="page.css" />', 1)

    p.write_text(s)
    print(p.name, "|", ", ".join(log))
