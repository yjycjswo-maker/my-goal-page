import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useAspect, useTexture } from '@react-three/drei'
import { animate, useMotionValue } from 'framer-motion'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders.js'
import { CARD_ASPECT, CARD_RADIUS, CARD_BORDER, FRONT_SHIFT, SHOW_TEXT } from '../config.js'
import { useCursorStore } from '../store/cursor.js'
import { useDetailStore } from '../store/detail.js'
import { useRaiseStore } from '../store/raise.js'
import { cardOpeners } from '../store/cardOpeners.js'
import { prefersReducedMotion } from '../lib/motion.js'

// 카드 로컬 좌표의 네 모서리 (BoxGeometry(1,1) 기준). 화면에서 좌상 → 우상 → 우하 → 좌하 순서.
const CORNERS = [
  [-0.5, 0.5],
  [0.5, 0.5],
  [0.5, -0.5],
  [-0.5, -0.5],
]
const scratch = new THREE.Vector3()
const POP_Z = 0.65 // 호버 시 카드가 튀어나가는 최소 거리 (원본 값)
// 앞 카드(FRONT_SHIFT 0 이라 비켜나지 않음)와 겹치지 않도록, 카드 폭의 이 비율만큼 옆으로 완전히 빠져나옵니다
const POP_CLEAR = 1.08

// 호버 모션(pop + 앞 카드 비켜나기)은 화면 폭이 아니라 마우스가 있는지로 켭니다.
// 폭(isMobile = 1024 미만)으로 막으면 좁은 데스크톱 창에서도 호버가 사라집니다. 터치 기기에서는 꺼짐.
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

// '#rrggbb' → vec3 (0..1). 이 머티리얼은 색 관리 변환 없이 텍스처 값을 그대로 출력하므로
// THREE.Color 대신 sRGB 값을 그대로 넘겨 텍스처 색과 같은 공간에 둡니다.
const hexToVec3 = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}
const borderColor = hexToVec3(CARD_BORDER.color)

