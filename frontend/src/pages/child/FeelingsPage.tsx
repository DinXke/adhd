/**
 * Emotieregulatie — Fase 4
 *
 * Schermen:
 * 1. Check-in: kies emotie
 * 2. Reactie op basis van emotie:
 *    great/good → Feestje + optie voor ademhaling
 *    okay       → Ademhalingsoefening
 *    sad        → 5-4-3-2-1 Grounding
 *    angry      → Woede-protocol (Barkley: herken → stop → adem → kies)
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'

// ── Constanten ─────────────────────────────────────────────────
const EMOTIONS = [
  {
    level: 'great',
    emoji: '😄',
    label: 'Super goed!',
    color: '#5B8C5A',
    bg: 'rgba(91,140,90,0.12)',
    followUp: 'great',
  },
  {
    level: 'good',
    emoji: '🙂',
    label: 'Goed',
    color: '#7BAFA3',
    bg: 'rgba(123,175,163,0.12)',
    followUp: 'good',
  },
  {
    level: 'okay',
    emoji: '😐',
    label: 'Zo zo',
    color: '#E8734A',
    bg: 'rgba(232,115,74,0.12)',
    followUp: 'breathe',
  },
  {
    level: 'sad',
    emoji: '😢',
    label: 'Niet zo goed',
    color: '#A8C5D6',
    bg: 'rgba(168,197,214,0.2)',
    followUp: 'ground',
  },
  {
    level: 'angry',
    emoji: '😤',
    label: 'Moeilijk',
    color: '#D4973B',
    bg: 'rgba(212,151,59,0.15)',
    followUp: 'anger',
  },
]

// ── Ademhalingsoefening ────────────────────────────────────────
function BreathingExercise({ onDone }: { onDone: () => void }) {
  const PHASES = [
    { label: 'Adem in', duration: 4, scale: 1.4 },
    { label: 'Vasthouden', duration: 2, scale: 1.4 },
    { label: 'Adem uit', duration: 6, scale: 0.6 },
    { label: 'Rustig', duration: 2, scale: 0.6 },
  ]

  const [phaseIdx, setPhaseIdx] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [countdown, setCountdown] = useState(PHASES[0].duration)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_CYCLES = 4

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
                  setTimeout(onDone, 1200)
                }
                return cy + 1
              })
            }
            return next
          })
          // Reset countdown na phaseIdx update — gebruik een timeout om de nieuwe fase te lezen
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

  const phase = PHASES[phaseIdx]

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      <h2 className="font-display font-bold text-ink text-xl mb-2 text-center">
        Ademhalingsoefening
      </h2>
      <p className="font-body text-ink-muted text-sm mb-10 text-center">
        Ronde {Math.min(cycle + 1, MAX_CYCLES)} van {MAX_CYCLES}
      </p>

      {/* Cirkel */}
      <div className="relative flex items-center justify-center mb-10" style={{ width: 220, height: 220 }}>
        {/* Buitenste ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            background: 'rgba(123,175,163,0.08)',
            border: '2px solid rgba(123,175,163,0.2)',
          }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Binnenste cirkel */}
        <motion.div
          className="rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7BAFA3, #5B8C5A)' }}
          animate={{ scale: phase.scale, width: 140, height: 140 }}
          transition={{ duration: phase.duration * 0.9, ease: 'easeInOut' }}
        >
          <span className="font-display font-bold text-white text-4xl">{countdown}</span>
        </motion.div>
      </div>

      {/* Fase label */}
      <motion.p
        key={phaseIdx}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display font-bold text-ink text-2xl mb-8"
        style={{ color: 'var(--accent-secondary)' }}
      >
        {phase.label}
      </motion.p>

      <button
        onClick={onDone}
        className="font-body text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        Overslaan
      </button>
    </div>
  )
}

// ── Grounding (5-4-3-2-1) ─────────────────────────────────────
const GROUNDING_STEPS = [
  { count: 5, sense: 'dingen die je ZIET', emoji: '👁️', color: '#7BAFA3' },
  { count: 4, sense: 'dingen die je VOELT', emoji: '🤲', color: '#E8734A' },
  { count: 3, sense: 'dingen die je HOORT', emoji: '👂', color: '#5B8C5A' },
  { count: 2, sense: 'dingen die je RUIKT', emoji: '👃', color: '#F2C94C' },
  { count: 1, sense: 'ding dat je PROEFT', emoji: '👅', color: '#A8C5D6' },
]

