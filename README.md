# my-goal-page

클로드코드 과정 첫 과제, **나의 목표 소개 페이지**. 왜 듣는지, 뭘 배울지, 뭘 만들지를 8페이지로 정리하고, 3D 카드 캐러셀에 담았다.

## 구성

| 폴더 | 내용 |
|---|---|
| `carousel-3d/` | 홈 화면. React + Three.js(React Three Fiber) 3D 카드 캐러셀. 카드를 누르면 페이지가 창으로 펴짐 |
| `carousel-3d/public/pages/` | 1~8페이지 원본 (HTML·CSS·JS, 공통 규칙은 `page.css`) |
| `pages/` | 단독으로 열어 보는 사본 (`scripts/sync-pages.py` 로 생성) |
| `design-reference/` | 레퍼런스 분석, 시안 |
| `PRD.md` | 페이지 기획 문서 |

## 실행

```bash
cd carousel-3d
pnpm install
pnpm dev --host 127.0.0.1 --port 5199
```

페이지를 고친 뒤:

```bash
python3 carousel-3d/scripts/sync-pages.py   # pages/ 사본 갱신
python3 carousel-3d/scripts/shoot-page.py 3  # 3번 카드 썸네일 다시 찍기 (Chrome 필요)
```

## 배포 (Vercel)

저장소를 Vercel 에 연결하면 설정 없이 배포됩니다. 루트의 `vercel.json` 이 `carousel-3d` 를 설치·빌드하고 `carousel-3d/dist` 를 올립니다.
(Vercel 에서 Root Directory 를 `carousel-3d` 로 지정해도 됩니다. 그때는 Vite 가 자동으로 잡힙니다.)

Made with Claude Code
