/**
 * Pauze-overlay — altijd bereikbaar kalmeerscherm
 * Biedt: ademhaling, grounding, of gewoon even rust
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type PauzeScreen = 'menu' | 'breathe' | 'ground'

// ── Compacte ademhaling ────────────────────────────────────────
function QuickBreathing({ onDone }: { onDone: () => void }) {
  const PHASES = [
    { label: 'Adem in', duration: 4, scale: 1.35 },
    { label: 'Vasthouden', duration: 2, scale: 1.35 },
    { label: 'Adem uit', duration: 5, scale: 0.65 },
    { label: 'Rustig', duration: 1, scale: 0.65 },
  ]
  const MAX_CYCLES = 3

  const [phaseIdx, setPhaseIdx] = useState(0)
  const [countdown, setCountdown] = useState(PHASES[0].duration)
  const [cycle, setCycle] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const phase = PHASES[phaseIdx]

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setPhaseIdx((p) => {
            const next = (p + 1) % PHASES.length
            if (next === 0) {
              setCycle((cy) => {
                if (cy + 1 >= MAX_CYCLES) {
                  if (timerRef.current) clearInterval(timerRef.current)
                  setTimeout(onDone, 1000)
                }
                return cy + 1
              })
            }
            return next
          })
          return 1
        }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, []) // eslint-disable-line

  // Sync countdown wanneer phase verandert
  useEffect(() => {
    setCountdown(PHASES[phaseIdx].duration)
  }, [phaseIdx]) // eslint-disable-line

  return (
    <div className="flex flex-col items-center py-6">
      <p className="font-body text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Ronde {Math.min(cycle + 1, MAX_CYCLES)} / {MAX_CYCLES}
      </p>
      <div className="relative flex items-center justify-center mb-6" style={{ width: 160, height: 160 }}>
        <motion.div
          className="rounded-full"
          style={{ background: 'rgba(123,175,163,0.3)', position: 'absolute', width: 160, height: 160 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="rounded-full flex items-center justify-center"
          style={{ background: '#7BAFA3', width: 110, height: 110 }}
          animate={{ scale: phase.scale }}
          transition={{ duration: phase.duration * 0.9, ease: 'easeInOut' }}
        >
          <span className="font-display font-bold text-white text-3xl">{countdown}</span>
        </motion.div>
      </div>
      <motion.p
        key={phaseIdx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display font-bold text-white text-xl mb-6"
      >
        {phase.label}
      </motion.p>
      <button onClick={onDone} className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Klaar
      </button>
    </div>
  )
}

// ── Compacte grounding ─────────────────────────────────────────
const GROUND_STEPS = [
  { n: 5, sense: 'dingen die je ZIET', emoji: '👁️' },
  { n: 4, sense: 'dingen die je VOELT', emoji: '🤲' },
  { n: 3, sense: 'dingen die je HOORT', emoji: '👂' },
  { n: 2, sense: 'dingen die je RUIKT', emoji: '👃' },
  { n: 1, sense: 'ding dat je PROEFT', emoji: '👅' },
]

function QuickGrounding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const current = GROUND_STEPS[step]
  const isLast = step === GROUND_STEPS.length - 1

  return (
    <div className="flex flex-col items-center py-6 px-4">
      <div className="flex gap-1.5 mb-6">
        {GROUND_STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === step ? 20 : 8,
              height: 8,
              background: i <= step ? '#7BAFA3' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="text-center mb-8"
        >
          <span className="text-5xl block mb-3">{current.emoji}</span>
          <p className="font-display font-bold text-white text-2xl mb-1">Noem {current.n}</p>
          <p className="font-body text-base" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {current.sense}
          </p>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => isLast ? onDone() : setStep((s) => s + 1)}
        className="w-full font-display font-bold py-3.5 rounded-2xl text-base"
        style={{ background: '#7BAFA3', color: 'white', maxWidth: 240 }}
      >
        {isLast ? 'Klaar! 🌟' : 'Volgende →'}
      </button>
    </div>
  )
}

// ── Hoofd overlay ──────────────────────────────────────────────
export function PauzeOverlay({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<PauzeScreen>('menu')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#2C2620' }}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-8">
        <AnimatePresence mode="wait">
          {screen !== 'menu' ? (
            <motion.button
              key="back"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScreen('menu')}
              className="font-body text-sm"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              ← Terug
            </motion.button>
          ) : (
            <motion.div key="spacer" style={{ width: 60 }} />
          )}
        </AnimatePresence>

        <p className="font-display font-bold text-white text-lg">
          {screen === 'menu' ? '🤲 Pauze' : screen === 'breathe' ? '💨 Ademhalen' : '🌳 Grounding'}
        </p>

        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full font-body text-xl"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
          aria-label="Sluiten"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {screen === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 pt-4 pb-8"
            >
              <p
                className="font-body text-center text-base mb-8"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Het is oké om even te stoppen. Kies wat je wil doen:
              </p>

              <div className="flex flex-col gap-4 max-w-xs mx-auto">
                {/* Ademhaling */}
                <button
                  onClick={() => setScreen('breathe')}
                  className="rounded-2xl p-5 text-left"
                  style={{ background: 'rgba(123,175,163,0.15)', border: '1.5px solid rgba(123,175,163,0.3)' }}
                >
                  <span className="text-3xl block mb-2">💨</span>
                  <p className="font-display font-bold text-white text-lg leading-tight">Ademhalen</p>
                  <p className="font-body text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    3 rondes box-ademhaling
                  </p>
                </button>

                {/* Grounding */}
                <button
                  onClick={() => setScreen('ground')}
                  className="rounded-2xl p-5 text-left"
                  style={{ background: 'rgba(91,140,90,0.15)', border: '1.5px solid rgba(91,140,90,0.3)' }}
                >
                  <span className="text-3xl block mb-2">🌳</span>
                  <p className="font-display font-bold text-white text-lg leading-tight">Grounding</p>
                  <p className="font-body text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    5-4-3-2-1 techniek
                  </p>
                </button>

                {/* Gewoon rusten */}
                <button
                  onClick={onClose}
                  className="rounded-2xl p-5 text-left"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="text-3xl block mb-2">☁️</span>
                  <p className="font-display font-bold text-white text-lg leading-tight">
                    Even rusten
                  </p>
                  <p className="font-body text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Sluit dit scherm en ga even zitten
                  </p>
                </button>
              </div>
            </motion.div>
          )}

          {screen === 'breathe' && (
            <motion.div key="breathe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuickBreathing onDone={onClose} />
            </motion.div>
          )}

          {screen === 'ground' && (
            <motion.div key="ground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuickGrounding onDone={onClose} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
