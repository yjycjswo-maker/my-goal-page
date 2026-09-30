// 모든 카드가 이 가로세로 비율로 통일됩니다. (가로 / 세로)
// 이미지는 비율이 달라도 찌그러지지 않고 object-fit: cover 처럼 가운데를 기준으로 잘려 채워집니다.
export const CARD_ASPECT = 4 / 3

// 모서리 반지름 (카드 높이 대비 비율). 0 이면 각진 모서리. 3D 카드는 셰이더에서, 상세 창은 CSS 로 같은 비율을 씁니다.
export const CARD_RADIUS = 0

// 카드 테두리. width 는 화면 px, color 는 sRGB, alpha 는 투명도. 겹친 카드끼리 경계가 보이도록 불투명 연한 그레이 선.
// 카드 유리 위에 겹쳐 그려지므로 카드 색이 살짝 비칩니다. 3D 카드와 상세 창에 똑같이 적용. width 0 이면 없음.
export const CARD_BORDER = { width: 1, color: '#a8a8a8', alpha: 1 }

// 시작 위치: 1번 카드가 카메라 초점(원점)보다 몇 칸 앞(카메라 쪽)에 놓일지.
// 0 이면 1번 카드가 초점 위치에, 2 이면 1번이 맨 앞에 오고 3번이 초점 위치에 옵니다.
export const START_OFFSET = 2

// 카드가 튀어나올 때(호버 / 상세 창) 그 앞에 쌓인 카드들이 옆으로 비켜나는 거리 (3D 단위, 화면상 왼쪽).
// 튀어나온 카드가 앞 카드에 가려지지 않게 합니다. 0 이면 원본처럼 비켜나지 않습니다.
export const FRONT_SHIFT = 0

// 글씨(하단 Overview/Index, 호버 시 제목 라벨, 창 안의 번호·제목·안내문·버튼 글씨)를 보일지.
// false 면 글씨가 모두 사라지고, 창의 닫기/이동 버튼은 × / ↗ 아이콘으로 바뀝니다.
export const SHOW_TEXT = false
