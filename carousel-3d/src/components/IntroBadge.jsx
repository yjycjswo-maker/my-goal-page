import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import { useProgress } from '@react-three/drei'
import { useTransitionStore } from '../store/transition.js'
import { useIntroStore } from '../store/intro.js'
import '../lib/orange-intro/orange-intro.css'
import '../lib/orange-intro/orange-intro.js' // window.OrangeIntro 를 등록합니다

const MOTION_DONE = 2.4 // 로고와 글자가 자리 잡는 시점(초). 이 뒤부터 로고를 눌러 들어갈 수 있습니다
const FLY_EASE = [0.76, 0, 0.24, 1]

// 시작 화면 → 좌상단 로고.
// 1) 사이트를 열면 검은 화면 가운데서 오렌지 인트로(점 → 방사형 마크 → ✱ CLAUDE)가 재생됩니다.
// 2) 모션이 끝나면 가운데 로고(✱ CLAUDE)를 누를 수 있습니다. 올리면 글자 폭 파도가 지나가고, 누르면 들어갑니다.
//    카드 텍스처가 아직 로딩 중이면 로고 아래에 진행 바가 보이고, 로딩이 끝나는 대로 들어갑니다.
// 3) 들어가면 가운데 로고가 좌상단 자리로 줄어들며 날아가고, 검은 막이 걷히며 캐러셀이 슬라이드 인합니다.
//    같은 요소를 transform 으로 줄이므로 로고가 끊기지 않고 이어집니다.
// 4) 이후에는 좌상단 로고로 남고, 클릭하면 그 자리에서 인트로를 다시 재생합니다.
export default function IntroBadge({ playSound }) {
  const stageRef = useRef(null)
  const ghostRef = useRef(null) // 좌상단 자리(.IntroBadge)를 재기 위한 보이지 않는 상자
  const introRef = useRef(null)
  const entering = useRef(false)
  const [phase, setPhase] = useState('splash') // 'splash' | 'entering' | 'badge'
  const [motionDone, setMotionDone] = useState(false)
  const [wantEnter, setWantEnter] = useState(false)
  const [hit, setHit] = useState(null) // 가운데 로고 위의 클릭 영역 (px)
  const isTransitioning = useTransitionStore((s) => s.isTransitioning)
  const enter = useIntroStore((s) => s.enter)
  const { progress } = useProgress()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  // 텍스처 로딩이 끝나면(isTransitioning=false) 들어갈 수 있습니다
  const canEnter = motionDone && !isTransitioning

  useEffect(() => {
    let raf = 0
    let resizeRaf = 0
    const intro = new window.OrangeIntro(stageRef.current, {
      background: false,
      logo: true,
      subtitle: '', // 부제(motion designer) 없음
      hud: false, // 모서리 브래킷 없음
      rule: false, // 로고 위 얇은 선 없음
      colors: { title: '#FFFFFF', sub: '#FFFFFF' },
    })
    introRef.current = intro
    // 벽시계가 아니라 인트로 자신의 시간으로 판단합니다 (느린 기기에서도 모션이 끝난 뒤에 누를 수 있도록)
    const watch = () => {
      if (intro.t >= MOTION_DONE) {
        setHit(intro.lockupRect())
        setMotionDone(true)
      } else raf = requestAnimationFrame(watch)
    }
    raf = requestAnimationFrame(watch)
    // 창 크기가 바뀌면 인트로가 다시 배치된 다음 프레임에 클릭 영역을 맞춥니다
    const onResize = () => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => setHit(intro.lockupRect()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('resize', onResize)
      intro.destroy()
    }
  }, [])

  // 로고를 눌렀고(wantEnter) 로딩도 끝났으면(canEnter) 들어갑니다
  useEffect(() => {
    if (!wantEnter || !canEnter || entering.current) return
    entering.current = true
    // 전체 화면 가운데의 로고가 좌상단 자리의 로고와 정확히 겹치도록: 폭 비율로 줄이고 가운데끼리 맞춥니다
    const target = ghostRef.current.getBoundingClientRect()
    const s = target.width / window.innerWidth
    const tx = target.left
    const ty = target.top + target.height / 2 - (s * window.innerHeight) / 2
    setPhase('entering')
    enter()
    animate(0, 1, {
      duration: 1.1,
      ease: FLY_EASE,
      onUpdate: (v) => {
        x.set(tx * v)
        y.set(ty * v)
        scale.set(1 + (s - 1) * v)
      },
      onComplete: () => setPhase('badge'),
    })
  }, [wantEnter, canEnter, enter, x, y, scale])

  // 좌상단 자리로 바꾸는 순간 transform 을 되돌립니다 (페인트 전에 처리해 깜빡임 없음)
  useLayoutEffect(() => {
    if (phase !== 'badge') return
    x.set(0)
    y.set(0)
    scale.set(1)
  }, [phase, x, y, scale])

  // 키보드 Enter 로도 들어갈 수 있습니다
  useEffect(() => {
    if (phase !== 'splash' || !motionDone) return
    const onKey = (e) => {
      if (e.key === 'Enter') setWantEnter(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, motionDone])

  return (
    <>
      {phase !== 'badge' && (
        <motion.div
          className="IntroBadge__backdrop"
          initial={false}
          animate={{ opacity: phase === 'entering' ? 0 : 1 }}
          transition={{ duration: 0.9, ease: FLY_EASE }}
        />
      )}

      <motion.div
        className={phase === 'badge' ? 'IntroBadge' : 'IntroBadge IntroBadge--splash'}
        initial={false}
        animate={{ opacity: phase === 'badge' && isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          ref={stageRef}
          className="IntroBadge__stage"
          style={{ x, y, scale, transformOrigin: '0 0' }}
          onClick={() => phase === 'badge' && introRef.current?.replay()}
        />
        {phase === 'splash' && motionDone && hit && (
          <button
            type="button"
            className="IntroBadge__hit"
            style={{ left: hit.x, top: hit.y, width: hit.width, height: hit.height }}
            aria-label="메인 페이지로 들어가기"
            onMouseEnter={() => {
              playSound?.()
              introRef.current?.wave()
            }}
            onClick={() => setWantEnter(true)}
          />
        )}
      </motion.div>

      {/* 모션은 끝났는데 카드 텍스처가 아직 로딩 중일 때만 로고 아래에 진행 바 */}
      {phase === 'splash' && (
        <div className="IntroBadge__enter">
          <AnimatePresence>
            {motionDone && !canEnter && (
              <motion.div
                key="progress"
                className="IntroBadge__progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div className="IntroBadge__progressFill" style={{ scaleX: progress / 100 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div ref={ghostRef} className="IntroBadge IntroBadge--ghost" aria-hidden="true" />
    </>
  )
}
