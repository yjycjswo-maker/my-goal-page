import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { animate, useMotionValue } from 'framer-motion'
import * as THREE from 'three'
import ProjectCard from './ProjectCard.jsx'
import { START_OFFSET } from '../config.js'
import { useDetailStore } from '../store/detail.js'
import { useIntroStore } from '../store/intro.js'
import { prefersReducedMotion } from '../lib/motion.js'

// 원본 상수 그대로
const SPACING = 0.5338157894736841 // 한 칸(카드 한 장)에 해당하는 스크롤 거리
const SCROLL_FACTOR = 5e-4 // virtual-scroll 픽셀 → 3D 단위
const LERP = 0.1 // 관성 비율
const toX = (position) => position / 1.9 // 슬롯 인덱스 → 월드 X

const lerp = (a, b, t) => a + (b - a) * t

// 모든 카드가 공유하는 지오메트리/머티리얼 (원본도 모듈 스코프에서 한 번만 생성)
const textureGeometry = new THREE.BoxGeometry(1, 1, 0.0075)
// 원본은 카드 폭의 1.64배짜리 넓은 히트 영역을 썼지만, 카드 밖(옆 빈 공간, 뒤 카드 위)에서도 활성화되어
// 보이는 카드와 같은 크기로 바꿨습니다. 호버 중 확장은 ProjectCard 가 scale 로 처리합니다.
const eventsGeometry = new THREE.BoxGeometry(1, 1, 0.0075)
const eventsMaterial = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 })

// 원본의 E 컴포넌트: 무한 고리 + useFrame lerp
export default function Carousel({ scroll, data, playSound, isMobile, setIsWebglLoaded }) {
  const hasStarted = useRef(false)
  const outerRef = useRef(null) // 인트로 슬라이드용
  const innerRef = useRef(null) // 스크롤 이동용
  const current = useRef(0) // lerp 된 현재 위치
  const lastSnap = useRef(0) // 마지막으로 고리를 회전시킨 위치
  const introX = useMotionValue(0)
  const entered = useIntroStore((s) => s.entered)
  const [texturesLoaded, setTexturesLoaded] = useState(false)

  const projects = useMemo(
    () =>
      (data?.overviewItems ?? []).map((item) => ({
        image: item.image,
        link: item.link,
        title: item.title,
        description: item.description,
        page: item.page, // 있으면 상세 창 안에 이 HTML 페이지가 열립니다 (ProjectWindow)
      })),
    [data],
  )

  // slots: { position, projectIndex, id } — position 은 슬롯 자리, projectIndex 는 어떤 이미지를 보여줄지
  const slots = useRef([])
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (projects.length === 0) return
    slots.current = Array.from({ length: projects.length }, (_, i) => ({
      position: i,
      projectIndex: i,
      id: i,
    }))
    forceRender((n) => n + 1)
  }, [projects.length])

  // 인트로 종료 위치: 1번 카드(slot 0)가 원점보다 START_OFFSET 칸 앞에 오도록
  const endX = -toX(START_OFFSET)
  // 인트로 시작 위치는 원본과 같은 x: 6 (카드가 첫 프레임부터 보이며 슬라이드 인)
  const startX = 6

  // 마지막 카드 텍스처가 로드되면 표시만 해 두고
  const onLastTextureLoaded = useCallback(() => {
    setTexturesLoaded(true)
    setIsWebglLoaded(true)
  }, [setIsWebglLoaded])

  // 시작 화면에서 Enter 를 누른 뒤(entered) 2초 동안 슬라이드 인
  useEffect(() => {
    if (!texturesLoaded || !entered || hasStarted.current) return
    hasStarted.current = true
    introX.set(startX)
    animate(introX, endX, {
      duration: prefersReducedMotion() ? 0.3 : 2, // 동작 줄이기: 긴 슬라이드 인 대신 짧게
      delay: 0.2,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => {
        if (outerRef.current) outerRef.current.position.x = v
      },
    })
  }, [texturesLoaded, entered, introX, startX, endX])

  useFrame(() => {
    // 상세 창이 열려 있으면 목표를 현재 위치로 맞춰 관성을 없애고 그 자리에 고정
    if (useDetailStore.getState().active) scroll.current = -current.current / SCROLL_FACTOR

    current.current = lerp(current.current, -(SCROLL_FACTOR * scroll.current), LERP)

    const delta = current.current - lastSnap.current
    const steps = Math.floor(Math.abs(delta) / SPACING)

    if (steps > 0 && projects.length > 0 && slots.current.length > 0) {
      const dir = delta > 0 ? 1 : -1
      let changed = false

      for (let i = 0; i < steps; i++) {
        const arr = slots.current
        if (dir > 0) {
          // 오른쪽으로 이동: 맨 끝 슬롯을 맨 앞으로
          const last = arr.pop()
          const first = arr[0]
          const idx = (first.projectIndex - 1 + projects.length) % projects.length
          arr.unshift({ ...last, position: first.position - 1, projectIndex: idx })
        } else {
          // 왼쪽으로 이동: 맨 앞 슬롯을 맨 끝으로
          const first = arr.shift()
          const last = arr[arr.length - 1]
          const idx = (last.projectIndex + 1) % projects.length
          arr.push({ ...first, position: last.position + 1, projectIndex: idx })
        }
        changed = true
      }

      if (changed) forceRender((n) => n + 1)
      lastSnap.current = current.current - (delta % SPACING)
    }

    if (innerRef.current) innerRef.current.position.x = current.current
  })

  return (
    <group ref={outerRef} position-x={startX} position-y={isMobile ? 0.1 : 0}>
      <group ref={innerRef}>
        {projects.length > 0 &&
          slots.current.map((slot, i) => (
            <ProjectCard
              key={slot.id}
              slotId={slot.id}
              position={slot.position}
              x={toX(slot.position)}
              project={projects[slot.projectIndex]}
              index={slot.projectIndex}
              total={projects.length}
              textureGeometry={textureGeometry}
              eventsGeometry={eventsGeometry}
              eventsMaterial={eventsMaterial}
              playSound={playSound}
              isMobile={isMobile}
              isLast={i === slots.current.length - 1}
              onLastTextureLoaded={onLastTextureLoaded}
            />
          ))}
      </group>
    </group>
  )
}
