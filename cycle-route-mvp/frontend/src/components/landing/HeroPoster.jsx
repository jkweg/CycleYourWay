import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { IconArrowBearRight, IconArrowRight, IconRepeat, IconRoute, IconVolume } from '@tabler/icons-react'
import { BikeShapes } from '../brand/BikeGlyph'
import { onIntroDone } from '../../lib/intro'
import PhoneMock from './PhoneMock'
import SpinBadge from './SpinBadge'

// One size drives the whole composition: the lettering shrinks on short screens
// too, the phone sits just under most of the second line, and the hero is
// always tall enough to hold the whole phone (it never runs into the next section).
const HERO_SIZES = {
  '--hero-fs': 'clamp(4.2rem, min(16.4vw, 23svh), 16rem)',
  '--hero-phone-top': 'calc(7rem + var(--hero-fs) * 1.52)',
  '--hero-min-h': 'max(100svh, calc(var(--hero-phone-top) + 250px * 610 / 300 + 3rem))',
}

const LINE_ONE = 'WYBIERZ'
const LINE_TWO = 'PRZEJAZD'

function PosterLine({ text, offset, className }) {
  return (
    <span aria-hidden="true" className={`block whitespace-nowrap ${className}`}>
      {[...text].map((char, index) => (
        <span key={index} className="cyw-letter" style={{ '--i': offset + index }}>
          {char}
        </span>
      ))}
    </span>
  )
}

/**
 * Follows the pointer with a spring (decorative only): each layer moves by its
 * own depth, so the chips float at different distances from the phone.
 */
