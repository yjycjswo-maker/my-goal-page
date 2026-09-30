import { useEffect, useRef } from 'react'

// 원본 useSound: Audio 객체를 lazy 생성하고 매번 currentTime 을 0으로 되감아 재생
export function useSound(src, { volume = 1, playbackRate = 1 } = {}) {
  const audioRef = useRef(null)

  useEffect(() => {
    audioRef.current = null
  }, [src])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.playbackRate = playbackRate
    }
  }, [volume, playbackRate])

  const play = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
      audioRef.current.volume = volume
      audioRef.current.playbackRate = playbackRate
    }
    try {
      audioRef.current.currentTime = 0
      const p = audioRef.current.play()
      if (p && p.catch) p.catch(() => {}) // 사용자 제스처 전 autoplay 차단은 무시
    } catch {
      /* noop */
    }
  }

  return [play]
}
