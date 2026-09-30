import { create } from 'zustand'

// 시작 화면(IntroBadge)에서 Enter 를 눌렀는지. 캐러셀 슬라이드 인과 로딩 바가 이 값을 기다립니다.
export const useIntroStore = create((set) => ({
  entered: false,
  enter: () => set({ entered: true }),
}))
