import { useEffect, useRef } from 'react'
import { useDetailStore } from '../store/detail.js'
import { useIntroStore } from '../store/intro.js'
import { findOpener } from '../store/cardOpeners.js'

// 키보드로 3D 카드 열기.
// 카드는 캔버스 안에 그려져 Tab 으로 갈 수 없으므로, 페이지마다 보이지 않는 버튼을 하나씩 둡니다.
// Tab 으로 버튼에 가면 해당 카드가 마우스 호버처럼 튀어나오고 버튼 이름표가 화면 아래에 보이며,
// Enter / Space 로 창을 엽니다. 창을 닫으면 포커스가 그 버튼으로 돌아옵니다.
export default function CardKeys({ items }) {
  const entered = useIntroStore((s) => s.entered)
  const phase = useDetailStore((s) => s.phase)
  const lastButton = useRef(null)

  useEffect(() => {
    if (phase === 'closed' && lastButton.current) {
      lastButton.current.focus({ preventScroll: true })
      lastButton.current = null
    }
  }, [phase])

  if (!entered || !items?.length) return null

  return (
    <nav className="CardKeys" aria-label="페이지 목록">
      <ol>
        {items.map((item, i) => (
          <li key={item.page || i}>
            <button
              type="button"
              className="CardKeys__button"
              onFocus={() => findOpener(i)?.hover(true)}
              onBlur={() => findOpener(i)?.hover(false)}
              onClick={(e) => {
                lastButton.current = e.currentTarget
                findOpener(i)?.open()
              }}
            >
              {String(i + 1).padStart(2, '0')} {item.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
