/**
 * Breintraining — 6 evidence-based cognitieve training spelletjes
 *
 * Spellen:
 * 1. StopSpel (Go/No-Go)       — Impulscontrole
 * 2. OnthoudReeks (N-Back)      — Werkgeheugen
 * 3. KleurWar (Stroop-taak)     — Cognitieve controle
 * 4. ReeksOnthoud (Corsi Block) — Visueel werkgeheugen
 * 5. VisVanger (Flanker taak)   — Aandacht filteren
 * 6. FocusHouder (Sustained)    — Volgehouden aandacht
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { api } from '../../../lib/api'
import { soundCorrect, soundWrong, soundMatch, soundWin, soundPop, soundTap, feedbackCorrect, feedbackWrong, feedbackWin, vibrate, isMuted, toggleMute } from '../../../lib/sounds'

// ═══════════════════════════════════════════════════════════════
// Gedeelde helpers
// ═══════════════════════════════════════════════════════════════

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]
}

/** Stuur tokens naar de backend */
async function grantTokens(childId: string, amount: number, note: string) {
  try {
    await api.post(`/api/tokens/${childId}/grant`, {
      amount,
      sourceType: 'brain_game',
      note,
    })
  } catch {
    // Stil falen — tokens zijn bonus, geen blocker
  }
}

/** Confetti-achtige deeltjes */
function ConfettiBurst({ active }: { active: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: rand(-120, 120),
        y: rand(-180, -40),
        r: rand(0, 360),
        color: ['#9B7CC8', '#F2C94C', '#7BAFA3', '#5B8C5A', '#A8C5D6'][i % 5],
        size: rand(6, 14),
        delay: Math.random() * 0.3,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active],
  )

  if (!active) return null
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: 0,
            rotate: p.r,
            scale: rand(8, 14) / 10,
          }}
          transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: p.size < 10 ? '50%' : '2px',
            background: p.color,
          }}
        />
      ))}
    </div>
  )
}

/** Sterren-rating */
function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-1 justify-center mb-2">
      {[1, 2, 3].map((s) => (
        <motion.span
          key={s}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3 + s * 0.15, type: 'spring', stiffness: 300 }}
          className="text-4xl"
          style={{ opacity: s <= stars ? 1 : 0.25 }}
        >
          {'\u2B50'}
        </motion.span>
      ))}
    </div>
  )
}

function MuteButton() {
  const [m, setM] = useState(isMuted())
  return (
    <button
      onClick={() => { const newM = toggleMute(); setM(newM) }}
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{ background: 'var(--bg-surface)' }}
      title={m ? 'Geluid aan' : 'Geluid uit'}
    >
      {m ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
    </button>
  )
}

