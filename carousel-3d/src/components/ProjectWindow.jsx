import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion } from 'framer-motion'
import PillButton from './PillButton.jsx'
import { useDetailStore } from '../store/detail.js'
import { useTransitionStore } from '../store/transition.js'
import { prefersReducedMotion } from '../lib/motion.js'
import { useWindowSize } from '../hooks/useWindowSize.js'
import { CARD_ASPECT, CARD_RADIUS, CARD_BORDER, SHOW_TEXT } from '../config.js'

// 펴짐/접힘 모두 같은 시간과 이징을 씁니다. [0.83, 0, 0.17, 1] 은 대칭 곡선이라 거꾸로 재생해도 같은 모양입니다.
const MORPH = { duration: 0.9, ease: [0.83, 0, 0.17, 1] }
// 동작 줄이기: 펴지고 접히는 움직임을 짧게 (카드 자리에서 창으로 이어진다는 관계는 유지)
const morph = () => (prefersReducedMotion() ? { duration: 0.25, ease: [0.65, 0, 0.35, 1] } : MORPH)
// 열릴 때: 펴진 뒤 글자가 CHROME_IN 동안 나타남 / 닫힐 때(역재생): 글자가 CHROME_OUT 동안 사라진 뒤 접힘
const CHROME_IN = 0.45
const CHROME_OUT = 0.35
const BACKDROP = 0.6

// project.page 를 그리는 고정 크기. 카드 스크린샷(card-0N-page.png)을 이 크기로 찍었으므로,
// 창이 얼마나 크든 페이지를 이 크기로 그린 뒤 창에 맞춰 확대/축소해 카드와 똑같은 배치를 유지합니다.
const PAGE_W = 1008
const PAGE_H = PAGE_W / CARD_ASPECT

const pad = (n) => String(n).padStart(2, '0')

