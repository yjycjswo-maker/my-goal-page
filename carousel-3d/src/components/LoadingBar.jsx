import { useEffect } from 'react'
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'

// 원본의 L 컴포넌트: useProgress 값을 spring 으로 따라가는 2px 진행 바
export default function LoadingBar({ progress }) {
  const spring = useSpring(0, { stiffness: 1000, damping: 100, mass: 1 })

  useEffect(() => {
    spring.set(progress)
  }, [progress, spring])

  const scaleX = useTransform(spring, [0, 100], [0, 1])

  return (
    <AnimatePresence>
      {progress > 0 && progress < 100 && (
        <motion.div
          className="LoadingBar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="LoadingBar__track">
            <motion.div className="LoadingBar__fill" style={{ scaleX }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
