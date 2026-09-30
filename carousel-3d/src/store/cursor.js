import { create } from 'zustand'

// 원본은 mouse-follower 인스턴스의 setText / removeText 를 호출합니다.
// 여기서는 같은 인터페이스를 가진 작은 스토어로 대체했습니다.
export const useCursorStore = create((set) => ({
  text: '',
  setText: (text) => set({ text }),
  removeText: () => set({ text: '' }),
}))