function GroundingExercise({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [confirmed, setConfirmed] = useState(false)

  const current = GROUNDING_STEPS[step]
  const isLast = step === GROUNDING_STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      onDone()
    } else {
      setConfirmed(false)
      setStep((s) => s + 1)
    }
  }

  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-10">
      <h2 className="font-display font-bold text-ink text-xl mb-1 text-center">
        Grounding oefening
      </h2>
      <p className="font-body text-ink-muted text-sm mb-8 text-center">
        Breng je aandacht naar het hier en nu
      </p>

      {/* Voortgangspuntjes */}
      <div className="flex gap-2 mb-8">
        {GROUNDING_STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === step ? 24 : 10,
              height: 10,
              background: i <= step ? current.color : 'var(--border-color)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-xs"
        >
          {/* Grote instructie */}
          <div
            className="rounded-3xl p-8 mb-6 text-center"
            style={{ background: `${current.color}18` }}
          >
            <span className="text-6xl block mb-4">{current.emoji}</span>
            <p className="font-display font-bold text-ink text-lg leading-tight">
              Noem {current.count}
            </p>
            <p className="font-display font-bold text-2xl mt-1" style={{ color: current.color }}>
              {current.sense}
            </p>
          </div>

          {/* Bevestigingsknop */}
          <button
            onClick={() => setConfirmed(true)}
            disabled={confirmed}
            className="w-full font-display font-bold py-4 rounded-2xl text-lg mb-3"
            style={{
              background: confirmed ? 'var(--accent-success)' : current.color,
              color: 'white',
              opacity: confirmed ? 0.8 : 1,
            }}
          >
            {confirmed ? '✓ Gedaan!' : 'Ik ben klaar'}
          </button>

          {confirmed && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="w-full font-body font-semibold py-3 rounded-2xl text-base"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: `2px solid ${current.color}`,
              }}
            >
              {isLast ? 'Klaar! 🎉' : 'Volgende →'}
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Woede-protocol (Barkley) ──────────────────────────────────
const ANGER_STEPS = [
  {
    title: 'Herken het gevoel',
    icon: '🌡️',
    color: '#D4973B',
    text: 'Voel je je kwaad, gefrustreerd of overweldigd? Dat is oké. Geef het een naam.',
    action: 'Ik voel me... moeilijk',
  },
  {
    title: 'Stop even',
    icon: '✋',
    color: '#E8734A',
    text: 'Doe niets. Tel tot 5 in je hoofd. Je hoeft nu niets te zeggen of doen.',
    action: '1 — 2 — 3 — 4 — 5',
  },
  {
    title: 'Adem diep',
    icon: '💨',
    color: '#7BAFA3',
    text: 'Adem langzaam in door je neus... en langzaam uit door je mond. Doe dit 3 keer.',
    action: 'Ik heb geademd',
  },
  {
    title: 'Kies een actie',
    icon: '🔀',
    color: '#5B8C5A',
    text: 'Nu je wat rustiger bent: wat ga je doen? Loop weg, praat erover, of vraag hulp.',
    action: 'Ik weet wat ik doe',
  },
]

