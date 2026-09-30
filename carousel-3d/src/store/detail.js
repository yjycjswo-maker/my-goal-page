import { create } from 'zustand'

// 카드 클릭 시 열리는 상세 창 상태.
// active: { id, slotId, position, project, index, total, z, quad, getQuad } | null
//   position 슬롯 위치. 이보다 앞에 쌓인 카드들은 창이 떠 있는 동안 옆으로 비켜나 있습니다 (store/raise.js 참고)
//   z       클릭 순간 카드가 떠 있던 높이 (호버 pop)
//   quad    클릭 순간 카드가 화면에서 차지하던 네 꼭짓점(px, 좌상→우상→우하→좌하)
//   getQuad(atZ) 카드를 atZ 높이에 둔 것으로 꼭짓점을 다시 계산 (닫힐 때 클릭 당시 자리로 되돌아가기 위해)
// phase: 'closed' | 'opening' | 'open' | 'closing'
//   active 가 남아 있는 동안(closing 포함) 3D 카드는 숨겨지고 DOM 창이 그 자리를 대신합니다.
export const useDetailStore = create((set, get) => ({
  active: null,
  phase: 'closed',
  open: (payload) => {
    if (get().active) return
    set({ active: payload, phase: 'opening' })
  },
  setOpen: () => set({ phase: 'open' }),
  close: () => {
    const { phase } = get()
    if (phase === 'opening' || phase === 'open') set({ phase: 'closing' })
  },
  finishClose: () => set({ active: null, phase: 'closed' }),
}))
