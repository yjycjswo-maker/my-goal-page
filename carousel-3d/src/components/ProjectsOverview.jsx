import { useState } from 'react'
import { motion } from 'framer-motion'
import Scene from './Scene.jsx'
import PillButton from './PillButton.jsx'
import ProjectWindow from './ProjectWindow.jsx'
import IntroBadge from './IntroBadge.jsx'
import CardKeys from './CardKeys.jsx'
import { useTransitionStore } from '../store/transition.js'
import { useWindowSize } from '../hooks/useWindowSize.js'
import { useSound } from '../hooks/useSound.js'
import { usePageTransition } from '../hooks/usePageTransition.js'
import { SHOW_TEXT } from '../config.js'

const barVariants = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 100 },
}

// 원본의 ProjectsOverview (W): 100svh 스테이지 + 우하단 "Overview / Index" 바
export default function ProjectsOverview({ data }) {
  const [, setIsWebglLoaded] = useState(false)
  const isTransitioning = useTransitionStore((s) => s.isTransitioning)
  const startTransition = useTransitionStore((s) => s.startTransition)
  const { width } = useWindowSize()
  const [playSound] = useSound('/sounds/click.wav', { volume: 0.8, playbackRate: 1 })
  const router = usePageTransition()

  return (
    <section className="ProjectsOverview">
      <div className="ProjectsOverview__stage">
        <Scene
          data={data}
          playSound={playSound}
          isMobile={width < 1024}
          setIsWebglLoaded={setIsWebglLoaded}
        />

        {/* 시작 화면(오렌지 인트로 + Enter) → Enter 후 좌상단 로고 (클릭하면 다시 재생) */}
        <IntroBadge playSound={playSound} />

        {/* 키보드로 카드 열기 (보이지 않는 버튼 목록, 포커스되면 이름표가 보임) */}
        <CardKeys items={data.overviewItems} />

        {SHOW_TEXT && (
        <motion.div
          className="ProjectsOverview__bar"
          initial="hidden"
          variants={barVariants}
          animate={isTransitioning ? 'hidden' : 'visible'}
        >
          <p className="ProjectsOverview__label">{data.overviewLabel}</p>
          <PillButton
            label={data.listButton.label}
            href={data.listButton.href}
            playSound={playSound}
            onClick={(e) => {
              e.preventDefault()
              startTransition()
              router.push(data.listButton.href)
            }}
          />
        </motion.div>
        )}

        {/* 카드 클릭 시 카드 자리에서 커지는 상세 창 (페이지 이동 없음) */}
        <ProjectWindow router={router} playSound={playSound} isMobile={width < 1024} />
      </div>
    </section>
  )
}
