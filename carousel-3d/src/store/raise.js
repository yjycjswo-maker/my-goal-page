import { create } from 'zustand'

// 호버로 떠 있는(pop) 카드의 슬롯 position.
// 그보다 앞(카메라 쪽, position 이 작은)에 쌓인 카드들은 FRONT_SHIFT 만큼 옆으로 비켜나
// 떠 있는 카드가 가려지지 않고 완전히 드러납니다.
export const useRaiseStore = create((set) => ({
  hovered: null,
  raise: (position) => set({ hovered: position }),
  // 다른 카드로 옮겨간 뒤 늦게 도착한 leave 가 새 값을 지우지 않도록 같은 카드일 때만 해제
  lower: (position) => set((s) => (s.hovered === position ? { hovered: null } : {})),
}))
