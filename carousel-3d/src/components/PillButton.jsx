import { motion } from 'framer-motion'

// 원본 Link(primary) 의 두 겹 텍스트 롤오버
const transition = { duration: 0.45, ease: [0.68, -0.6, 0.32, 1.6] }
const textOut = { initial: { y: 0 }, hovered: { y: '-150%' } }
const textIn = { initial: { y: '105%' }, hovered: { y: '0%' } }

export default function PillButton({ label, href, onClick, playSound, title }) {
  return (
    <motion.div className="PillButton" whileHover="hovered" initial="initial" onMouseEnter={playSound}>
      <a className="PillButton__link" href={href} onClick={onClick} title={title || label} aria-label={title || label}>
        <span className="PillButton__label">
          <span className="PillButton__mask">
            <motion.span className="PillButton__text" variants={textOut} transition={transition}>
              {label}
            </motion.span>
            <motion.span
              className="PillButton__text PillButton__text--clone"
              variants={textIn}
              transition={transition}
            >
              {label}
            </motion.span>
          </span>
        </span>
      </a>
    </motion.div>
  )
}
