# carousel-3d

gabrielveres.com 메인의 WebGL 프로젝트 캐러셀을 같은 스택(React + React Three Fiber + drei + virtual-scroll + framer-motion + zustand)으로 재현한 프로젝트입니다.

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # dist/
```

## 구조

| 파일 | 원본 대응 | 역할 |
|---|---|---|
| `src/components/ProjectsOverview.jsx` | `W` | 100svh 스테이지, 우하단 Overview / Index 바 |
| `src/components/Scene.jsx` | `C` | virtual-scroll 바인딩, R3F Canvas, 로딩 바 |
| `src/components/Carousel.jsx` | `E` | 무한 고리 슬롯 재배치, useFrame lerp, 인트로 |
| `src/components/ProjectCard.jsx` | `g` | 보이는 메시 + 셰이더, 투명 히트 메시(카드와 같은 크기, 원본은 1.64배), 호버/클릭 |
| `src/components/LoadingBar.jsx` | `L` | useProgress → spring 진행 바 |
| `src/components/ProjectWindow.jsx` | — (변형) | 카드 클릭 시 카드 자리에서 커지는 상세 창. 원본은 프로젝트 페이지로 이동 |
| `src/shaders.js` | 페이지 청크 | cover 크롭 + 둥근 모서리(SDF) + 테두리 프래그먼트 셰이더 (원본의 비네트는 제거) |
| `src/config.js` | — | `CARD_ASPECT`: 카드 비율, `CARD_RADIUS`: 모서리(0 = 각짐), `CARD_BORDER`: 테두리, `START_OFFSET`: 시작 시 1번 카드 위치, `FRONT_SHIFT`: 튀어나온 카드 앞의 카드들이 비켜나는 거리 |
| `src/data/projects.js` | Sanity 데이터 | overviewItems 20개(원본 71개). 여기만 바꾸면 내 프로젝트로 교체 |

`public/images/` 의 이미지는 차콜(#2C2C2E) 불투명 단색 4:3 플레이스홀더 20장에 큰 흰 숫자만 있습니다(`scripts/make-placeholders.py`, `--titles` 로 제목 추가, `--no-numbers` 로 글씨 제거, `--fill/--ink` 로 색 변경, `--alpha` 로 반투명 유리 카드). 셰이더와 창은 이미지의 알파를 그대로 씁니다. 테두리와 모서리는 이미지가 아니라 셰이더/CSS 가 그립니다. 비율이 다른 이미지를 넣어도 카드 크기는 `CARD_ASPECT` 로 통일되고 이미지는 가운데 기준으로 잘려 채워집니다. `public/sounds/click.wav` 도 합성음입니다.

카드를 클릭하면 원본처럼 페이지를 이동하지 않고, 카드가 있던 자리에서 화면 가운데로 펴지는 창이 열립니다(`src/components/ProjectWindow.jsx`, 상태는 `src/store/detail.js`). 클릭 순간 3D 카드의 네 꼭짓점을 화면 좌표로 투영해 같은 원근(matrix3d)으로 DOM 창을 겹쳐 놓고 3D 카드는 숨기므로, 카드가 끊기지 않고 그대로 창으로 이어집니다. 창이 열린 동안 캐러셀 스크롤은 멈추고, 바깥 클릭 · Close 버튼 · ESC 로 닫으면 다시 카드 자리로 줄어들며 사라집니다. 창 안의 "Visit project" 는 원본의 페이지 전환을 그대로 실행합니다.

지금은 `FRONT_SHIFT` 가 0 이라 호버한 카드만 움직이고 나머지 카드는 제자리에 있습니다. 값을 주면(예: 0.4) 튀어나온 카드 앞에 쌓인 카드들이 그만큼 화면 왼쪽으로 비켜납니다. 창이 열려 있는 동안 비켜난 상태가 유지되므로 창이 카드로 접혀 돌아올 때도 겹침이 없습니다. 원본처럼 비켜나지 않게 하려면 `FRONT_SHIFT` 를 0 으로 두면 됩니다.

UI 글씨(하단 Overview/Index, 호버 라벨, 창의 번호·제목·안내문)는 `SHOW_TEXT`(`src/config.js`)가 false 라서 보이지 않습니다. 카드 이미지에는 큰 숫자만 있습니다. 제목까지 넣으려면 `python3 scripts/make-placeholders.py --titles`, 글씨를 없애려면 `--no-numbers` 를 쓰고, UI 글씨는 `SHOW_TEXT` 를 true 로 두면 돌아옵니다.

### 창 안에 HTML 페이지 열기 (`page`)

`projects.js` 항목에 `page` 를 주면, 그 카드를 클릭했을 때 창이 다 펴진 뒤 스크린샷 위로 실제 페이지(iframe)가 나타납니다. 지금은 2~8번 카드가 `public/pages/page-02.html` ~ `page-08.html`(PRD 2~8페이지)을 엽니다. 모두 Lama Lama 스태킹 행 디자인입니다.

- 카드 앞면 `image` 는 그 페이지의 첫 화면 스크린샷입니다. 카드 → 창 → 페이지가 같은 그림이라 이음매 없이 이어집니다.
- 페이지 원본은 `../pages/page-0N.html` 이고, 여기 사본에는 창 안 전용 코드(× 버튼과 겹치지 않게 CTA 이동, ESC 를 부모에 전달, `?shot` 촬영 모드)가 더 있습니다.
- 페이지를 고치면 스크린샷을 다시 찍습니다 (창 크기 1008×756 기준, 다른 페이지는 02 를 해당 번호로):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=1008,756 --virtual-time-budget=6000 --screenshot="$PWD/public/images/card-02-page.png" "file://$PWD/public/pages/page-02.html?shot&embed"
```

`scripts/make-placeholders.py` 는 `-page.png` 이미지를 건드리지 않습니다.