// 원본의 g 컴포넌트: 보이는 메시 + 넓은 투명 히트 메시
export default function ProjectCard({
  x,
  slotId,
  position,
  project,
  index,
  total,
  textureGeometry,
  eventsGeometry,
  eventsMaterial,
  playSound,
  isMobile,
  isLast,
  onLastTextureLoaded,
}) {
  const { camera, gl } = useThree()
  // 이 카드의 상세 창이 떠 있는 동안(닫히는 중 포함) 3D 카드는 숨기고 DOM 창이 그 자리를 대신합니다.
  const hidden = useDetailStore((s) => s.active?.slotId === slotId)
  // 튀어나온 카드(호버 중이거나 상세 창이 열린 카드)보다 앞에 쌓여 있으면 옆으로 비켜납니다.
  const inFrontOfHovered = useRaiseStore((s) => s.hovered !== null && position < s.hovered)
  const inFrontOfActive = useDetailStore((s) => s.active != null && position < s.active.position)
  const inFront = inFrontOfHovered || inFrontOfActive
  const meshRef = useRef(null)
  const hitRef = useRef(null)
  const z = useMotionValue(0) // pop 높이
  const shift = useMotionValue(0) // 비켜난 거리 (앞 카드일 때 -FRONT_SHIFT)
  const notified = useRef(false)
  const hovering = useRef(false) // 포인터가 이 카드 위에 있는지
  const enterZ = useRef(0) // 포인터가 들어온 순간 카드가 있던 z (pop + 비켜남)
  const openZ = useRef(0) // 창을 열었을 때 카드가 떠 있던 높이 (호버 pop)

  const texture = useTexture(project.image, () => {
    if (isLast && onLastTextureLoaded && !notified.current) {
      notified.current = true
      onLastTextureLoaded()
    }
  })

  // 모든 카드를 CARD_ASPECT 비율로 통일, 모바일 0.255 / 데스크톱 0.275 배율
  const scale = useAspect(CARD_ASPECT, 1, isMobile ? 0.255 : 0.275)
  const popZ = Math.max(POP_Z, scale[0] * POP_CLEAR) // 호버 시 튀어나가는 거리
  const imageAspect = texture.image.width / texture.image.height
  const uniforms = useRef({
    uTexture: { value: texture },
    uImageAspect: { value: imageAspect },
    uCardAspect: { value: CARD_ASPECT },
    uRadius: { value: CARD_RADIUS },
    uBorderWidth: { value: CARD_BORDER.width },
    uBorderColor: { value: borderColor },
    uBorderAlpha: { value: CARD_BORDER.alpha ?? 1 },
  })

  // 슬롯 재배치로 텍스처가 바뀌어도 유니폼이 따라가도록 동기화
  useEffect(() => {
    uniforms.current.uTexture.value = texture
    uniforms.current.uImageAspect.value = imageAspect
  }, [texture, imageAspect])

  // 보이는 메시 z = pop 높이 + 비켜난 거리.
  // 히트 메시는 평소엔 보이는 카드와 정확히 같은 자리·크기라 카드 밖에서는 활성화되지 않습니다.
  // 호버 중에는 "들어온 순간의 자리 ~ 튀어나간 자리" 를 모두 덮도록 늘려서,
  // 카드가 움직이는 동안 포인터가 잠깐 벗어나 enter/leave 가 반복되는 떨림을 막습니다.
  const applyZ = () => {
    const s = shift.get()
    if (meshRef.current) meshRef.current.position.z = z.get() + s
    const hit = hitRef.current
    if (!hit) return
    if (hovering.current) {
      const lo = Math.min(enterZ.current, popZ)
      const hi = Math.max(enterZ.current, popZ)
      hit.position.z = (lo + hi) / 2
      hit.scale.x = scale[0] + (hi - lo)
    } else {
      hit.position.z = z.get() + s
      hit.scale.x = scale[0]
    }
  }

  // 동작 줄이기: 튀어나오는 자리는 같게 두고(어느 카드인지 알 수 있도록) 이동 시간만 짧게
  const popIn = () => {
    animate(z, popZ, { duration: prefersReducedMotion() ? 0.15 : 0.5, ease: [0.83, 0, 0.17, 1], onUpdate: applyZ })
  }

  const popOut = () => {
    animate(z, 0, { duration: prefersReducedMotion() ? 0.1 : 0.35, ease: [0.65, 0, 0.35, 1], onUpdate: applyZ })
  }

  useEffect(() => {
    applyZ()
  }, [scale]) // eslint-disable-line react-hooks/exhaustive-deps

  // 앞 카드 비켜나기 / 되돌아오기 (pop 과 같은 타이밍)
  useEffect(() => {
    const ctrl = inFront
      ? animate(shift, -FRONT_SHIFT, { duration: 0.5, ease: [0.83, 0, 0.17, 1], onUpdate: applyZ })
      : animate(shift, 0, { duration: 0.35, ease: [0.65, 0, 0.35, 1], onUpdate: applyZ })
    return () => ctrl.stop()
  }, [inFront]) // eslint-disable-line react-hooks/exhaustive-deps

  // 보이는 카드의 네 꼭짓점을 화면 px 로 투영 (좌상 → 우상 → 우하 → 좌하).
  // DOM 창이 이 원근 사각형에서 시작해 펴지므로 카드가 끊김 없이 창으로 이어집니다.
  // atZ 를 주면 카드를 그 높이에 둔 것으로 계산합니다 (닫힐 때 클릭 당시 높이로 되돌아가기 위해).
  const screenQuad = (atZ) => {
    const mesh = meshRef.current
    const prevZ = mesh.position.z
    if (atZ !== undefined) mesh.position.z = atZ
    mesh.updateWorldMatrix(true, false)
    const bounds = gl.domElement.getBoundingClientRect()
    const quad = CORNERS.map(([lx, ly]) => {
      scratch.set(lx, ly, 0).applyMatrix4(mesh.matrixWorld).project(camera)
      return [bounds.left + ((scratch.x + 1) / 2) * bounds.width, bounds.top + ((1 - scratch.y) / 2) * bounds.height]
    })
    if (atZ !== undefined) {
      mesh.position.z = prevZ
      mesh.updateWorldMatrix(true, false)
    }
    return quad
  }

  // 창이 접혀 카드로 돌아온 직후(hidden true → false):
  // 클릭 당시 떠 있던 높이에서 이어받고, 포인터가 위에 없으면 호버 해제처럼 내려갑니다.
  const wasHidden = useRef(false)
  useEffect(() => {
    if (hidden) {
      wasHidden.current = true
      return
    }
    if (!wasHidden.current) return
    wasHidden.current = false
    z.set(openZ.current)
    applyZ()
    if (!hovering.current) popOut()
  }, [hidden]) // eslint-disable-line react-hooks/exhaustive-deps

  // 이 카드 자리에서 그대로 펴지는 창을 엽니다 (클릭 / 키보드 Enter 공통)
  const openWindow = () => {
    if (useDetailStore.getState().active || !meshRef.current) return
    openZ.current = z.get()
    useDetailStore.getState().open({
      id: Date.now(),
      slotId,
      position,
      project,
      index,
      total,
      z: openZ.current,
      quad: screenQuad(),
      getQuad: screenQuad,
    })
  }

  // 키보드 포커스로 띄우기 / 내리기 (마우스 호버와 같은 모양)
  const hoverByKey = (on) => {
    if (on) {
      useRaiseStore.getState().raise(position)
      popIn()
    } else {
      useRaiseStore.getState().lower(position)
      if (!hovering.current && !useDetailStore.getState().active) popOut()
    }
  }

  // 매 렌더마다 최신 함수로 등록 (슬롯 재배치로 position/index 가 바뀌어도 따라감)
  cardOpeners.set(slotId, { index, position, open: openWindow, hover: hoverByKey })
  useEffect(() => () => cardOpeners.delete(slotId), [slotId])

  return (
    <group>
      {/* 보이는 카드 */}
      <mesh
        ref={meshRef}
        position={[x - 0.01, 0, 0]}
        rotation-y={-Math.PI / 2}
        scale={scale}
        geometry={textureGeometry}
        visible={!hidden}
      >
        <shaderMaterial
          key={vertexShader + fragmentShader}
          transparent
          depthWrite={false}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms.current}
        />
      </mesh>

      {/* 포인터 이벤트만 받는 히트 영역. 평소엔 보이는 카드와 같은 자리·크기 (applyZ 참고) */}
      <mesh
        ref={hitRef}
        position={[x, 0, 0]}
        rotation-y={-Math.PI / 2}
        scale={scale}
        visible={false}
        geometry={eventsGeometry}
        material={eventsMaterial}
        onClick={(e) => {
          e.stopPropagation()
          // 페이지 이동 대신, 이 카드 자리에서 그대로 펴지는 창을 엽니다.
          openWindow()
        }}
        onPointerEnter={(e) => {
          if (!canHover()) return
          e.stopPropagation()
          hovering.current = true
          enterZ.current = z.get() + shift.get()
          applyZ()
          useRaiseStore.getState().raise(position)
          document.body.style.cursor = 'pointer'
          if (SHOW_TEXT) useCursorStore.getState().setText(project.title || '')
          playSound()
          popIn()
        }}
        onPointerLeave={(e) => {
          if (!canHover()) return
          e.stopPropagation()
          hovering.current = false
          applyZ()
          useRaiseStore.getState().lower(position)
          document.body.style.cursor = 'default'
          useCursorStore.getState().removeText()
          popOut()
        }}
      />
    </group>
  )
}
