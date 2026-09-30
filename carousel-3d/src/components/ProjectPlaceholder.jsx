import { useEffect } from 'react'
import { useTransitionStore } from '../store/transition.js'

// 카드 클릭 후 이동하는 자리. 원본에서는 Next.js 프로젝트 페이지입니다.
// ::view-transition-new(root) 에 걸리던 clip-path 등장 키프레임을 그대로 적용합니다.
export default function ProjectPlaceholder() {
  const slug = decodeURIComponent(window.location.pathname.replace(/^\/projects\/?/, '')) || 'index'

  useEffect(() => {
    document.documentElement.animate(
      [
        { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)' },
        { clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)' },
      ],
      { duration: 1200, easing: 'cubic-bezier(0.87, 0, 0.13, 1)', fill: 'forwards' },
    )
    useTransitionStore.getState().endTransition()
  }, [])

  return (
    <section className="Placeholder">
      <p className="Placeholder__eyebrow">project page placeholder</p>
      <h1 className="Placeholder__title">{slug}</h1>
      <a className="Placeholder__back" href="/">
        ← Back to overview
      </a>
    </section>
  )
}