function AngerProtocol({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const current = ANGER_STEPS[step]
  const isLast = step === ANGER_STEPS.length - 1

  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-10">
      <h2 className="font-display font-bold text-ink text-xl mb-1 text-center">
        Kalm worden
      </h2>
      <p className="font-body text-ink-muted text-sm mb-6 text-center">
        Stap {step + 1} van {ANGER_STEPS.length}
      </p>

      {/* Voortgangsbalk */}
      <div className="w-full max-w-xs mb-8 rounded-full overflow-hidden" style={{ height: 8, background: 'var(--border-color)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: current.color }}
          animate={{ width: `${((step + 1) / ANGER_STEPS.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="w-full max-w-xs"
        >
          <div
            className="rounded-3xl p-7 mb-6 text-center"
            style={{ background: `${current.color}15`, border: `2px solid ${current.color}30` }}
          >
            <span className="text-5xl block mb-3">{current.icon}</span>
            <h3 className="font-display font-bold text-ink text-xl mb-3">{current.title}</h3>
            <p className="font-body text-ink text-base leading-relaxed">{current.text}</p>
          </div>

          <button
            onClick={() => isLast ? onDone() : setStep((s) => s + 1)}
            className="w-full font-display font-bold py-4 rounded-2xl text-lg"
            style={{ background: current.color, color: 'white' }}
          >
            {current.action} ✓
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Positieve afronding (great/good) ──────────────────────────
function PositiveResponse({ emotion, onBreathe, onDone }: {
  emotion: (typeof EMOTIONS)[0]
  onBreathe: () => void
  onDone: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        <span className="text-8xl block mb-5">{emotion.emoji}</span>
        <h2 className="font-display font-bold text-ink text-2xl mb-2">
          Fijn dat te horen!
        </h2>
        <p className="font-body text-ink-muted text-base mb-10">
          Goed zo! Blijf zo goed bezig. 💛
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onBreathe}
          className="font-body font-semibold py-3.5 rounded-2xl text-base"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '2px solid var(--border-color)',
          }}
        >
          💨 Even ademhalen
        </button>
        <button
          onClick={onDone}
          className="font-display font-bold py-3.5 rounded-2xl text-base"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          Verder!
        </button>
      </div>
    </div>
  )
}

// ── Hoofd-component ────────────────────────────────────────────
type Screen = 'checkin' | 'breathe' | 'ground' | 'anger' | 'positive' | 'done'

export default function FeelingsPage() {
  const { user } = useAuthStore()
  const [screen, setScreen] = useState<Screen>('checkin')
  const [selectedEmotion, setSelectedEmotion] = useState<(typeof EMOTIONS)[0] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [tokensAwarded, setTokensAwarded] = useState(0)

  const handleSelectEmotion = async (emotion: (typeof EMOTIONS)[0]) => {
    setSelectedEmotion(emotion)
    setIsSaving(true)
    try {
      const res = await api.post<{ tokensAwarded: number }>('/api/emotions', {
        childId: user?.id,
        level: emotion.level,
      })
      setTokensAwarded(res.tokensAwarded ?? 0)
    } catch {}
    setIsSaving(false)

    // Ga naar het juiste vervolg-scherm
    switch (emotion.followUp) {
      case 'breathe': setScreen('breathe'); break
      case 'ground': setScreen('ground'); break
      case 'anger': setScreen('anger'); break
      default: setScreen('positive'); break
    }
  }

  const handleDone = () => setScreen('done')
  const handleRedo = () => {
    setScreen('checkin')
    setSelectedEmotion(null)
    setTokensAwarded(0)
  }

  return (
    <div className="max-w-lg mx-auto">
      <AnimatePresence mode="wait">

        {/* ── Check-in scherm ──────────────────────────────────── */}
        {screen === 'checkin' && (
          <motion.div
            key="checkin"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="px-5 pt-6 pb-24"
          >
            <div className="text-center mb-8">
              <h1
                className="font-display font-bold text-ink mb-2"
                style={{ fontSize: 'var(--font-size-heading)' }}
              >
                Hoe voel jij je?
              </h1>
              <p className="font-body text-ink-muted text-base">
                Tik op het gezichtje dat het beste past
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {EMOTIONS.map((emotion, i) => (
                <motion.button
                  key={emotion.level}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => !isSaving && handleSelectEmotion(emotion)}
                  disabled={isSaving}
                  className="card flex items-center gap-5 px-5 py-4 w-full text-left"
                  style={{ borderLeft: `4px solid ${emotion.color}` }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-4xl">{emotion.emoji}</span>
                  <span className="font-display font-bold text-ink text-xl">{emotion.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Positieve respons ────────────────────────────────── */}
        {screen === 'positive' && selectedEmotion && (
          <motion.div key="positive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PositiveResponse
              emotion={selectedEmotion}
              onBreathe={() => setScreen('breathe')}
              onDone={handleDone}
            />
          </motion.div>
        )}

        {/* ── Ademhaling ──────────────────────────────────────── */}
        {screen === 'breathe' && (
          <motion.div key="breathe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BreathingExercise onDone={handleDone} />
          </motion.div>
        )}

        {/* ── Grounding ───────────────────────────────────────── */}
        {screen === 'ground' && (
          <motion.div key="ground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GroundingExercise onDone={handleDone} />
          </motion.div>
        )}

        {/* ── Woede-protocol ──────────────────────────────────── */}
        {screen === 'anger' && (
          <motion.div key="anger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AngerProtocol onDone={handleDone} />
          </motion.div>
        )}

        {/* ── Klaar! ──────────────────────────────────────────── */}
        {screen === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center"
          >
            <motion.span
              className="text-8xl block mb-4"
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              🌟
            </motion.span>
            <h2 className="font-display font-bold text-ink text-2xl mb-2">
              Goed gedaan!
            </h2>
            <p className="font-body text-ink-muted text-base mb-2">
              Je hebt je gevoel aangegeven en een oefening gedaan.
            </p>
            {tokensAwarded > 0 && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="font-display font-bold text-lg mb-8"
                style={{ color: 'var(--accent-token)' }}
              >
                +{tokensAwarded} ⭐ verdiend!
              </motion.p>
            )}
            {tokensAwarded === 0 && <div className="mb-8" />}
            <button
              onClick={handleRedo}
              className="font-body font-semibold py-3 px-6 rounded-2xl"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Opnieuw invullen
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
