import { create } from 'zustand'

// 원본의 zustand 스토어. 초기값이 true 라서 텍스처 로딩이 끝나기 전엔 UI가 숨겨집니다.
export const useTransitionStore = create((set) => ({
  isTransitioning: true,
  setTransitioning: (value) => set({ isTransitioning: value }),
  startTransition: () => set({ isTransitioning: true }),
  endTransition: () => set({ isTransitioning: false }),
}))