function useParallaxPointer(enabled) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 70, damping: 18, mass: 0.6 })
  const springY = useSpring(y, { stiffness: 70, damping: 18, mass: 0.6 })

  useEffect(() => {
    if (!enabled) return undefined
    const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
    if (!finePointer) return undefined
    const onMove = (event) => {
      x.set(event.clientX / window.innerWidth - 0.5)
      y.set(event.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled, x, y])

  return { x: springX, y: springY }
}

function Float({ pointer, depth, className, delay, children }) {
  // A full transform string keeps the motion on the compositor.
  const transform = useTransform(
    [pointer.x, pointer.y],
    ([px, py]) => `translate3d(${px * depth}px, ${py * depth}px, 0)`
  )
  return (
    <motion.div style={{ transform }} className={`absolute ${className}`}>
      <div className="cyw-pop" style={{ '--d': `${delay}ms` }}>
        {children}
      </div>
    </motion.div>
  )
}

function HeroPoster({ onStartPlanning }) {
  const sectionRef = useRef(null)
  const [go, setGo] = useState(false)
  const reduceMotion = useReducedMotion()
  const pointer = useParallaxPointer(!reduceMotion)

  useEffect(() => onIntroDone(() => setGo(true)), [])

  // Scrolling away: the two words drift apart and the phone rises a little.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const lineOne = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ['translateX(0%)', 'translateX(0%)'] : ['translateX(0%)', 'translateX(-14%)']
  )
  const lineTwo = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ['translateX(0%)', 'translateX(0%)'] : ['translateX(0%)', 'translateX(12%)']
  )
  const phoneLift = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ['translateY(0px)', 'translateY(0px)'] : ['translateY(0px)', 'translateY(-90px)']
  )

  const scrollToJourney = () =>
    document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-title"
      className={`cyw-grain relative overflow-hidden bg-vanilla ${go ? 'cyw-letters-go' : ''}`}
      style={HERO_SIZES}
    >
      <div className="relative z-[2] mx-auto flex min-h-[100svh] max-w-[1440px] flex-col px-5 pb-8 pt-24 md:px-10 md:pt-28 lg:min-h-[var(--hero-min-h)]">
        <h1
          id="hero-title"
          className="font-display relative z-0 select-none text-center text-[length:var(--hero-fs)] leading-[0.9] text-ink"
        >
          <span className="sr-only">Wybierz przejazd.</span>
          <motion.span style={{ transform: lineOne }} className="block">
            <PosterLine text={LINE_ONE} offset={0} />
          </motion.span>
          <motion.span style={{ transform: lineTwo }} className="block text-burnt-orange">
            <PosterLine text={LINE_TWO} offset={LINE_ONE.length} />
          </motion.span>
        </h1>

        {/* Phone + floating chips, layered over the lettering. */}
        <div className="relative z-10 mx-auto -mt-5 w-[min(54vw,210px)] sm:-mt-[10vw] md:w-[260px] lg:absolute lg:left-1/2 lg:top-[var(--hero-phone-top)] lg:mt-0 lg:w-[250px] lg:-translate-x-1/2">
          <motion.div style={{ transform: phoneLift }} className="relative">
            <div className="cyw-pop" style={{ '--d': '520ms' }}>
              <PhoneMock />
            </div>

            <Float pointer={pointer} depth={34} delay={1020} className="-left-[79%] top-[10%] hidden md:block">
              <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 shadow-[0_24px_50px_rgba(42,26,18,0.2)]">
                <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-burnt-orange text-ink">
                  <IconArrowBearRight size={24} stroke={2.4} aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <strong className="font-serif text-[22px] font-semibold leading-none text-ink">250 m</strong>
                  <span className="mt-1 text-[13px] text-[#6B4E3D]">w prawo · ul. Leśna</span>
                </span>
              </div>
            </Float>

            <Float pointer={pointer} depth={26} delay={1140} className="-right-[88%] top-[3%] hidden md:block">
              <div className="w-[190px] rounded-[20px] bg-white p-4 shadow-[0_24px_50px_rgba(42,26,18,0.18)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B4E3D]">Profil trasy</p>
                <p className="mt-1 font-serif text-[26px] font-semibold leading-none text-ink">↗ 380 m</p>
                <svg aria-hidden="true" className="mt-2 h-10 w-full" viewBox="0 0 160 40" preserveAspectRatio="none">
                  <path
                    d="M0 34 C 14 30 22 18 38 21 S 64 6 80 9 S 108 28 126 20 S 150 4 160 6 L 160 40 L 0 40 Z"
                    fill="rgba(47,111,87,0.16)"
                  />
                  <path
                    d="M0 34 C 14 30 22 18 38 21 S 64 6 80 9 S 108 28 126 20 S 150 4 160 6"
                    fill="none"
                    stroke="#2F6F57"
                    strokeWidth="2.2"
                  />
                </svg>
              </div>
            </Float>

            <Float pointer={pointer} depth={-30} delay={1260} className="-right-[112%] top-[62%] hidden md:block">
              <span className="flex items-center gap-2.5 rounded-full bg-burnt-orange px-5 py-3 text-ink shadow-[0_18px_36px_rgba(224,85,24,0.35)]">
                <IconVolume size={20} stroke={2.2} aria-hidden="true" />
                <span className="text-[15px] font-bold">„Za 250 metrów skręć w prawo”</span>
              </span>
            </Float>
          </motion.div>
        </div>

        {/* Copy bottom-left, round CTA bottom-right. */}
        <div className="relative z-20 mt-8 flex flex-col gap-8 lg:absolute lg:inset-x-10 lg:top-[calc(var(--hero-phone-top)_+_7.5rem)] lg:mt-0 lg:flex-row lg:items-end lg:justify-between">
          <div className="cyw-pop flex max-w-[360px] flex-col gap-5" style={{ '--d': '700ms' }}>
            <p className="text-lg leading-relaxed text-ink-muted">
              Pętle od 5 do 200 km i trasy z punktu A do B — dopasowane do Twojego roweru. Potem nawigacja głosowa
              prowadzi zakręt po zakręcie.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartPlanning}
                className="press inline-flex min-h-14 items-center gap-2.5 rounded-full bg-ink px-7 text-[17px] font-bold text-white shadow-[0_12px_28px_rgba(42,26,18,0.25)] hover:bg-ink-muted"
              >
                Zaplanuj trasę
                <IconArrowRight size={20} stroke={2.4} className="text-burnt-orange" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={scrollToJourney}
                className="press min-h-14 rounded-full border-[1.5px] border-ink/15 px-6 text-[17px] font-semibold text-ink hover:border-ink/40"
              >
                Jak to działa
              </button>
            </div>
          </div>

          <div className="cyw-pop hidden items-end gap-6 lg:flex" style={{ '--d': '820ms' }}>
            <ul className="flex flex-col gap-2 text-right text-[15px] text-ink-muted">
              <li className="flex items-center justify-end gap-2">
                Pętle 5–200 km <IconRepeat size={18} className="text-burnt-orange-dark" aria-hidden="true" />
              </li>
              <li className="flex items-center justify-end gap-2">
                Trasy A → B <IconRoute size={18} className="text-sage" aria-hidden="true" />
              </li>
              <li className="flex items-center justify-end gap-2">
                Nawigacja głosowa <IconVolume size={18} className="text-burnt-orange-dark" aria-hidden="true" />
              </li>
            </ul>
            <SpinBadge onClick={onStartPlanning} />
          </div>
        </div>
      </div>

      {/* A cyclist crossing the bottom edge, just once. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-px bg-ink/10" />
      <div
        aria-hidden="true"
        className="cyw-hero-rider pointer-events-none absolute bottom-0 left-0 z-[3] h-[38px] w-[60px]"
      >
        <svg viewBox="0 0 120 76" className="h-full w-full">
          <BikeShapes tire="#2A1A12" spoke="rgba(42,26,18,0.4)" frame="#FC6C26" hub="#FFF4D6" spinning />
        </svg>
      </div>
    </section>
  )
}

export default HeroPoster