/** Eind-scherm na een spel */
function GameEndScreen({
  score,
  maxScore,
  gameName,
  onBack,
  childId,
  onReplay,
  trainedSkill,
}: {
  score: number
  maxScore: number
  gameName: string
  onBack: () => void
  childId: string
  onReplay?: () => void
  trainedSkill: string
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1
  const tokens = stars >= 3 ? 3 : stars >= 2 ? 2 : 1
  const [showConfetti, setShowConfetti] = useState(true)
  const grantedRef = useRef(false)

  useEffect(() => {
    if (!grantedRef.current) {
      grantedRef.current = true
      grantTokens(childId, tokens, `${gameName}: ${score}/${maxScore}`)
    }
    const t = setTimeout(() => setShowConfetti(false), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      <ConfettiBurst active={showConfetti} />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <StarRating stars={stars} />

        <h2
          className="font-display font-bold mb-1"
          style={{ fontSize: 28, color: 'var(--text-primary)' }}
        >
          {pct >= 80 ? 'Fantastisch!' : pct >= 50 ? 'Goed gedaan!' : 'Blijf oefenen!'}
        </h2>

        <p className="font-body text-base mb-2" style={{ color: 'var(--text-muted)' }}>
          {score} van {maxScore} punten
        </p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl px-5 py-3 mb-3"
          style={{
            background: 'rgba(155,124,200,0.12)',
            border: '1.5px solid rgba(155,124,200,0.3)',
          }}
        >
          <p className="font-body text-sm" style={{ color: '#9B7CC8' }}>
            {'\uD83E\uDDE0'} {trainedSkill}
          </p>
        </motion.div>

        <motion.p
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="font-display font-bold text-xl mb-8"
          style={{ color: 'var(--accent-token)' }}
        >
          +{tokens} {'\u2B50'} verdiend!
        </motion.p>
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {onReplay && (
          <button
            onClick={onReplay}
            className="font-display font-bold py-4 px-10 text-lg"
            style={{
              background: '#9B7CC8',
              color: 'white',
              borderRadius: 'var(--btn-radius)',
              minHeight: 56,
            }}
          >
            Nog een keer!
          </button>
        )}
        <button
          onClick={onBack}
          className="font-display font-bold py-4 px-10 text-lg"
          style={{
            background: onReplay ? 'var(--bg-surface)' : '#9B7CC8',
            color: onReplay ? 'var(--text-muted)' : 'white',
            borderRadius: 'var(--btn-radius)',
            minHeight: 56,
            border: onReplay ? '1px solid var(--border-color)' : 'none',
          }}
        >
          Terug naar spelletjes
        </button>
      </div>
    </div>
  )
}

/** Score-teller */
function ScoreDisplay({ score, label }: { score: number; label?: string }) {
  return (
    <motion.div
      key={score}
      className="font-display font-bold text-lg px-4 py-2 rounded-full"
      style={{
        background: 'var(--accent-token)',
        color: '#3D3229',
      }}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
    >
      {label ?? 'Score'}: {score}
    </motion.div>
  )
}

/** Progressie balk (trial X van Y) */
function TrialProgress({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100
  return (
    <div className="w-full mb-3">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: 'var(--border-color)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#9B7CC8' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      </div>
      <p className="font-body text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
        {current} / {total}
      </p>
    </div>
  )
}

// Shared game props
interface GameProps {
  onBack: () => void
  difficulty: number // 1, 2, 3
}

// ═══════════════════════════════════════════════════════════════
// 1. StopSpel (Go/No-Go) — Impulscontrole
// ═══════════════════════════════════════════════════════════════

const GO_SHAPES = [
  { emoji: '\u2B50', label: 'ster' },
  { emoji: '\uD83D\uDD35', label: 'blauw' },
  { emoji: '\uD83D\uDFE2', label: 'groen' },
]
const NOGO_SHAPES = [
  { emoji: '\uD83D\uDD34', label: 'rood' },
  { emoji: '\u274C', label: 'kruis' },
]

function StopSpel({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const TOTAL_TRIALS = 30
  const NOGO_RATIO = 0.3
  const displayMs = difficulty === 1 ? 1500 : difficulty === 2 ? 1200 : 900
  const pauseMs = difficulty === 1 ? 800 : difficulty === 2 ? 600 : 400

  const [trial, setTrial] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [currentShape, setCurrentShape] = useState<{ emoji: string; isGo: boolean } | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [tapped, setTapped] = useState(false)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [showingShape, setShowingShape] = useState(false)
  const shapeStartRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trialRef = useRef(0)

  // Generate all trials upfront
  const trials = useMemo(() => {
    const t: boolean[] = []
    const noGoCount = Math.round(TOTAL_TRIALS * NOGO_RATIO)
    for (let i = 0; i < TOTAL_TRIALS; i++) {
      t.push(i < noGoCount ? false : true) // false = NoGo, true = Go
    }
    return shuffle(t)
  }, [])

  const nextTrial = useCallback(() => {
    if (trialRef.current >= TOTAL_TRIALS) {
      setGameOver(true)
      return
    }
    const isGo = trials[trialRef.current]
    const shape = isGo ? pickRandom(GO_SHAPES) : pickRandom(NOGO_SHAPES)
    setCurrentShape({ emoji: shape.emoji, isGo })
    setTapped(false)
    setFeedback(null)
    setShowingShape(true)
    shapeStartRef.current = Date.now()

    // Auto-advance after displayMs
    timeoutRef.current = setTimeout(() => {
      // If NoGo and user didn't tap — correct!
      if (!isGo) {
        setScore((s) => s + 1)
        setFeedback('correct')
        soundCorrect()
      }
      // If Go and user didn't tap — miss (no penalty, just no point)
      setShowingShape(false)
      setTrial((t) => t + 1)
      trialRef.current += 1

      setTimeout(() => {
        setFeedback(null)
        setCurrentShape(null)
        nextTrial()
      }, pauseMs)
    }, displayMs)
  }, [trials, displayMs, pauseMs])

  // Start
  useEffect(() => {
    const startDelay = setTimeout(() => nextTrial(), 1000)
    return () => {
      clearTimeout(startDelay)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleTap = useCallback(() => {
    if (!currentShape || tapped || !showingShape) return
    setTapped(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const rt = Date.now() - shapeStartRef.current
    setReactionTimes((prev) => [...prev, rt])

    if (currentShape.isGo) {
      // Correct tap on Go
      setScore((s) => s + 1)
      setFeedback('correct')
      feedbackCorrect()
    } else {
      // Tapped on NoGo — oops!
      setScore((s) => Math.max(0, s - 1))
      setFeedback('wrong')
      feedbackWrong()
    }

    setShowingShape(false)
    setTrial((t) => t + 1)
    trialRef.current += 1

    setTimeout(() => {
      setFeedback(null)
      setCurrentShape(null)
      nextTrial()
    }, pauseMs)
  }, [currentShape, tapped, showingShape, nextTrial, pauseMs])

  const handleSkip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setGameOver(true)
  }, [])

  const resetGame = useCallback(() => {
    trialRef.current = 0
    setTrial(0)
    setScore(0)
    setGameOver(false)
    setCurrentShape(null)
    setFeedback(null)
    setTapped(false)
    setReactionTimes([])
    setShowingShape(false)
    setTimeout(() => nextTrial(), 500)
  }, [nextTrial])

  if (gameOver) {
    const avgRt = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_TRIALS}
        gameName="StopSpel"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
        trainedSkill={`Je hebt je impulscontrole getraind!${avgRt > 0 ? ` Gemiddelde reactietijd: ${avgRt}ms` : ''}`}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
      onClick={handleTap}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={score} />
      </div>

      <div className="px-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <TrialProgress current={trial} total={TOTAL_TRIALS} />
      </div>

      <p
        className="font-body text-center text-sm mb-2 flex-shrink-0 px-4"
        style={{ color: 'var(--text-muted)' }}
      >
        Tik op het scherm bij {'\u2B50'}{'\uD83D\uDD35'}{'\uD83D\uDFE2'} maar NIET bij {'\uD83D\uDD34'}{'\u274C'}!
      </p>

      {/* Shape area */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentShape && showingShape ? (
            <motion.div
              key={trial}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="text-center"
            >
              <span style={{ fontSize: 120 }}>{currentShape.emoji}</span>
            </motion.div>
          ) : feedback ? (
            <motion.div
              key={`fb-${trial}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <span style={{ fontSize: 64 }}>
                {feedback === 'correct' ? '\u2705' : '\uD83D\uDE4A'}
              </span>
              <p
                className="font-display font-bold text-xl mt-2"
                style={{ color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--hint-color)' }}
              >
                {feedback === 'correct' ? 'Goed zo!' : 'Oeps, niet tikken!'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="font-body text-3xl"
              style={{ color: 'var(--text-muted)' }}
            >
              ...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. OnthoudReeks (N-Back) — Werkgeheugen
// ═══════════════════════════════════════════════════════════════

const NBACK_ITEMS = [
  { emoji: '\uD83D\uDD34', label: 'rood' },
  { emoji: '\uD83D\uDD35', label: 'blauw' },
  { emoji: '\uD83D\uDFE1', label: 'geel' },
  { emoji: '\uD83D\uDFE2', label: 'groen' },
  { emoji: '\uD83D\uDFE3', label: 'paars' },
]

function OnthoudReeks({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const nBack = difficulty // 1-back, 2-back, 3-back
  const TOTAL_TRIALS = 25
  const MATCH_RATIO = 0.3
  const DISPLAY_MS = 2000
  const PAUSE_MS = 500

  // Generate trials
  const trials = useMemo(() => {
    const sequence: number[] = []
    const isMatch: boolean[] = []
    const matchCount = Math.round(TOTAL_TRIALS * MATCH_RATIO)
    const matchPositions = new Set<number>()

    // Decide which positions will be matches (must be >= nBack)
    while (matchPositions.size < matchCount) {
      const pos = rand(nBack, TOTAL_TRIALS - 1)
      matchPositions.add(pos)
    }

    for (let i = 0; i < TOTAL_TRIALS; i++) {
      if (matchPositions.has(i) && i >= nBack) {
        // This should match the item nBack positions ago
        sequence.push(sequence[i - nBack])
        isMatch.push(true)
      } else {
        // Pick a random item that does NOT match nBack positions ago
        let idx: number
        do {
          idx = rand(0, NBACK_ITEMS.length - 1)
        } while (i >= nBack && idx === sequence[i - nBack])
        sequence.push(idx)
        isMatch.push(false)
      }
    }
    return { sequence, isMatch }
  }, [nBack])

  const [trial, setTrial] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [showingItem, setShowingItem] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trialRef = useRef(0)

  const advanceTrial = useCallback(() => {
    if (trialRef.current >= TOTAL_TRIALS) {
      setGameOver(true)
      return
    }
    setShowingItem(true)
    setAnswered(false)
    setFeedback(null)

    const currentItemIdx = trials.sequence[trialRef.current]
    setHistory((h) => [...h, currentItemIdx])

    // Auto-advance
    timeoutRef.current = setTimeout(() => {
      // If it was NOT a match and user didn't press "Ja!" — correct (no action needed for non-match)
      // If it WAS a match and user didn't press "Ja!" — miss
      if (trials.isMatch[trialRef.current] && !answered) {
        // Missed a match
        setFeedback('wrong')
      } else if (!trials.isMatch[trialRef.current]) {
        // Correctly ignored
        setScore((s) => s + 1)
      }

      setShowingItem(false)
      trialRef.current += 1
      setTrial((t) => t + 1)

      setTimeout(() => {
        setFeedback(null)
        advanceTrial()
      }, PAUSE_MS)
    }, DISPLAY_MS)
  }, [trials, TOTAL_TRIALS, answered])

  useEffect(() => {
    const startDelay = setTimeout(() => advanceTrial(), 1000)
    return () => {
      clearTimeout(startDelay)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleYes = useCallback(() => {
    if (!showingItem || answered) return
    setAnswered(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (trials.isMatch[trialRef.current]) {
      setScore((s) => s + 1)
      setFeedback('correct')
      feedbackCorrect()
    } else {
      setFeedback('wrong')
      feedbackWrong()
    }

    setShowingItem(false)
    trialRef.current += 1
    setTrial((t) => t + 1)

    setTimeout(() => {
      setFeedback(null)
      advanceTrial()
    }, PAUSE_MS)
  }, [showingItem, answered, trials, advanceTrial])

  const handleSkip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setGameOver(true)
  }, [])

  const resetGame = useCallback(() => {
    trialRef.current = 0
    setTrial(0)
    setScore(0)
    setGameOver(false)
    setShowingItem(false)
    setAnswered(false)
    setFeedback(null)
    setHistory([])
    setTimeout(() => advanceTrial(), 500)
  }, [advanceTrial])

  if (gameOver) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_TRIALS}
        gameName="OnthoudReeks"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
        trainedSkill={`Je hebt je werkgeheugen getraind! (${nBack}-back)`}
      />
    )
  }

  const currentItemIdx = trials.sequence[trialRef.current] ?? 0
  const currentItem = NBACK_ITEMS[currentItemIdx]
  // Show what was N positions back for reference
  const nBackItem = trial >= nBack ? NBACK_ITEMS[history[history.length - nBack]] : null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={score} />
      </div>

      <div className="px-4 flex-shrink-0">
        <TrialProgress current={trial} total={TOTAL_TRIALS} />
      </div>

      {/* N-back indicator */}
      <div className="flex items-center justify-center gap-3 mb-2 px-4">
        <div
          className="rounded-xl px-3 py-1.5 font-body text-sm"
          style={{ background: 'rgba(155,124,200,0.12)', color: '#9B7CC8' }}
        >
          {nBack}-back: Tik &quot;Ja!&quot; als dit hetzelfde is als {nBack === 1 ? 'de vorige' : `${nBack} terug`}
        </div>
      </div>

      {/* N-back reference */}
      {nBackItem && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
            {nBack === 1 ? 'Vorige' : `${nBack} terug`}:
          </span>
          <span style={{ fontSize: 28, opacity: 0.5 }}>{nBackItem.emoji}</span>
        </div>
      )}

      {/* Main display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <AnimatePresence mode="wait">
          {showingItem ? (
            <motion.div
              key={`item-${trial}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span style={{ fontSize: 100 }}>{currentItem.emoji}</span>
            </motion.div>
          ) : feedback ? (
            <motion.div
              key={`fb-${trial}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <span style={{ fontSize: 56 }}>
                {feedback === 'correct' ? '\u2705' : '\uD83E\uDD14'}
              </span>
              <p
                className="font-display font-bold text-lg mt-2"
                style={{ color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--hint-color)' }}
              >
                {feedback === 'correct' ? 'Goed onthouden!' : 'Volgende keer beter!'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="font-body text-3xl"
              style={{ color: 'var(--text-muted)' }}
            >
              ...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ja! button */}
        {showingItem && !answered && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleYes}
            className="font-display font-bold text-2xl py-5 px-16 rounded-full"
            style={{
              background: '#9B7CC8',
              color: 'white',
              minHeight: 64,
              boxShadow: '0 4px 16px rgba(155,124,200,0.3)',
            }}
          >
            Ja! Hetzelfde!
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. KleurWar (Stroop-taak) — Cognitieve controle
// ═══════════════════════════════════════════════════════════════

const STROOP_COLORS: { word: string; hex: string }[] = [
  { word: 'ROOD', hex: '#D64545' },
  { word: 'BLAUW', hex: '#4488CC' },
  { word: 'GROEN', hex: '#44AA55' },
  { word: 'GEEL', hex: '#CCAA22' },
  { word: 'ORANJE', hex: '#DD7733' },
  { word: 'PAARS', hex: '#9B7CC8' },
]

function KleurWar({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const TOTAL_TRIALS = 20
  // Easy = 30% incongruent, Medium = 60%, Hard = 85%
  const incongruentRatio = difficulty === 1 ? 0.3 : difficulty === 2 ? 0.6 : 0.85

  const trials = useMemo(() => {
    const result: { word: string; inkColor: { word: string; hex: string }; options: { word: string; hex: string }[] }[] = []
    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const isIncongruent = Math.random() < incongruentRatio
      const wordColor = pickRandom(STROOP_COLORS)
      let inkColor: { word: string; hex: string }
      if (isIncongruent) {
        do {
          inkColor = pickRandom(STROOP_COLORS)
        } while (inkColor.word === wordColor.word)
      } else {
        inkColor = wordColor
      }
      // Always use 4 answer buttons (choose 4 distinct colors including the correct ink color)
      const optionSet = new Set<string>([inkColor.word])
      while (optionSet.size < 4) {
        optionSet.add(pickRandom(STROOP_COLORS).word)
      }
      const options = shuffle(
        Array.from(optionSet).map((w) => STROOP_COLORS.find((c) => c.word === w)!)
      )
      result.push({ word: wordColor.word, inkColor, options })
    }
    return result
  }, [incongruentRatio])

  const [trial, setTrial] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [answered, setAnswered] = useState(false)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const trialStartRef = useRef(Date.now())

  useEffect(() => {
    trialStartRef.current = Date.now()
  }, [trial])

  const handleAnswer = useCallback((selected: string) => {
    if (answered || gameOver) return
    setAnswered(true)

    const rt = Date.now() - trialStartRef.current
    setReactionTimes((prev) => [...prev, rt])

    const correct = selected === trials[trial].inkColor.word
    if (correct) {
      setScore((s) => s + 1)
      setFeedback('correct')
      feedbackCorrect()
    } else {
      setFeedback('wrong')
      feedbackWrong()
    }

    setTimeout(() => {
      setFeedback(null)
      setAnswered(false)
      if (trial + 1 >= TOTAL_TRIALS) {
        setGameOver(true)
      } else {
        setTrial((t) => t + 1)
      }
    }, 800)
  }, [answered, gameOver, trial, trials, TOTAL_TRIALS])

  const handleSkip = useCallback(() => {
    setGameOver(true)
  }, [])

  const resetGame = useCallback(() => {
    setTrial(0)
    setScore(0)
    setGameOver(false)
    setFeedback(null)
    setAnswered(false)
    setReactionTimes([])
  }, [])

  if (gameOver) {
    const avgRt = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_TRIALS}
        gameName="KleurWar"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
        trainedSkill={`Je hebt je cognitieve controle getraind!${avgRt > 0 ? ` Gemiddelde reactietijd: ${avgRt}ms` : ''}`}
      />
    )
  }

  const currentTrial = trials[trial]

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={score} />
      </div>

      <div className="px-4 flex-shrink-0">
        <TrialProgress current={trial} total={TOTAL_TRIALS} />
      </div>

      <p
        className="font-body text-center text-sm mb-4 flex-shrink-0 px-4"
        style={{ color: 'var(--text-muted)' }}
      >
        Tik op de KLEUR van de inkt, niet het woord!
      </p>

      {/* Word display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={trial}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-center"
          >
            <span
              className="font-display font-bold"
              style={{
                fontSize: 'clamp(48px, 12vw, 72px)',
                color: currentTrial.inkColor.hex,
                textShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {currentTrial.word}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display font-bold text-lg"
              style={{ color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--hint-color)' }}
            >
              {feedback === 'correct' ? 'Goed zo!' : 'De kleur, niet het woord!'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color buttons */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {currentTrial.options.map((opt) => (
            <motion.button
              key={opt.word}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAnswer(opt.word)}
              disabled={answered}
              className="font-display font-bold text-lg py-4 rounded-2xl"
              style={{
                background: opt.hex,
                color: 'white',
                minHeight: 60,
                opacity: answered ? 0.6 : 1,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {opt.word}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. ReeksOnthoud (Corsi Block) — Visueel werkgeheugen
// ═══════════════════════════════════════════════════════════════

function ReeksOnthoud({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const startLength = difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5
  const MAX_LENGTH = 9

  const [sequenceLength, setSequenceLength] = useState(startLength)
  const [sequence, setSequence] = useState<number[]>([])
  const [playerSequence, setPlayerSequence] = useState<number[]>([])
  const [phase, setPhase] = useState<'showing' | 'input' | 'feedback' | 'end'>('showing')
  const [currentShowIdx, setCurrentShowIdx] = useState(-1)
  const [activeBlock, setActiveBlock] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [highestLength, setHighestLength] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Generate sequence
  const generateSequence = useCallback((len: number) => {
    const seq: number[] = []
    for (let i = 0; i < len; i++) {
      let next: number
      do {
        next = rand(0, 8)
      } while (seq.length > 0 && next === seq[seq.length - 1])
      seq.push(next)
    }
    return seq
  }, [])

  // Start showing sequence
  const startRound = useCallback((len: number) => {
    const seq = generateSequence(len)
    setSequence(seq)
    setPlayerSequence([])
    setPhase('showing')
    setCurrentShowIdx(-1)
    setActiveBlock(null)
    setShowHint(false)
    setFeedback(null)

    // Show sequence one by one
    let i = 0
    const showNext = () => {
      if (i < seq.length) {
        setCurrentShowIdx(i)
        setActiveBlock(seq[i])
        soundTap()
        timeoutRef.current = setTimeout(() => {
          setActiveBlock(null)
          i++
          timeoutRef.current = setTimeout(showNext, 300)
        }, 600)
      } else {
        setPhase('input')
        setCurrentShowIdx(-1)
      }
    }
    timeoutRef.current = setTimeout(showNext, 600)
  }, [generateSequence])

  // Initialize first round
  useEffect(() => {
    startRound(startLength)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleBlockTap = useCallback((idx: number) => {
    if (phase !== 'input') return
    soundTap()
    vibrate(30)

    const newSeq = [...playerSequence, idx]
    setPlayerSequence(newSeq)
    setActiveBlock(idx)
    setTimeout(() => setActiveBlock(null), 200)

    const pos = newSeq.length - 1
    if (newSeq[pos] !== sequence[pos]) {
      // Wrong!
      const newMistakes = mistakes + 1
      setMistakes(newMistakes)
      setFeedback('wrong')
      feedbackWrong()

      if (newMistakes >= 2) {
        // Game over
        setHighestLength((h) => Math.max(h, sequenceLength - 1))
        setTimeout(() => setPhase('end'), 1000)
      } else {
        // Show hint (replay sequence)
        setShowHint(true)
        setTimeout(() => {
          setShowHint(false)
          setFeedback(null)
          startRound(sequenceLength)
        }, 1500)
      }
      return
    }

    if (newSeq.length === sequence.length) {
      // Correct!
      setFeedback('correct')
      feedbackCorrect()
      const newLen = Math.min(sequenceLength + 1, MAX_LENGTH)
      setHighestLength((h) => Math.max(h, sequenceLength))
      setRounds((r) => r + 1)

      if (newLen > MAX_LENGTH) {
        setTimeout(() => setPhase('end'), 1000)
      } else {
        setSequenceLength(newLen)
        setTimeout(() => {
          setFeedback(null)
          startRound(newLen)
        }, 1200)
      }
    }
  }, [phase, playerSequence, sequence, mistakes, sequenceLength, startRound])

  const handleSkip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHighestLength((h) => Math.max(h, sequenceLength - 1))
    setPhase('end')
  }, [sequenceLength])

  const resetGame = useCallback(() => {
    setSequenceLength(startLength)
    setMistakes(0)
    setRounds(0)
    setHighestLength(0)
    startRound(startLength)
  }, [startLength, startRound])

  if (phase === 'end') {
    // Score: highest length reached, max = 9
    return (
      <GameEndScreen
        score={highestLength}
        maxScore={MAX_LENGTH}
        gameName="ReeksOnthoud"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
        trainedSkill={`Je hebt je visueel werkgeheugen getraind! Langste reeks: ${highestLength}`}
      />
    )
  }

  // Show the hint sequence
  const hintSequence = showHint ? sequence : null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <div className="font-display font-bold text-lg px-4 py-2 rounded-full" style={{ background: 'rgba(155,124,200,0.15)', color: '#9B7CC8' }}>
          Reeks: {sequenceLength}
        </div>
      </div>

      <p
        className="font-body text-center text-sm mb-2 flex-shrink-0 px-4"
        style={{ color: 'var(--text-muted)' }}
      >
        {phase === 'showing'
          ? 'Kijk goed welke blokjes oplichten...'
          : 'Tik de blokjes in dezelfde volgorde!'}
      </p>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center font-display font-bold text-lg mb-2"
            style={{ color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--hint-color)' }}
          >
            {feedback === 'correct' ? 'Perfect! Langere reeks...' : 'Probeer het nog eens!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      {phase === 'input' && (
        <div className="flex justify-center gap-2 mb-3">
          {sequence.map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full"
              style={{
                background: i < playerSequence.length
                  ? (playerSequence[i] === sequence[i] ? 'var(--accent-success)' : 'var(--hint-color)')
                  : 'var(--border-color)',
              }}
            />
          ))}
        </div>
      )}

      {/* 3x3 Grid */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className="grid grid-cols-3 gap-3 w-full"
          style={{ maxWidth: 320 }}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const isActive = activeBlock === i
            const isInHintSeq = hintSequence?.includes(i)
            return (
              <motion.button
                key={i}
                onClick={() => handleBlockTap(i)}
                disabled={phase !== 'input'}
                whileTap={phase === 'input' ? { scale: 0.9 } : {}}
                animate={{
                  background: isActive
                    ? '#9B7CC8'
                    : isInHintSeq
                    ? 'rgba(155,124,200,0.3)'
                    : 'var(--bg-card)',
                  scale: isActive ? 1.08 : 1,
                }}
                transition={{ duration: 0.15 }}
                className="rounded-2xl"
                style={{
                  aspectRatio: '1',
                  minHeight: 80,
                  border: `3px solid ${isActive ? '#9B7CC8' : 'var(--border-color)'}`,
                  cursor: phase === 'input' ? 'pointer' : 'default',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. VisVanger (Flanker taak) — Aandacht filteren
// ═══════════════════════════════════════════════════════════════

function VisVanger({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const TOTAL_TRIALS = 20
  // Easy = 30% incongruent, Medium = 60%, Hard = 85%
  const incongruentRatio = difficulty === 1 ? 0.3 : difficulty === 2 ? 0.6 : 0.85

  const trials = useMemo(() => {
    const result: { middleDir: 'left' | 'right'; flankerDir: 'left' | 'right'; isCongruent: boolean }[] = []
    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const middleDir: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
      const isIncongruent = Math.random() < incongruentRatio
      const flankerDir: 'left' | 'right' = isIncongruent
        ? (middleDir === 'left' ? 'right' : 'left')
        : middleDir
      result.push({ middleDir, flankerDir, isCongruent: !isIncongruent })
    }
    return result
  }, [incongruentRatio])

  const [trial, setTrial] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [answered, setAnswered] = useState(false)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const trialStartRef = useRef(Date.now())

  useEffect(() => {
    trialStartRef.current = Date.now()
  }, [trial])

  const handleAnswer = useCallback((dir: 'left' | 'right') => {
    if (answered || gameOver) return
    setAnswered(true)

    const rt = Date.now() - trialStartRef.current
    setReactionTimes((prev) => [...prev, rt])

    const correct = dir === trials[trial].middleDir
    if (correct) {
      setScore((s) => s + 1)
      setFeedback('correct')
      feedbackCorrect()
    } else {
      setFeedback('wrong')
      feedbackWrong()
    }

    setTimeout(() => {
      setFeedback(null)
      setAnswered(false)
      if (trial + 1 >= TOTAL_TRIALS) {
        setGameOver(true)
      } else {
        setTrial((t) => t + 1)
      }
    }, 800)
  }, [answered, gameOver, trial, trials, TOTAL_TRIALS])

  const handleSkip = useCallback(() => {
    setGameOver(true)
  }, [])

  const resetGame = useCallback(() => {
    setTrial(0)
    setScore(0)
    setGameOver(false)
    setFeedback(null)
    setAnswered(false)
    setReactionTimes([])
  }, [])

  if (gameOver) {
    const avgRt = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_TRIALS}
        gameName="VisVanger"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
        trainedSkill={`Je hebt je aandacht filteren getraind!${avgRt > 0 ? ` Gemiddelde reactietijd: ${avgRt}ms` : ''}`}
      />
    )
  }

  const currentTrial = trials[trial]
  // Build the fish row: flanker flanker MIDDLE flanker flanker
  const fishSize = 48

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={score} />
      </div>

      <div className="px-4 flex-shrink-0">
        <TrialProgress current={trial} total={TOTAL_TRIALS} />
      </div>

      <p
        className="font-body text-center text-sm mb-4 flex-shrink-0 px-4"
        style={{ color: 'var(--text-muted)' }}
      >
        Welke kant kijkt de MIDDELSTE vis?
      </p>

      {/* Fish display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={trial}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center gap-1"
          >
            {[0, 1, 2, 3, 4].map((pos) => {
              const isMiddle = pos === 2
              const dir = isMiddle ? currentTrial.middleDir : currentTrial.flankerDir
              const s = isMiddle ? fishSize + 12 : fishSize
              return (
                <svg key={pos} width={s} height={s} viewBox="0 0 40 40"
                  style={{ opacity: isMiddle ? 1 : 0.65, filter: isMiddle ? 'drop-shadow(0 0 6px rgba(155,124,200,0.5))' : 'none' }}>
                  <g transform={`translate(20,20)${dir === 'left' ? ' scale(-1,1)' : ''}`}>
                    {/* Vis lichaam */}
                    <ellipse cx="2" cy="0" rx="14" ry="9" fill={isMiddle ? '#9B7CC8' : '#7BAFA3'} />
                    {/* Staart */}
                    <polygon points="-14,-8 -22,0 -14,8" fill={isMiddle ? '#7B5CBB' : '#5B9C8A'} />
                    {/* Oog */}
                    <circle cx="10" cy="-2" r="2.5" fill="white" />
                    <circle cx="11" cy="-2" r="1.2" fill="#333" />
                  </g>
                </svg>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Middle indicator */}
        <p className="font-body text-xs" style={{ color: 'var(--text-muted)', marginTop: -20 }}>
          {'\u2191'} middelste vis
        </p>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display font-bold text-lg"
              style={{ color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--hint-color)' }}
            >
              {feedback === 'correct' ? 'Goed gezien!' : 'Kijk naar de middelste!'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Direction buttons */}
        <div className="flex gap-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAnswer('left')}
            disabled={answered}
            className="font-display font-bold text-3xl rounded-full flex items-center justify-center"
            style={{
              width: 80,
              height: 80,
              background: '#9B7CC8',
              color: 'white',
              opacity: answered ? 0.5 : 1,
              boxShadow: '0 4px 12px rgba(155,124,200,0.3)',
            }}
          >
            {'\u2190'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAnswer('right')}
            disabled={answered}
            className="font-display font-bold text-3xl rounded-full flex items-center justify-center"
            style={{
              width: 80,
              height: 80,
              background: '#9B7CC8',
              color: 'white',
              opacity: answered ? 0.5 : 1,
              boxShadow: '0 4px 12px rgba(155,124,200,0.3)',
            }}
          >
            {'\u2192'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. FocusHouder (Sustained Attention) — Volgehouden aandacht
// ═══════════════════════════════════════════════════════════════

const FOCUS_TARGET = '\u2B50' // ster
const FOCUS_DISTRACTORS = ['\uD83D\uDD35', '\uD83D\uDD34', '\uD83D\uDFE1', '\uD83D\uDFE2', '\uD83D\uDFE3']

function FocusHouder({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const TOTAL_ITEMS = 40
  const INTERVAL_MS = difficulty === 1 ? 2500 : difficulty === 2 ? 2000 : 1500
  const TARGET_RATIO = 0.25

  const items = useMemo(() => {
    const result: { emoji: string; isTarget: boolean }[] = []
    const targetCount = Math.round(TOTAL_ITEMS * TARGET_RATIO)
    const targetPositions = new Set<number>()
    while (targetPositions.size < targetCount) {
      targetPositions.add(rand(0, TOTAL_ITEMS - 1))
    }
    for (let i = 0; i < TOTAL_ITEMS; i++) {
      if (targetPositions.has(i)) {
        result.push({ emoji: FOCUS_TARGET, isTarget: true })
      } else {
        result.push({ emoji: pickRandom(FOCUS_DISTRACTORS), isTarget: false })
      }
    }
    return result
  }, [])

  const [itemIdx, setItemIdx] = useState(-1)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [falseAlarms, setFalseAlarms] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [tapped, setTapped] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'miss' | null>(null)
  const [showingItem, setShowingItem] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const itemIdxRef = useRef(-1)
  const tappedRef = useRef(false)

  useEffect(() => {
    // Start items appearing
    const startDelay = setTimeout(() => {
      let idx = 0
      const advance = () => {
        if (idx >= TOTAL_ITEMS) {
          setGameOver(true)
          return
        }

        // Check if previous item was a missed target
        if (idx > 0 && items[idx - 1].isTarget && !tappedRef.current) {
          setMisses((m) => m + 1)
        }

        itemIdxRef.current = idx
        tappedRef.current = false
        setItemIdx(idx)
        setTapped(false)
        setFeedback(null)
        setShowingItem(true)
        idx++

        intervalRef.current = setTimeout(advance, INTERVAL_MS)
      }
      advance()
    }, 1000)

    return () => {
      clearTimeout(startDelay)
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [items, INTERVAL_MS, TOTAL_ITEMS])

  const handleTap = useCallback(() => {
    if (tappedRef.current || !showingItem || gameOver || itemIdxRef.current < 0) return
    tappedRef.current = true
    setTapped(true)

    const currentItem = items[itemIdxRef.current]
    if (currentItem.isTarget) {
      setHits((h) => h + 1)
      setFeedback('correct')
      feedbackCorrect()
    } else {
      setFalseAlarms((f) => f + 1)
      setFeedback('wrong')
      feedbackWrong()
    }
  }, [showingItem, gameOver, items])

  const handleSkip = useCallback(() => {
    if (intervalRef.current) clearTimeout(intervalRef.current)
    setGameOver(true)
  }, [])

  const resetGame = useCallback(() => {
    itemIdxRef.current = -1
    tappedRef.current = false
    setItemIdx(-1)
    setHits(0)
    setMisses(0)
    setFalseAlarms(0)
    setGameOver(false)
    setTapped(false)
    setFeedback(null)
    setShowingItem(false)

    // Restart
    const startDelay = setTimeout(() => {
      let idx = 0
      const advance = () => {
        if (idx >= TOTAL_ITEMS) {
          setGameOver(true)
          return
        }
        if (idx > 0 && items[idx - 1].isTarget && !tappedRef.current) {
          setMisses((m) => m + 1)
        }
        itemIdxRef.current = idx
        tappedRef.current = false
        setItemIdx(idx)
        setTapped(false)
        setFeedback(null)
        setShowingItem(true)
        idx++
        intervalRef.current = setTimeout(advance, INTERVAL_MS)
      }
      advance()
    }, 1000)

    return () => clearTimeout(startDelay)
  }, [items, INTERVAL_MS, TOTAL_ITEMS])

  if (gameOver) {
    // Check last item
    const totalTargets = items.filter((i) => i.isTarget).length
    const finalScore = Math.max(0, hits - falseAlarms)
    return (
      <GameEndScreen
        score={finalScore}
        maxScore={totalTargets}
        gameName="FocusHouder"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
        trainedSkill={`Je hebt je volgehouden aandacht getraind! ${hits} doelen geraakt, ${falseAlarms} vals alarm`}
      />
    )
  }

  const currentItem = itemIdx >= 0 && itemIdx < items.length ? items[itemIdx] : null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
      onClick={handleTap}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={Math.max(0, hits - falseAlarms)} />
      </div>

      <div className="px-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <TrialProgress current={Math.max(0, itemIdx + 1)} total={TOTAL_ITEMS} />
      </div>

      {/* Target reminder */}
      <div
        className="flex items-center justify-center gap-2 mb-2 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-xl px-4 py-2 font-body text-sm flex items-center gap-2"
          style={{ background: 'rgba(155,124,200,0.12)', color: '#9B7CC8' }}
        >
          Tik alleen bij {FOCUS_TARGET}!
        </div>
      </div>

      {/* Item display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AnimatePresence mode="wait">
          {currentItem ? (
            <motion.div
              key={itemIdx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span style={{ fontSize: 100 }}>{currentItem.emoji}</span>
            </motion.div>
          ) : (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="font-body text-2xl"
              style={{ color: 'var(--text-muted)' }}
            >
              Maak je klaar...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display font-bold text-lg"
              style={{ color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--hint-color)' }}
            >
              {feedback === 'correct' ? 'Goed gevangen!' : 'Alleen bij de ster tikken!'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div
        className="flex justify-center gap-6 pb-6 font-body text-sm"
        style={{ color: 'var(--text-muted)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span>{'\u2705'} {hits}</span>
        <span>{'\u274C'} {falseAlarms}</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Hoofd-component: BrainGamesPage
// ═══════════════════════════════════════════════════════════════

interface GameInfo {
  id: string
  emoji: string
  name: string
  description: string
  color: string
  Component: React.FC<GameProps>
}

const GAMES: GameInfo[] = [
  {
    id: 'stopspel',
    emoji: '\uD83D\uDED1',
    name: 'StopSpel',
    description: 'Impulscontrole: tik alleen bij de juiste vorm!',
    color: '#D64545',
    Component: StopSpel,
  },
  {
    id: 'onthoudreeks',
    emoji: '\uD83E\uDDE0',
    name: 'OnthoudReeks',
    description: 'Werkgeheugen: onthoud wat je eerder zag',
    color: '#9B7CC8',
    Component: OnthoudReeks,
  },
  {
    id: 'kleurwar',
    emoji: '\uD83C\uDFA8',
    name: 'KleurWar',
    description: 'Cognitieve controle: negeer het woord, kies de kleur!',
    color: '#4488CC',
    Component: KleurWar,
  },
  {
    id: 'reeksonthoud',
    emoji: '\uD83D\uDD32',
    name: 'ReeksOnthoud',
    description: 'Visueel werkgeheugen: onthoud de volgorde',
    color: '#7BAFA3',
    Component: ReeksOnthoud,
  },
  {
    id: 'visvanger',
    emoji: '\uD83D\uDC1F',
    name: 'VisVanger',
    description: 'Aandacht filteren: welke kant kijkt de middelste vis?',
    color: '#44AA55',
    Component: VisVanger,
  },
  {
    id: 'focushouder',
    emoji: '\uD83C\uDFAF',
    name: 'FocusHouder',
    description: 'Volgehouden aandacht: vang alleen de sterren!',
    color: '#F2C94C',
    Component: FocusHouder,
  },
]

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Makkelijk', emoji: '\uD83C\uDF1F' },
  { value: 2, label: 'Gemiddeld', emoji: '\uD83D\uDD25' },
  { value: 3, label: 'Moeilijk', emoji: '\uD83D\uDCAA' },
]

export function BrainGamesPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState(1)

  const ActiveComponent = GAMES.find((g) => g.id === activeGame)?.Component

  if (ActiveComponent) {
    return (
      <ActiveComponent
        onBack={() => setActiveGame(null)}
        difficulty={difficulty}
      />
    )
  }

  return (
    <div
      className="min-h-screen px-5 pt-6 pb-24"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1
          className="font-display font-bold"
          style={{ fontSize: 'var(--font-size-heading)', color: 'var(--text-primary)' }}
        >
          Breintraining {'\uD83E\uDDE0'}
        </h1>
        <p className="font-body text-base mt-1" style={{ color: 'var(--text-muted)' }}>
          Train je brein met leuke spelletjes!
        </p>
      </motion.div>

      {/* Difficulty selector */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--border-color)',
        }}
      >
        <p
          className="font-body font-semibold text-sm mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Moeilijkheid
        </p>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(opt.value)}
              className="flex-1 py-3 rounded-xl font-display font-bold text-base"
              style={{
                background:
                  difficulty === opt.value ? '#9B7CC8' : 'var(--bg-surface)',
                color: difficulty === opt.value ? 'white' : 'var(--text-muted)',
                border: `2px solid ${
                  difficulty === opt.value ? '#9B7CC8' : 'transparent'
                }`,
                minHeight: 48,
              }}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game grid — 2x3 */}
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game, i) => (
          <motion.button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-2xl p-4 text-left flex flex-col gap-2"
            style={{
              background: 'var(--bg-card)',
              border: `2px solid ${game.color}22`,
              borderLeft: `4px solid ${game.color}`,
              minHeight: 120,
            }}
          >
            <span className="text-3xl">{game.emoji}</span>
            <span
              className="font-display font-bold text-base leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {game.name}
            </span>
            <span
              className="font-body text-xs leading-snug"
              style={{ color: 'var(--text-muted)' }}
            >
              {game.description}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default BrainGamesPage
