import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import VirtualScroll from 'virtual-scroll'
import Carousel from './Carousel.jsx'
import LoadingBar from './LoadingBar.jsx'
import { useTransitionStore } from '../store/transition.js'
import { useDetailStore } from '../store/detail.js'
import { useIntroStore } from '../store/intro.js'

// 원본의 C 컴포넌트: virtual-scroll 로 휠/터치/방향키 델타를 받고 R3F Canvas 를 띄웁니다.
export default function Scene({ data, playSound, isMobile, setIsWebglLoaded }) {
  const endTransition = useTransitionStore((s) => s.endTransition)
  const entered = useIntroStore((s) => s.entered)
  const containerRef = useRef(null)
  const scroll = useRef(0)
  const { progress } = useProgress()

  // 텍스처가 100% 로드되면 1초 뒤 UI 등장
  useEffect(() => {
    if (progress !== 100) return
    const t = setTimeout(() => endTransition(), 1000)
    return () => clearTimeout(t)
  }, [progress, endTransition])

  useEffect(() => {
    if (!containerRef.current) return
    const vs = new VirtualScroll({
      el: containerRef.current,
      touchMultiplier: 20,
      keyStep: 810,
    })
    const onScroll = (e) => {
      // 상세 창이 열려 있을 땐 휠/터치/방향키를 무시 (e.y 대신 delta 누적이라 닫힌 뒤 튐이 없음)
      if (useDetailStore.getState().active) return
      scroll.current += e.deltaY
    }
    vs.on(onScroll)
    return () => {
      vs.off(onScroll)
      vs.destroy()
    }
  }, [])

  return (
    <div className="Scene" ref={containerRef}>
      {/* 시작 화면이 떠 있는 동안은 시작 화면이 로딩 진행을 대신 보여 줍니다 (IntroBadge) */}
      {entered && <LoadingBar progress={progress} />}
      <Canvas camera={{ fov: 15, near: 0.1, far: 20, position: [-5.9, 3, 3.4] }}>
        <directionalLight position={[0, 25, 50]} intensity={1} color="white" />
        <ambientLight intensity={1.5} color="white" />
        <Suspense fallback={null}>
          <Carousel
            scroll={scroll}
            data={data}
            playSound={playSound}
            isMobile={isMobile}
            setIsWebglLoaded={setIsWebglLoaded}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