const lerp = (a, b, t) => a + (b - a) * t
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// CARD_BORDER 의 '#rrggbb' + alpha → 'rgba(r, g, b, a)' (3D 카드 셰이더와 같은 색·투명도)
const n = parseInt(CARD_BORDER.color.slice(1), 16)
const BORDER_RGBA = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${CARD_BORDER.alpha ?? 1})`

// 창이 다 열렸을 때의 사각형: 화면 가운데, 카드와 같은 비율(CARD_ASPECT)
function targetRect(vw, vh, isMobile) {
  const marginX = isMobile ? 16 : vw * 0.08
  const marginY = isMobile ? 16 : vh * 0.08
  let width = Math.min(vw - marginX * 2, 1240)
  let height = width / CARD_ASPECT
  const maxHeight = vh - marginY * 2
  if (height > maxHeight) {
    height = maxHeight
    width = height * CARD_ASPECT
  }
  return { x: (vw - width) / 2, y: (vh - height) / 2, width, height }
}

// 단위 정사각형 (0,0)(1,0)(1,1)(0,1) 을 임의의 사각형 p0..p3 로 보내는 호모그래피 (Heckbert)
function squareToQuad([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    // 평행사변형(원근 없음)
    return { a: x1 - x0, b: x3 - x0, c: x0, d: y1 - y0, e: y3 - y0, f: y0, g: 0, h: 0 }
  }
  const det = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const h = (dx1 * dy3 - dx3 * dy1) / det
  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    c: x0,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    f: y0,
    g,
    h,
  }
}

// 요소 박스 (0,0)-(w,h) 를 quad(요소 기준 px) 로 보내는 CSS matrix3d
function quadMatrix(w, h, quad) {
  const m = squareToQuad(quad)
  return `matrix3d(${m.a / w}, ${m.d / w}, 0, ${m.g / w}, ${m.b / h}, ${m.e / h}, 0, ${m.h / h}, 0, 0, 1, 0, ${m.c}, ${m.f}, 0, 1)`
}

// p = 0 이면 카드가 있던 원근 사각형, p = 1 이면 화면 가운데 직사각형(변형 없음).
// 꼭짓점을 선형 보간하고 그 사각형으로 가는 원근 변환을 매 프레임 적용합니다.
function apply(el, frameEl, p, quad, target) {
  const { x, y, width, height } = target
  const rect = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ]
  const q = quad.map(([qx, qy], i) => [lerp(qx - x, rect[i][0], p), lerp(qy - y, rect[i][1], p)])
  el.style.transform = quadMatrix(width, height, q)
  // 모서리는 카드와 같은 비율(CARD_RADIUS × 높이). 요소가 matrix3d 로 축소되면 반지름도 같이 줄어 카드와 일치합니다.
  el.style.borderRadius = `${CARD_RADIUS * height}px`
  el.style.boxShadow = `0 4rem 12rem rgba(0, 0, 0, ${(0.6 * p).toFixed(3)})`
  // 테두리는 화면에서 항상 CARD_BORDER.width px 로 보이도록, 지금 축소된 비율만큼 굵게 그립니다.
  if (frameEl) {
    const cardHeight = (dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / 2
    const scale = lerp(cardHeight / height, 1, p)
    frameEl.style.boxShadow = `inset 0 0 0 ${(CARD_BORDER.width / scale).toFixed(2)}px ${BORDER_RGBA}`
  }
}

// 카드를 클릭하면 3D 카드가 숨겨지는 동시에 같은 자리에 같은 원근으로 DOM 창이 나타나
// 화면 가운데 직사각형으로 펴집니다. 닫으면 열림을 거꾸로 재생하듯 글자가 먼저 사라지고
// 클릭했을 때의 카드 자리(호버로 떠 있던 높이)로 접힌 뒤 3D 카드가 이어받습니다.
export default function ProjectWindow({ router, playSound, isMobile }) {
  const active = useDetailStore((s) => s.active)
  const phase = useDetailStore((s) => s.phase)
  const startTransition = useTransitionStore((s) => s.startTransition)
  const { width: vw, height: vh } = useWindowSize()
  const boxRef = useRef(null)
  const frameRef = useRef(null)
  const progress = useRef(0)
  const targetRef = useRef(null)
  const pageRef = useRef(null)

  // project.page 가 있는 카드: 창이 다 펴지면 스크린샷(img) 위로 실제 페이지(iframe)가 나타납니다.
  const [pageReady, setPageReady] = useState(false)
  const hasPage = !!active?.project.page

  const target = vw && vh ? targetRect(vw, vh, isMobile) : null
  targetRef.current = target

  const { close, setOpen, finishClose } = useDetailStore.getState()

  // ESC 로 닫기 (창 안의 페이지에서 누른 ESC 포함)
  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    // 창 안의 페이지(iframe)에서 ESC 를 누르면 페이지가 메시지로 알려 줍니다 (public/pages/*.html)
    const onMessage = (e) => {
      if (e.origin === window.location.origin && e.data?.type === 'page-window:close') close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('message', onMessage)
    }
  }, [active, close])

  // 페이지 창이 열려 있는 동안 캐러셀의 따라다니는 커서를 숨깁니다 (iframe 안으로는 마우스 이벤트가 오지 않아 멈춰 보임)
  useEffect(() => {
    if (!hasPage) return
    document.body.classList.add('has-page-window')
    return () => document.body.classList.remove('has-page-window')
  }, [hasPage])

  useEffect(() => {
    if (!active) setPageReady(false)
  }, [active])

  // 창이 다 열리고 페이지가 뜨면 키보드 포커스를 페이지 안으로 (방향키·스페이스로 스크롤, ESC 로 닫기)
  useEffect(() => {
    if (phase === 'open' && pageReady) pageRef.current?.focus()
  }, [phase, pageReady])

  // 첫 페인트 전에 카드 자리(p = 0)에 맞춰 두어 큰 직사각형이 한 프레임 번쩍이지 않게 합니다.
  useLayoutEffect(() => {
    if (!active || !boxRef.current || !targetRef.current) return
    progress.current = 0
    apply(boxRef.current, frameRef.current, 0, active.quad, targetRef.current)
  }, [active])

  useEffect(() => {
    const el = boxRef.current
    if (!active || !el || !targetRef.current) return

    if (phase === 'opening') {
      const quad = active.quad
      const ctrl = animate(progress.current, 1, {
        ...morph(),
        onUpdate: (p) => {
          progress.current = p
          apply(el, frameRef.current, p, quad, targetRef.current)
        },
        onComplete: setOpen,
      })
      return () => ctrl.stop()
    }

    if (phase === 'closing') {
      // 열림의 역재생: 클릭 당시 카드가 떠 있던 높이(active.z)의 자리로 되돌아갑니다.
      // (창이 뜬 뒤 호버가 풀려 카드가 내려갔더라도 그 높이로 다시 계산)
      const quad = active.getQuad ? active.getQuad(active.z) : active.quad
      const ctrl = animate(progress.current, 0, {
        ...morph(),
        delay: CHROME_OUT, // 글자가 먼저 사라진 뒤 접힘 시작
        onUpdate: (p) => {
          progress.current = p
          apply(el, frameRef.current, p, quad, targetRef.current)
        },
        onComplete: () => {
          progress.current = 0
          finishClose()
        },
      })
      return () => ctrl.stop()
    }
  }, [active, phase, setOpen, finishClose])

  if (!active || !target) return null

  const isOpen = phase === 'open'
  const { project, index, total } = active

  // body 바로 아래에 렌더링해서 상하단 그라디언트 오버레이(.Overlay)보다 항상 앞에 오도록 합니다.
  return createPortal(
    <>
      <motion.div
        className="ProjectWindow__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'closing' ? 0 : 1 }}
        // 열릴 때는 처음 BACKDROP 초 동안 나타나고, 닫힐 때는 접힘이 끝나는 마지막 BACKDROP 초 동안 사라짐
        transition={
          phase === 'closing'
            ? { duration: BACKDROP, delay: Math.max(0, CHROME_OUT + morph().duration - BACKDROP) }
            : { duration: BACKDROP }
        }
        onClick={close}
      />

      <div
        ref={boxRef}
        className={`ProjectWindow${SHOW_TEXT ? '' : ' ProjectWindow--icons'}${hasPage ? ' ProjectWindow--page' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        style={{ left: target.x, top: target.y, width: target.width, height: target.height }}
      >
        <div className="ProjectWindow__media">
          {/* 페이지가 다 떠오르면 스크린샷은 숨김: 페이지 번호가 뚫린 구멍이라, 스크롤하면 그 구멍으로
              아래 스크린샷의 번호가 비쳐 잔상처럼 보이기 때문. 닫힐 때는 바로 다시 보여 페이지와 교차됩니다. */}
          <motion.img
            src={project.image}
            alt={project.title}
            draggable={false}
            initial={false}
            animate={{ opacity: isOpen && pageReady ? 0 : 1 }}
            transition={isOpen && pageReady ? { duration: 0, delay: CHROME_IN } : { duration: 0 }}
          />
          {/* 펴지는 동안 미리 불러 두고, 다 펴진 뒤에 스크린샷 위로 페이드인. 닫힐 때는 글자와 같이 먼저 사라져
              스크린샷이 카드로 접혀 돌아갑니다. */}
          {hasPage && (
            <motion.iframe
              ref={pageRef}
              className="ProjectWindow__page"
              // instant: 첫 화면은 등장 애니메이션 없이 스크린샷과 같은 상태로 시작
              src={`${project.page}?instant`}
              title={project.title}
              onLoad={() => setPageReady(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: isOpen && pageReady ? 1 : 0 }}
              transition={{ duration: isOpen ? CHROME_IN : CHROME_OUT, ease: [0.65, 0, 0.35, 1] }}
              style={{
                width: PAGE_W,
                height: PAGE_H,
                scale: target.width / PAGE_W,
                transformOrigin: '0 0',
                pointerEvents: isOpen ? 'auto' : 'none',
              }}
            />
          )}
        </div>
        {/* 카드와 같은 테두리. 이미지 위에 그려야 해서 별도 레이어 (box-shadow inset 은 자식 아래에 깔림) */}
        <div ref={frameRef} className="ProjectWindow__frame" aria-hidden="true" />

        <motion.div
          className="ProjectWindow__chrome"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 12 }}
          transition={
            isOpen
              ? { duration: CHROME_IN, ease: [0.65, 0, 0.35, 1] }
              : { duration: CHROME_OUT, ease: [0.65, 0, 0.35, 1] }
          }
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          <header className="ProjectWindow__head">
            <div className="ProjectWindow__heading">
              {SHOW_TEXT && (
                <p className="ProjectWindow__eyebrow">
                  {pad(index + 1)} / {pad(total)}
                </p>
              )}
              {SHOW_TEXT && <h2 className="ProjectWindow__title">{project.title}</h2>}
            </div>
            <PillButton
              label={SHOW_TEXT ? 'Close' : '\u00d7'}
              title="Close"
              href="#"
              playSound={playSound}
              onClick={(e) => {
                e.preventDefault()
                close()
              }}
            />
          </header>

          <footer className="ProjectWindow__foot">
            <p className="ProjectWindow__meta">
              {SHOW_TEXT ? project.description || 'Click outside or press ESC to close' : ''}
            </p>
            {project.link && (
              <PillButton
                label={SHOW_TEXT ? 'Visit project' : '\u2197'}
                title="Visit project"
                href={project.link}
                playSound={playSound}
                onClick={(e) => {
                  e.preventDefault()
                  startTransition()
                  router.push(project.link)
                }}
              />
            )}
          </footer>
        </motion.div>
      </div>
    </>,
    document.body,
  )
}
