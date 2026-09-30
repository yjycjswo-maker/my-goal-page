import { useEffect, useRef } from 'react'
import { useCursorStore } from '../store/cursor.js'
import { prefersReducedMotion } from '../lib/motion.js'

// 원본은 Cuberto mouse-follower(skewing 1.4) 를 씁니다.
// 같은 동작(따라오는 점 + 호버 시 프로젝트 제목 표시 + 속도 기반 늘어남)을 가볍게 재현했습니다.
export default function Cursor() {
  const text = useCursorStore((s) => s.text)
  const ref = useRef(null)
  const trailRef = useRef(null) // 링 뒤로 남는 꼬리 선

  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover)').matches) return

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let x = tx
    let y = ty
    let raf = 0
    let visible = false

    // 꼬리: 링이 지나간 자리를 짧게 기억해 두고, 오래된 점일수록 가늘고 옅게 그립니다
    const TRAIL_LIFE = 380 // ms, 꼬리 길이(시간)
    const TRAIL_W = 1.6 // px, 링 쪽 끝 굵기
    const color = getComputedStyle(el).getPropertyValue('--claude').trim() || '#f95933'
    const canvas = trailRef.current
    const ctx = canvas.getContext('2d')
    const points = []
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const drawTrail = (now) => {
      while (points.length && now - points[0].t > TRAIL_LIFE) points.shift()
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      // 동작 줄이기: 따라다니는 꼬리는 그리지 않음 (기본 마우스 커서는 그대로 보임)
      if (!visible || points.length < 3 || prefersReducedMotion()) return
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      // 이웃 점의 중점을 잇는 2차 곡선으로 매끄럽게
      for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1], b = points[i], c = points[i + 1]
        const k = 1 - (now - b.t) / TRAIL_LIFE // 1(새것) → 0(오래됨)
        ctx.globalAlpha = k
        ctx.lineWidth = Math.max(0.3, TRAIL_W * k)
        ctx.beginPath()
        ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2)
        ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const onMove = (e) => {
      tx = e.clientX
      ty = e.clientY
      if (!visible) {
        visible = true
        el.classList.add('is-visible')
      }
    }
    const onOut = (e) => {
      if (e.relatedTarget === null) {
        visible = false
        el.classList.remove('is-visible')
      }
    }
    const loop = () => {
      const vx = tx - x
      const vy = ty - y
      x += vx * 0.2
      y += vy * 0.2
      const speed = Math.min(Math.hypot(vx, vy) / 150, 1)
      const stretch = speed * 0.35 // skewing
      const angle = (Math.atan2(vy, vx) * 180) / Math.PI
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      const now = performance.now()
      const last = points[points.length - 1]
      if (!last || Math.hypot(x - last.x, y - last.y) > 0.5) points.push({ x, y, t: now })
      drawTrail(now)
      el.firstChild.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(${1 + stretch}, ${1 - stretch}) rotate(${-angle}deg)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('resize', resize)
    document.addEventListener('mouseout', onOut)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mouseout', onOut)
    }
  }, [])

  return (
    <>
      <canvas ref={trailRef} className="CursorTrail" aria-hidden="true" />
      <div ref={ref} className={`Cursor${text ? ' is-text' : ''}`} aria-hidden="true">
        <div className="Cursor__inner">
          <span className="Cursor__text">{text}</span>
        </div>
      </div>
    </>
  )
}
