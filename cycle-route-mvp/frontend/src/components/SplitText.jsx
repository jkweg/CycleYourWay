import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, GSAPSplitText)

const SplitText = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete,
  useScrollTrigger = true,
}) => {
  const ref = useRef(null)
  const animationCompletedRef = useRef(false)
  const onCompleteRef = useRef(onLetterAnimationComplete)

  const depsKey = useMemo(() => {
    return JSON.stringify({
      from,
      to,
      delay,
      duration,
      ease,
      splitType,
      threshold,
      rootMargin,
      text,
      textAlign,
      useScrollTrigger,
    })
  }, [delay, duration, ease, from, rootMargin, splitType, threshold, text, textAlign, to, useScrollTrigger])

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete
  }, [onLetterAnimationComplete])

  const [fontsLoaded, setFontsLoaded] = useState(false)
  useEffect(() => {
    const fontsReady = document.fonts?.ready
    if (!fontsReady) {
      // Defer to avoid synchronous setState within the effect.
      Promise.resolve().then(() => setFontsLoaded(true))
      return
    }

    fontsReady.then(() => setFontsLoaded(true))
  }, [])

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return
      // Prevent re-animation if already completed
      if (animationCompletedRef.current) return
      const el = ref.current

      if (el._rbsplitInstance) {
        try {
          el._rbsplitInstance.revert()
        } catch {
          /* noop */
        }
        el._rbsplitInstance = null
      }

      const startPct = (1 - threshold) * 100
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin)
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px'
      const sign = marginValue === 0 ? '' : marginValue < 0 ? `-=${Math.abs(marginValue)}${marginUnit}` : `+=${marginValue}${marginUnit}`
      const start = `top ${startPct}%${sign}`

      let targets
      const assignTargets = (self) => {
        if (splitType.includes('chars') && self.chars.length) targets = self.chars
        if (!targets && splitType.includes('words') && self.words.length) targets = self.words
        if (!targets && splitType.includes('lines') && self.lines.length) targets = self.lines
        if (!targets) targets = self.chars || self.words || self.lines
      }

      // Hide original full text to prevent first-frame flash.
      gsap.set(el, { opacity: 0 })

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
        onSplit: (self) => {
          assignTargets(self)
          gsap.set(el, { opacity: 1 })

          const tweenConfig = {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            onComplete: () => {
              animationCompletedRef.current = true
              onCompleteRef.current?.()
            },
            willChange: 'transform, opacity',
            force3D: true,
          }

          const tween = gsap.fromTo(
            targets,
            { ...from },
            useScrollTrigger
              ? {
                  ...tweenConfig,
                  scrollTrigger: {
                    trigger: el,
                    start,
                    once: true,
                    fastScrollEnd: true,
                    anticipatePin: 0.4,
                  },
                }
              : {
                  ...tweenConfig,
                },
          )
          return tween
        },
      })

      el._rbsplitInstance = splitInstance

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill()
        })
        try {
          splitInstance.revert()
        } catch {
          /* noop */
        }
        el._rbsplitInstance = null
      }
    },
    {
      // useGSAP deps are derived from this key so nested objects don't cause stale values
      dependencies: [depsKey, fontsLoaded, onLetterAnimationComplete],
      scope: ref,
    },
  )

  const renderTag = () => {
    const style = {
      textAlign,
      overflow: 'visible',
      display: 'inline-block',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      willChange: 'transform, opacity',
    }

    const Tag = tag || 'p'
    return (
      <Tag ref={ref} style={style} className={`split-parent ${className}`}>
        {text}
      </Tag>
    )
  }

  return renderTag()
}

export default SplitText

