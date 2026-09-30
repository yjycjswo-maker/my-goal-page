import { useMemo } from 'react'

// 원본은 next-view-transitions 의 router.push(url, { onTransitionReady }) 로
// ::view-transition-old(root) 에 아래 키프레임을 적용합니다.
// 라우터가 없는 단독 데모이므로 같은 키프레임을 문서 전체에 적용한 뒤 이동합니다.
export function usePageTransition() {
  return useMemo(
    () => ({
      push(href) {
        const anim = document.documentElement.animate(
          [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-35%)' },
          ],
          { duration: 1200, easing: 'cubic-bezier(0.87, 0, 0.13, 1)', fill: 'forwards' },
        )
        anim.finished.then(() => window.location.assign(href)).catch(() => {})
      },
    }),
    [],
  )
}
