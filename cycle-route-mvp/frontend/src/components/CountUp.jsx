import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

const formatValue = (value, decimals) => value.toFixed(decimals).replace('.', ',')

/**
 * A number that runs up to its value once it is on screen (remount it with a
 * new `key` to replay, e.g. for a newly computed route).
 */
function CountUp({ to, decimals = 0, duration = 1.1, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  const target = Number(to) || 0
  const [value, setValue] = useState(reduceMotion ? target : 0)

  useEffect(() => {
    if (!inView || reduceMotion) return undefined
    const controls = animate(0, target, {
      duration,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: setValue,
    })
    return () => controls.stop()
  }, [inView, reduceMotion, target, duration])

  return (
    <span ref={ref} className={`tabular-nums ${className || ''}`}>
      {formatValue(reduceMotion ? target : value, decimals)}
    </span>
  )
}

export default CountUp
