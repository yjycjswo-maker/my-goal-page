// 3D 카드(캔버스 안)를 키보드로도 열 수 있도록, 각 카드가 자기 "열기 / 띄우기" 함수를 여기에 등록합니다.
// 키: slotId → { index, position, open(), hover(on) }. CardKeys(보이지 않는 버튼 목록)가 index 로 찾아 호출합니다.
export const cardOpeners = new Map()

// 같은 페이지(index)를 보여 주는 카드가 여럿이면 가장 앞(position 이 작은) 카드
export function findOpener(index) {
  let best = null
  for (const o of cardOpeners.values()) {
    if (o.index === index && (!best || o.position < best.position)) best = o
  }
  return best
}
