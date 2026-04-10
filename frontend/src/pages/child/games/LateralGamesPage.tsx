/**
 * Lateralisatie Spelletjes — 6 interactieve spelletjes voor links-rechts discriminatie
 *
 * Spelletjes:
 * 1. LinksRechts      — Links of rechts? (richtingsherkenning)
 * 2. SpiegelMatch     — Spiegelbeeld (mirror matching)
 * 3. RichtingVolgen   — Richting volgen (instructie-opvolging)
 * 4. LichaamsKaart    — Lichaamsdelen (links/rechts op het lichaam)
 * 5. PadVolger        — Pad volgen (grid-navigatie)
 * 6. SymmetrieTekenaar — Symmetrie (spiegelpatroon tekenen)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { api } from '../../../lib/api'
import { soundTap, feedbackCorrect, feedbackWrong, feedbackWin, isMuted, toggleMute } from '../../../lib/sounds'

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
      sourceType: 'lateral_game',
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
        color: ['#E8734A', '#F2C94C', '#7BAFA3', '#5B8C5A', '#A8C5D6'][i % 5],
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
}: {
  score: number
  maxScore: number
  gameName: string
  onBack: () => void
  childId: string
  onReplay?: () => void
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
              background: 'var(--accent-primary)',
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
            background: onReplay ? 'var(--bg-surface)' : 'var(--accent-primary)',
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

/** Score-teller rechtsboven */
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

/** Ronde-indicator */
function RoundIndicator({ current, total }: { current: number; total: number }) {
  return (
    <span
      className="font-body font-semibold text-sm px-3 py-1 rounded-full"
      style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
    >
      {current}/{total}
    </span>
  )
}

/** Overslaan-knop */
function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-body text-sm underline mt-2"
      style={{ color: 'var(--text-muted)', minHeight: 44 }}
    >
      Overslaan {'\u2192'}
    </button>
  )
}

/** Spel-header bar */
function GameHeader({
  title,
  score,
  current,
  total,
  onBack,
}: {
  title: string
  score: number
  current: number
  total: number
  onBack: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onBack}
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-surface)', minWidth: 40, minHeight: 40 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
        {title}
      </span>
      <div className="flex items-center gap-2">
        <RoundIndicator current={current} total={total} />
        <MuteButton />
      </div>
    </div>
  )
}

// Shared game props
interface GameProps {
  onBack: () => void
  difficulty: number // 1, 2, 3
}

// ═══════════════════════════════════════════════════════════════
// 1. LinksRechts — Links of Rechts?
// ═══════════════════════════════════════════════════════════════

interface LRItem {
  direction: 'links' | 'rechts'
  label: string
  color: string
  shape: 'arrow' | 'hand' | 'triangle' | 'car' | 'stroop'
  stroopText?: string // Voor stroop-items: misleidende tekst
}

// SVG renderer — 100% platform-onafhankelijk, geen emoji's
function LRShape({ item, size = 96 }: { item: LRItem; size?: number }) {
  const isLeft = item.direction === 'links'
  const flip = isLeft ? '' : ' scale(-1,1)'
  const cx = size / 2

  if (item.shape === 'stroop') {
    // Tekst zegt iets anders dan de pijl
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.3, fontWeight: 800, color: item.color, fontFamily: 'var(--font-display)' }}>
          {item.stroopText}
        </div>
        <svg width={size} height={size * 0.5} viewBox={`0 0 ${size} ${size * 0.5}`}>
          <polygon
            points={`${isLeft ? 10 : size - 10},${size * 0.25} ${isLeft ? size - 10 : 10},${size * 0.1} ${isLeft ? size - 10 : 10},${size * 0.4}`}
            fill={item.color}
          />
        </svg>
      </div>
    )
  }

  if (item.shape === 'arrow') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g transform={`translate(50,50)${flip}`}>
          <polygon points="-40,0 10,-30 10,-12 40,-12 40,12 10,12 10,30" fill={item.color} />
        </g>
      </svg>
    )
  }

  if (item.shape === 'triangle') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g transform={`translate(50,50)${flip}`}>
          <polygon points="-35,0 25,-30 25,30" fill={item.color} />
        </g>
      </svg>
    )
  }

  if (item.shape === 'hand') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g transform={`translate(50,50)${flip}`}>
          {/* Simpele wijzende hand */}
          <rect x="-10" y="-6" width="40" height="12" rx="6" fill={item.color} />
          <polygon points="-10,0 -30,-15 -30,15" fill={item.color} />
          {/* Vingers-suggestie */}
          <circle cx="-28" cy="0" r="4" fill={item.color} />
        </g>
      </svg>
    )
  }

  if (item.shape === 'car') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g transform={`translate(50,50)${flip}`}>
          {/* Auto body */}
          <rect x="-35" y="-10" width="70" height="20" rx="8" fill={item.color} />
          <rect x="-20" y="-22" width="35" height="16" rx="5" fill={item.color} />
          {/* Wielen */}
          <circle cx="-20" cy="14" r="7" fill="#333" />
          <circle cx="20" cy="14" r="7" fill="#333" />
          {/* Richting indicator */}
          <polygon points="-38,-2 -48,-2 -48,2 -38,2" fill={item.color} opacity="0.5" />
        </g>
      </svg>
    )
  }

  // Fallback
  return <svg width={size} height={size}><text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="60">{isLeft ? '←' : '→'}</text></svg>
}

const COLORS = ['#E8734A', '#2E8BC0', '#5B8C5A', '#9B7CC8', '#D4973B']

function makeLR(direction: 'links' | 'rechts', shape: LRItem['shape'], label: string, color?: string, stroopText?: string): LRItem {
  return { direction, shape, label, color: color ?? pickRandom(COLORS), stroopText }
}

const LR_ITEMS_EASY: LRItem[] = [
  makeLR('links', 'arrow', 'Pijl', '#E8734A'),
  makeLR('rechts', 'arrow', 'Pijl', '#E8734A'),
  makeLR('links', 'arrow', 'Pijl', '#2E8BC0'),
  makeLR('rechts', 'arrow', 'Pijl', '#2E8BC0'),
  makeLR('links', 'triangle', 'Driehoek', '#5B8C5A'),
  makeLR('rechts', 'triangle', 'Driehoek', '#5B8C5A'),
]

const LR_ITEMS_MEDIUM: LRItem[] = [
  makeLR('links', 'hand', 'Hand', '#E8734A'),
  makeLR('rechts', 'hand', 'Hand', '#E8734A'),
  makeLR('links', 'car', 'Auto', '#2E8BC0'),
  makeLR('rechts', 'car', 'Auto', '#2E8BC0'),
  makeLR('links', 'hand', 'Hand', '#9B7CC8'),
  makeLR('rechts', 'hand', 'Hand', '#9B7CC8'),
  makeLR('links', 'arrow', 'Pijl', '#D4973B'),
  makeLR('rechts', 'arrow', 'Pijl', '#D4973B'),
]

const LR_ITEMS_HARD: LRItem[] = [
  // Stroop: tekst zegt iets anders dan de pijl
  makeLR('links', 'stroop', 'Stroop', '#E8734A', 'RECHTS'),
  makeLR('rechts', 'stroop', 'Stroop', '#2E8BC0', 'LINKS'),
  makeLR('links', 'stroop', 'Stroop', '#5B8C5A', 'RECHTS'),
  makeLR('rechts', 'stroop', 'Stroop', '#9B7CC8', 'LINKS'),
  // Gewone items met afleiding
  makeLR('links', 'car', 'Auto', '#D4973B'),
  makeLR('rechts', 'car', 'Auto', '#E8734A'),
  makeLR('links', 'hand', 'Hand', '#2E8BC0'),
  makeLR('rechts', 'hand', 'Hand', '#5B8C5A'),
]

function LinksRechts({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const TOTAL_ROUNDS = 15

  const items = useMemo(() => {
    let pool: LRItem[] = [...LR_ITEMS_EASY]
    if (difficulty >= 2) pool = [...pool, ...LR_ITEMS_MEDIUM]
    if (difficulty >= 3) pool = [...pool, ...LR_ITEMS_HARD]
    const rounds: LRItem[] = []
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      rounds.push(pickRandom(pool))
    }
    return rounds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const item = items[currentRound]

  const advance = useCallback(() => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setDone(true)
      feedbackWin()
    } else {
      setCurrentRound((r) => r + 1)
      setFeedback(null)
    }
  }, [currentRound])

  const handleAnswer = useCallback(
    (answer: 'links' | 'rechts') => {
      if (feedback) return
      soundTap()
      if (answer === item.direction) {
        setScore((s) => s + 1)
        setFeedback('correct')
        setShowConfetti(true)
        feedbackCorrect()
        setTimeout(() => {
          setShowConfetti(false)
          advance()
        }, 800)
      } else {
        setFeedback('wrong')
        feedbackWrong()
        setTimeout(() => advance(), 1200)
      }
    },
    [feedback, item, advance],
  )

  const handleSkip = useCallback(() => {
    if (feedback) return
    setFeedback('wrong')
    setTimeout(() => advance(), 600)
  }, [feedback, advance])

  const handleReplay = useCallback(() => {
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setDone(false)
    setShowConfetti(false)
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Links of Rechts"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={handleReplay}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-lg mx-auto w-full">
        <GameHeader
          title="Links of Rechts?"
          score={score}
          current={currentRound + 1}
          total={TOTAL_ROUNDS}
          onBack={onBack}
        />

        <div className="flex justify-center mb-2">
          <ScoreDisplay score={score} />
        </div>

        <ConfettiBurst active={showConfetti} />

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <p
            className="font-display font-bold text-xl mb-6 text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            Wijst dit naar LINKS of RECHTS?
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${gameKey}-${currentRound}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center justify-center mb-8"
            >
              <LRShape item={item} size={120} />
            </motion.div>
          </AnimatePresence>

          {/* Feedback text */}
          <AnimatePresence>
            {feedback === 'wrong' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-body text-center text-base mb-4"
                style={{ color: 'var(--hint-color)' }}
              >
                Dit was naar {item.direction.toUpperCase()}!
              </motion.p>
            )}
          </AnimatePresence>

          {/* Answer buttons */}
          <div className="flex gap-4 w-full max-w-sm">
            <motion.button
              whileTap={!feedback ? { scale: 0.93 } : {}}
              onClick={() => handleAnswer('links')}
              disabled={!!feedback}
              className="flex-1 font-display font-bold text-xl py-6 rounded-2xl flex items-center justify-center gap-2"
              style={{
                background:
                  feedback === 'correct' && item.direction === 'links'
                    ? 'var(--accent-success)'
                    : feedback === 'wrong' && item.direction !== 'links'
                    ? 'var(--bg-surface)'
                    : 'var(--bg-card)',
                color:
                  feedback === 'correct' && item.direction === 'links'
                    ? 'white'
                    : 'var(--text-primary)',
                border: `2px solid ${
                  feedback && item.direction === 'links'
                    ? 'var(--accent-success)'
                    : 'var(--border-color)'
                }`,
                minHeight: 64,
                opacity: feedback && item.direction !== 'links' ? 0.5 : 1,
              }}
            >
              {'\u2B05'} LINKS
            </motion.button>

            <motion.button
              whileTap={!feedback ? { scale: 0.93 } : {}}
              onClick={() => handleAnswer('rechts')}
              disabled={!!feedback}
              className="flex-1 font-display font-bold text-xl py-6 rounded-2xl flex items-center justify-center gap-2"
              style={{
                background:
                  feedback === 'correct' && item.direction === 'rechts'
                    ? 'var(--accent-success)'
                    : feedback === 'wrong' && item.direction !== 'rechts'
                    ? 'var(--bg-surface)'
                    : 'var(--bg-card)',
                color:
                  feedback === 'correct' && item.direction === 'rechts'
                    ? 'white'
                    : 'var(--text-primary)',
                border: `2px solid ${
                  feedback && item.direction === 'rechts'
                    ? 'var(--accent-success)'
                    : 'var(--border-color)'
                }`,
                minHeight: 64,
                opacity: feedback && item.direction !== 'rechts' ? 0.5 : 1,
              }}
            >
              RECHTS {'\u27A1'}
            </motion.button>
          </div>

          <SkipButton onClick={handleSkip} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. SpiegelMatch — Spiegelbeeld
// ═══════════════════════════════════════════════════════════════

type GridPattern = boolean[][]

function generateGrid(size: number, filled: number): GridPattern {
  const grid: GridPattern = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  )
  let count = 0
  const positions: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push([r, c])
    }
  }
  const shuffled = shuffle(positions)
  for (const [r, c] of shuffled) {
    if (count >= filled) break
    grid[r][c] = true
    count++
  }
  return grid
}

function mirrorGrid(grid: GridPattern): GridPattern {
  return grid.map((row) => [...row].reverse())
}

function rotateGrid(grid: GridPattern): GridPattern {
  const size = grid.length
  const result: GridPattern = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  )
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      result[c][size - 1 - r] = grid[r][c]
    }
  }
  return result
}

function gridsEqual(a: GridPattern, b: GridPattern): boolean {
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false
    }
  }
  return true
}

const MIRROR_COLORS = ['#E8734A', '#7BAFA3', '#F2C94C', '#5B8C5A', '#A8C5D6']

function MiniGrid({
  grid,
  size,
  cellSize,
  colorIdx,
  onClick,
  highlight,
}: {
  grid: GridPattern
  size: number
  cellSize: number
  colorIdx: number
  onClick?: () => void
  highlight?: 'correct' | 'wrong' | null
}) {
  const color = MIRROR_COLORS[colorIdx % MIRROR_COLORS.length]
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className="rounded-xl overflow-hidden"
      style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
        gap: 2,
        padding: 4,
        background: highlight === 'correct'
          ? 'rgba(91,140,90,0.2)'
          : highlight === 'wrong'
          ? 'rgba(168,197,214,0.2)'
          : 'var(--bg-card)',
        border: highlight === 'correct'
          ? '3px solid var(--accent-success)'
          : highlight === 'wrong'
          ? '3px solid var(--hint-color)'
          : '2px solid var(--border-color)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 3,
              background: cell ? color : 'var(--bg-surface)',
            }}
          />
        )),
      )}
    </motion.div>
  )
}

function SpiegelMatch({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const TOTAL_ROUNDS = 10

  const gridSize = difficulty >= 3 ? 4 : 3
  const filledCount = difficulty >= 3 ? rand(4, 6) : difficulty >= 2 ? rand(3, 5) : rand(2, 4)
  const numOptions = difficulty >= 3 ? 4 : 3

  const rounds = useMemo(() => {
    return Array.from({ length: TOTAL_ROUNDS }, () => {
      const original = generateGrid(gridSize, filledCount)
      const mirror = mirrorGrid(original)

      // Generate distractors (rotated or random patterns)
      const distractors: GridPattern[] = []
      const rotated = rotateGrid(original)
      if (!gridsEqual(rotated, mirror)) {
        distractors.push(rotated)
      }

      while (distractors.length < numOptions - 1) {
        const fake = generateGrid(gridSize, filledCount)
        if (!gridsEqual(fake, mirror) && !distractors.some((d) => gridsEqual(d, fake))) {
          distractors.push(fake)
        }
      }

      const correctIdx = rand(0, numOptions - 1)
      const options: GridPattern[] = []
      let distIdx = 0
      for (let i = 0; i < numOptions; i++) {
        if (i === correctIdx) {
          options.push(mirror)
        } else {
          options.push(distractors[distIdx++])
        }
      }

      return { original, options, correctIdx }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const round = rounds[currentRound]

  const advance = useCallback(() => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setDone(true)
      feedbackWin()
    } else {
      setCurrentRound((r) => r + 1)
      setFeedback(null)
      setSelectedIdx(null)
    }
  }, [currentRound])

  const handleAnswer = useCallback(
    (idx: number) => {
      if (feedback) return
      soundTap()
      setSelectedIdx(idx)
      if (idx === round.correctIdx) {
        setScore((s) => s + 1)
        setFeedback('correct')
        setShowConfetti(true)
        feedbackCorrect()
        setTimeout(() => {
          setShowConfetti(false)
          advance()
        }, 800)
      } else {
        setFeedback('wrong')
        feedbackWrong()
        setTimeout(() => advance(), 1200)
      }
    },
    [feedback, round, advance],
  )

  const handleSkip = useCallback(() => {
    if (feedback) return
    setSelectedIdx(round.correctIdx)
    setFeedback('wrong')
    setTimeout(() => advance(), 800)
  }, [feedback, round, advance])

  const handleReplay = useCallback(() => {
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setSelectedIdx(null)
    setDone(false)
    setShowConfetti(false)
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Spiegelbeeld"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={handleReplay}
      />
    )
  }

  const cellSize = gridSize >= 4 ? 28 : 34

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-lg mx-auto w-full overflow-auto">
        <GameHeader
          title="Spiegelbeeld"
          score={score}
          current={currentRound + 1}
          total={TOTAL_ROUNDS}
          onBack={onBack}
        />

        <div className="flex justify-center mb-3">
          <ScoreDisplay score={score} />
        </div>

        <ConfettiBurst active={showConfetti} />

        <p
          className="font-display font-bold text-lg mb-4 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Welk is het spiegelbeeld?
        </p>

        {/* Original pattern */}
        <div className="flex justify-center mb-4">
          <div className="text-center">
            <p className="font-body text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              Origineel
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${gameKey}-${currentRound}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <MiniGrid grid={round.original} size={gridSize} cellSize={cellSize} colorIdx={currentRound} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mirror line */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
            {'\uD83E\uDE9E'} spiegellijn
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
        </div>

        {/* Options */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          {round.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx
            const isCorrectOpt = idx === round.correctIdx
            let highlight: 'correct' | 'wrong' | null = null
            if (feedback && isSelected && isCorrectOpt) highlight = 'correct'
            if (feedback && isSelected && !isCorrectOpt) highlight = 'wrong'
            if (feedback && !isSelected && isCorrectOpt) highlight = 'correct'

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: feedback && !isSelected && !isCorrectOpt ? 0.4 : 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <MiniGrid
                  grid={opt}
                  size={gridSize}
                  cellSize={cellSize}
                  colorIdx={currentRound}
                  onClick={() => handleAnswer(idx)}
                  highlight={highlight}
                />
              </motion.div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <SkipButton onClick={handleSkip} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. RichtingVolgen — Richting Volgen
// ═══════════════════════════════════════════════════════════════

interface DirectionInstruction {
  direction: 'links' | 'rechts'
  steps: number
}

interface RVRound {
  instructions: DirectionInstruction[]
  startPos: number
  targetPos: number
  lineMin: number
  lineMax: number
}

function generateRVRound(difficulty: number): RVRound {
  const numInstructions = difficulty >= 3 ? 3 : difficulty >= 2 ? 2 : 1
  const instructions: DirectionInstruction[] = []
  let pos = 5 // Start in the middle of a 0-10 line

  for (let i = 0; i < numInstructions; i++) {
    const dir: 'links' | 'rechts' = Math.random() < 0.5 ? 'links' : 'rechts'
    const maxSteps = dir === 'links' ? Math.min(3, pos) : Math.min(3, 10 - pos)
    const steps = Math.max(1, rand(1, Math.max(1, maxSteps)))
    instructions.push({ direction: dir, steps })
    pos += dir === 'rechts' ? steps : -steps
  }

  return {
    instructions,
    startPos: 5,
    targetPos: pos,
    lineMin: 0,
    lineMax: 10,
  }
}

function RichtingVolgen({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const TOTAL_ROUNDS = 8

  const rounds = useMemo(() => {
    return Array.from({ length: TOTAL_ROUNDS }, () => generateRVRound(difficulty))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [characterPos, setCharacterPos] = useState(5)
  const [movesHistory, setMovesHistory] = useState<('links' | 'rechts')[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const round = rounds[currentRound]

  // Total expected moves
  const totalExpectedMoves = round.instructions.reduce((sum, inst) => sum + inst.steps, 0)

  // Reset position each round
  useEffect(() => {
    setCharacterPos(round.startPos)
    setMovesHistory([])
    setSubmitted(false)
  }, [currentRound, round.startPos])

  const advance = useCallback(() => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setDone(true)
      feedbackWin()
    } else {
      setCurrentRound((r) => r + 1)
      setFeedback(null)
    }
  }, [currentRound])

  const handleMove = useCallback(
    (dir: 'links' | 'rechts') => {
      if (feedback || submitted) return
      soundTap()
      const newPos = dir === 'links' ? characterPos - 1 : characterPos + 1
      if (newPos < round.lineMin || newPos > round.lineMax) return
      setCharacterPos(newPos)
      setMovesHistory((h) => [...h, dir])
    },
    [feedback, submitted, characterPos, round.lineMin, round.lineMax],
  )

  const handleSubmit = useCallback(() => {
    if (feedback || submitted) return
    setSubmitted(true)
    if (characterPos === round.targetPos) {
      setScore((s) => s + 1)
      setFeedback('correct')
      setShowConfetti(true)
      feedbackCorrect()
      setTimeout(() => {
        setShowConfetti(false)
        advance()
      }, 1000)
    } else {
      setFeedback('wrong')
      feedbackWrong()
      setTimeout(() => {
        setCharacterPos(round.targetPos) // Show correct answer
        setTimeout(() => advance(), 800)
      }, 800)
    }
  }, [feedback, submitted, characterPos, round.targetPos, advance])

  const handleSkip = useCallback(() => {
    if (feedback) return
    setCharacterPos(round.targetPos)
    setSubmitted(true)
    setFeedback('wrong')
    setTimeout(() => advance(), 800)
  }, [feedback, round.targetPos, advance])

  const handleReplay = useCallback(() => {
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setDone(false)
    setShowConfetti(false)
    setSubmitted(false)
    setMovesHistory([])
    setCharacterPos(5)
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Richting Volgen"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={handleReplay}
      />
    )
  }

  const instructionText = round.instructions
    .map((inst, i) => {
      const prefix = i === 0 ? 'Ga' : 'dan'
      return `${prefix} ${inst.steps} ${inst.steps === 1 ? 'stap' : 'stappen'} naar ${inst.direction.toUpperCase()}`
    })
    .join(', ')

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-lg mx-auto w-full">
        <GameHeader
          title="Richting Volgen"
          score={score}
          current={currentRound + 1}
          total={TOTAL_ROUNDS}
          onBack={onBack}
        />

        <div className="flex justify-center mb-3">
          <ScoreDisplay score={score} />
        </div>

        <ConfettiBurst active={showConfetti} />

        {/* Instruction */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${gameKey}-${currentRound}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-4 mb-6 text-center"
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--accent-secondary)',
            }}
          >
            <p
              className="font-display font-bold text-lg"
              style={{ color: 'var(--text-primary)' }}
            >
              {instructionText}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Number line */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm px-2">
            {/* The character */}
            <div className="relative h-16 mb-2">
              <motion.div
                animate={{ left: `${(characterPos / (round.lineMax - round.lineMin)) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute -translate-x-1/2 text-4xl"
                style={{ bottom: 0 }}
              >
                {'\uD83D\uDEB6'}
              </motion.div>
            </div>

            {/* Number line visual */}
            <div className="relative">
              <div
                className="w-full rounded-full"
                style={{ height: 6, background: 'var(--border-color)' }}
              />
              <div className="flex justify-between mt-1">
                {Array.from({ length: round.lineMax - round.lineMin + 1 }, (_, i) => i + round.lineMin).map(
                  (n) => (
                    <div key={n} className="flex flex-col items-center" style={{ width: 24 }}>
                      <div
                        className="rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background:
                            n === round.startPos
                              ? 'var(--accent-secondary)'
                              : n === round.targetPos && feedback
                              ? 'var(--accent-success)'
                              : 'var(--border-color)',
                          marginTop: -7,
                        }}
                      />
                      <span
                        className="font-body text-xs font-semibold mt-1"
                        style={{
                          color:
                            n === characterPos
                              ? 'var(--accent-primary)'
                              : 'var(--text-muted)',
                        }}
                      >
                        {n}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback === 'wrong' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-body text-center text-base mt-4"
                style={{ color: 'var(--hint-color)' }}
              >
                Het juiste antwoord was positie {round.targetPos}!
              </motion.p>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex gap-4 mt-8 w-full max-w-xs items-center justify-center">
            <motion.button
              whileTap={!feedback && !submitted ? { scale: 0.9 } : {}}
              onClick={() => handleMove('links')}
              disabled={!!feedback || submitted || characterPos <= round.lineMin}
              className="font-display font-bold text-2xl rounded-2xl flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '2px solid var(--border-color)',
                opacity: !!feedback || submitted || characterPos <= round.lineMin ? 0.4 : 1,
              }}
            >
              {'\u2B05'}
            </motion.button>

            <motion.button
              whileTap={!feedback && !submitted ? { scale: 0.93 } : {}}
              onClick={handleSubmit}
              disabled={!!feedback || submitted}
              className="font-display font-bold text-lg rounded-2xl px-6"
              style={{
                height: 56,
                background:
                  feedback === 'correct'
                    ? 'var(--accent-success)'
                    : 'var(--accent-primary)',
                color: 'white',
                minWidth: 80,
                opacity: !!feedback || submitted ? 0.7 : 1,
              }}
            >
              {feedback === 'correct' ? '\u2714' : 'OK!'}
            </motion.button>

            <motion.button
              whileTap={!feedback && !submitted ? { scale: 0.9 } : {}}
              onClick={() => handleMove('rechts')}
              disabled={!!feedback || submitted || characterPos >= round.lineMax}
              className="font-display font-bold text-2xl rounded-2xl flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '2px solid var(--border-color)',
                opacity: !!feedback || submitted || characterPos >= round.lineMax ? 0.4 : 1,
              }}
            >
              {'\u27A1'}
            </motion.button>
          </div>

          <p className="font-body text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Stappen gezet: {movesHistory.length} / {totalExpectedMoves}
          </p>

          <SkipButton onClick={handleSkip} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. LichaamsKaart — Lichaamsdelen
// ═══════════════════════════════════════════════════════════════

interface BodyZone {
  id: string
  labelFront: string
  labelBack: string
  // Positions as percentages (for the SVG figure)
  x: number
  y: number
  // Which "real" side of the body this is (left = person's actual left)
  side: 'links' | 'rechts'
}

const BODY_ZONES: BodyZone[] = [
  { id: 'linkerhand', labelFront: 'Linkerhand', labelBack: 'Linkerhand', x: 82, y: 55, side: 'links' },
  { id: 'rechterhand', labelFront: 'Rechterhand', labelBack: 'Rechterhand', x: 18, y: 55, side: 'rechts' },
  { id: 'linkervoet', labelFront: 'Linkervoet', labelBack: 'Linkervoet', x: 60, y: 92, side: 'links' },
  { id: 'rechtervoet', labelFront: 'Rechtervoet', labelBack: 'Rechtervoet', x: 40, y: 92, side: 'rechts' },
  { id: 'linkeroog', labelFront: 'Linkeroog', labelBack: 'Linkeroog', x: 58, y: 16, side: 'links' },
  { id: 'rechteroog', labelFront: 'Rechteroog', labelBack: 'Rechteroog', x: 42, y: 16, side: 'rechts' },
  { id: 'linkeroor', labelFront: 'Linkeroor', labelBack: 'Linkeroor', x: 68, y: 14, side: 'links' },
  { id: 'rechteroor', labelFront: 'Rechteroor', labelBack: 'Rechteroor', x: 32, y: 14, side: 'rechts' },
]

// When viewed from front: person's left is on viewer's RIGHT side.
// When viewed from back: person's left is on viewer's LEFT side.
// At easy difficulty, show from back (same-side logic).
// At hard difficulty, show from front (mirrored logic).

interface LKRound {
  zoneId: string
  instruction: string
  fromFront: boolean
}

function generateLKRounds(difficulty: number): LKRound[] {
  const fromFront = difficulty >= 3
  const mixedView = difficulty >= 2

  const rounds: LKRound[] = []
  const zones = shuffle([...BODY_ZONES])

  for (let i = 0; i < 12; i++) {
    const zone = zones[i % zones.length]
    const thisFromFront = mixedView ? Math.random() < 0.5 : fromFront
    const label = thisFromFront ? zone.labelFront : zone.labelBack
    rounds.push({
      zoneId: zone.id,
      instruction: `Tik op de ${label.toUpperCase()}`,
      fromFront: thisFromFront,
    })
  }
  return rounds
}

/** Simple stick figure SVG */
function StickFigure({
  fromFront,
  zones,
  tappedZone,
  correctZone,
  feedback,
  onTapZone,
}: {
  fromFront: boolean
  zones: BodyZone[]
  tappedZone: string | null
  correctZone: string
  feedback: 'correct' | 'wrong' | null
  onTapZone: (zoneId: string) => void
}) {
  return (
    <div className="relative" style={{ width: 220, height: 340 }}>
      {/* Body SVG */}
      <svg width="220" height="340" viewBox="0 0 220 340" fill="none">
        {/* Head */}
        <circle cx="110" cy="45" r="30" stroke="var(--text-primary)" strokeWidth="3" fill="var(--bg-card)" />

        {/* Face indicator */}
        {fromFront ? (
          <>
            {/* Eyes */}
            <circle cx="100" cy="40" r="3" fill="var(--text-primary)" />
            <circle cx="120" cy="40" r="3" fill="var(--text-primary)" />
            {/* Mouth */}
            <path d="M 102 55 Q 110 62 118 55" stroke="var(--text-primary)" strokeWidth="2" fill="none" />
          </>
        ) : (
          <>
            {/* Back of head - just hair lines */}
            <path d="M 90 30 Q 110 20 130 30" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
            <path d="M 85 38 Q 110 28 135 38" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
          </>
        )}

        {/* Body */}
        <line x1="110" y1="75" x2="110" y2="190" stroke="var(--text-primary)" strokeWidth="3" />

        {/* Arms */}
        <line x1="110" y1="100" x2="40" y2="170" stroke="var(--text-primary)" strokeWidth="3" />
        <line x1="110" y1="100" x2="180" y2="170" stroke="var(--text-primary)" strokeWidth="3" />

        {/* Hands */}
        <circle cx="40" cy="175" r="8" stroke="var(--text-primary)" strokeWidth="2" fill="var(--bg-card)" />
        <circle cx="180" cy="175" r="8" stroke="var(--text-primary)" strokeWidth="2" fill="var(--bg-card)" />

        {/* Legs */}
        <line x1="110" y1="190" x2="80" y2="290" stroke="var(--text-primary)" strokeWidth="3" />
        <line x1="110" y1="190" x2="140" y2="290" stroke="var(--text-primary)" strokeWidth="3" />

        {/* Feet */}
        <ellipse cx="80" cy="300" rx="14" ry="8" stroke="var(--text-primary)" strokeWidth="2" fill="var(--bg-card)" />
        <ellipse cx="140" cy="300" rx="14" ry="8" stroke="var(--text-primary)" strokeWidth="2" fill="var(--bg-card)" />

        {/* Direction label */}
        <text x="110" y="335" textAnchor="middle" fill="var(--text-muted)" fontSize="12" fontFamily="var(--font-body)">
          {fromFront ? '(voorkant)' : '(achterkant)'}
        </text>
      </svg>

      {/* Tappable zones */}
      {zones.map((zone) => {
        // When viewing from front, person's left appears on OUR right.
        // When viewing from back, person's left appears on OUR left.
        // The zone x/y is defined for FRONT view where person's left = our right.
        // For BACK view, we mirror the x position.
        const displayX = fromFront ? zone.x : (100 - zone.x) + 0
        // Remap: for back view, left side (x=82) -> x=18, right side (x=18) -> x=82
        const finalX = fromFront ? zone.x : 100 - zone.x
        const isTapped = tappedZone === zone.id
        const isCorrect = zone.id === correctZone
        const showGreen = feedback === 'correct' && isCorrect
        const showHint = feedback === 'wrong' && isTapped && !isCorrect
        const showCorrectHighlight = feedback === 'wrong' && isCorrect

        return (
          <motion.button
            key={zone.id}
            onClick={() => onTapZone(zone.id)}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: `${finalX}%`,
              top: `${zone.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 36,
              height: 36,
              background: showGreen
                ? 'rgba(91,140,90,0.5)'
                : showHint
                ? 'rgba(168,197,214,0.5)'
                : showCorrectHighlight
                ? 'rgba(91,140,90,0.3)'
                : 'rgba(232,115,74,0.08)',
              border: showGreen
                ? '3px solid var(--accent-success)'
                : showHint
                ? '3px solid var(--hint-color)'
                : showCorrectHighlight
                ? '3px dashed var(--accent-success)'
                : '2px dashed var(--accent-secondary)',
              zIndex: 10,
            }}
            whileTap={!feedback ? { scale: 0.85 } : {}}
            animate={
              showHint
                ? { x: [-3, 3, -3, 3, 0] }
                : showGreen
                ? { scale: [1, 1.2, 1] }
                : {}
            }
          />
        )
      })}
    </div>
  )
}

function LichaamsKaart({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const TOTAL_ROUNDS = 12

  const rounds = useMemo(
    () => generateLKRounds(difficulty),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty, gameKey],
  )

  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [tappedZone, setTappedZone] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hintText, setHintText] = useState<string | null>(null)

  const round = rounds[currentRound]

  const advance = useCallback(() => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setDone(true)
      feedbackWin()
    } else {
      setCurrentRound((r) => r + 1)
      setFeedback(null)
      setTappedZone(null)
      setHintText(null)
    }
  }, [currentRound])

  const handleTapZone = useCallback(
    (zoneId: string) => {
      if (feedback) return
      soundTap()
      setTappedZone(zoneId)

      if (zoneId === round.zoneId) {
        setScore((s) => s + 1)
        setFeedback('correct')
        setShowConfetti(true)
        feedbackCorrect()
        setTimeout(() => {
          setShowConfetti(false)
          advance()
        }, 900)
      } else {
        // Show hint with what they actually tapped
        const tappedBodyPart = BODY_ZONES.find((z) => z.id === zoneId)
        const label = round.fromFront ? tappedBodyPart?.labelFront : tappedBodyPart?.labelBack
        setHintText(`Dat is de ${label ?? zoneId}, probeer opnieuw!`)
        setFeedback('wrong')
        feedbackWrong()
        // Allow retry after a moment
        setTimeout(() => {
          setFeedback(null)
          setTappedZone(null)
          setHintText(null)
        }, 1500)
      }
    },
    [feedback, round, advance],
  )

  const handleSkip = useCallback(() => {
    if (feedback) return
    setTappedZone(round.zoneId)
    setFeedback('correct') // Just show the correct zone
    setTimeout(() => advance(), 800)
  }, [feedback, round.zoneId, advance])

  const handleReplay = useCallback(() => {
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setTappedZone(null)
    setDone(false)
    setShowConfetti(false)
    setHintText(null)
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Lichaamsdelen"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={handleReplay}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-lg mx-auto w-full overflow-auto">
        <GameHeader
          title="Lichaamsdelen"
          score={score}
          current={currentRound + 1}
          total={TOTAL_ROUNDS}
          onBack={onBack}
        />

        <div className="flex justify-center mb-2">
          <ScoreDisplay score={score} />
        </div>

        <ConfettiBurst active={showConfetti} />

        {/* Instruction */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${gameKey}-${currentRound}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-4 mb-4 text-center"
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--accent-primary)',
            }}
          >
            <p
              className="font-display font-bold text-lg"
              style={{ color: 'var(--text-primary)' }}
            >
              {round.instruction}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Hint text */}
        <AnimatePresence>
          {hintText && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-body text-center text-base mb-2"
              style={{ color: 'var(--hint-color)' }}
            >
              {hintText}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Body figure */}
        <div className="flex-1 flex items-center justify-center">
          <StickFigure
            fromFront={round.fromFront}
            zones={BODY_ZONES}
            tappedZone={tappedZone}
            correctZone={round.zoneId}
            feedback={feedback}
            onTapZone={handleTapZone}
          />
        </div>

        <div className="flex justify-center mt-2">
          <SkipButton onClick={handleSkip} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. PadVolger — Pad Volgen
// ═══════════════════════════════════════════════════════════════

type Direction = 'up' | 'down' | 'left' | 'right'

const DIR_ARROWS: Record<Direction, string> = {
  up: '\u2191',
  down: '\u2193',
  left: '\u2190',
  right: '\u2192',
}

const DIR_DELTAS: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
}

interface PVRound {
  gridSize: number
  start: [number, number]
  end: [number, number]
  directions: Direction[]
  path: [number, number][] // All cells on the path including start
}

function generatePath(gridSize: number, pathLength: number): PVRound {
  // Try to generate a valid path
  for (let attempt = 0; attempt < 100; attempt++) {
    const startR = rand(0, gridSize - 1)
    const startC = rand(0, gridSize - 1)
    const visited = new Set<string>()
    visited.add(`${startR},${startC}`)

    const path: [number, number][] = [[startR, startC]]
    const directions: Direction[] = []
    let cr = startR, cc = startC

    for (let step = 0; step < pathLength; step++) {
      const possibleDirs: Direction[] = []
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        const [dr, dc] = DIR_DELTAS[dir]
        const nr = cr + dr, nc = cc + dc
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !visited.has(`${nr},${nc}`)) {
          possibleDirs.push(dir)
        }
      }

      if (possibleDirs.length === 0) break

      const dir = pickRandom(possibleDirs)
      const [dr, dc] = DIR_DELTAS[dir]
      cr += dr
      cc += dc
      visited.add(`${cr},${cc}`)
      path.push([cr, cc])
      directions.push(dir)
    }

    if (directions.length >= pathLength) {
      return {
        gridSize,
        start: [startR, startC],
        end: [cr, cc],
        directions,
        path,
      }
    }
  }

  // Fallback simple path
  return {
    gridSize,
    start: [0, 0],
    end: [0, 2],
    directions: ['right', 'right'],
    path: [[0, 0], [0, 1], [0, 2]],
  }
}

function PadVolger({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const TOTAL_ROUNDS = 8
  const GRID_SIZE = 5

  const pathLength = difficulty >= 3 ? rand(6, 8) : difficulty >= 2 ? rand(4, 6) : rand(3, 4)

  const rounds = useMemo(() => {
    return Array.from({ length: TOTAL_ROUNDS }, () => generatePath(GRID_SIZE, pathLength))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [tappedCells, setTappedCells] = useState<[number, number][]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [wrongCell, setWrongCell] = useState<[number, number] | null>(null)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const round = rounds[currentRound]

  // The next expected cell in the path
  const nextExpectedIdx = tappedCells.length + 1 // +1 because path includes start

  useEffect(() => {
    setTappedCells([])
    setWrongCell(null)
  }, [currentRound])

  const advance = useCallback(() => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setDone(true)
      feedbackWin()
    } else {
      setCurrentRound((r) => r + 1)
      setFeedback(null)
      setWrongCell(null)
    }
  }, [currentRound])

  const handleTapCell = useCallback(
    (r: number, c: number) => {
      if (feedback) return

      // Check if this is the start cell (already shown)
      if (r === round.start[0] && c === round.start[1]) return

      // Check if already tapped
      if (tappedCells.some(([tr, tc]) => tr === r && tc === c)) return

      soundTap()

      // Check if this is the correct next cell
      if (nextExpectedIdx < round.path.length) {
        const [er, ec] = round.path[nextExpectedIdx]
        if (r === er && c === ec) {
          const newTapped = [...tappedCells, [r, c] as [number, number]]
          setTappedCells(newTapped)
          setWrongCell(null)

          // Check if path is complete
          if (nextExpectedIdx === round.path.length - 1) {
            setScore((s) => s + 1)
            setFeedback('correct')
            setShowConfetti(true)
            feedbackCorrect()
            setTimeout(() => {
              setShowConfetti(false)
              advance()
            }, 900)
          }
        } else {
          // Wrong cell
          setWrongCell([r, c])
          feedbackWrong()
          setTimeout(() => setWrongCell(null), 600)
        }
      }
    },
    [feedback, tappedCells, nextExpectedIdx, round, advance],
  )

  const handleSkip = useCallback(() => {
    if (feedback) return
    // Show the full path
    setTappedCells(round.path.slice(1))
    setFeedback('wrong')
    setTimeout(() => advance(), 1000)
  }, [feedback, round, advance])

  const handleReplay = useCallback(() => {
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setTappedCells([])
    setWrongCell(null)
    setDone(false)
    setShowConfetti(false)
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Pad Volgen"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={handleReplay}
      />
    )
  }

  const cellSize = Math.min(56, Math.floor((window.innerWidth - 80) / GRID_SIZE))

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-lg mx-auto w-full overflow-auto">
        <GameHeader
          title="Pad Volgen"
          score={score}
          current={currentRound + 1}
          total={TOTAL_ROUNDS}
          onBack={onBack}
        />

        <div className="flex justify-center mb-3">
          <ScoreDisplay score={score} />
        </div>

        <ConfettiBurst active={showConfetti} />

        {/* Direction instructions */}
        <div
          className="rounded-2xl p-3 mb-4 text-center"
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-secondary)',
          }}
        >
          <p
            className="font-body text-sm mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Volg het pad:
          </p>
          <div className="flex flex-wrap justify-center gap-1">
            {round.directions.map((dir, i) => {
              const isCompleted = i < tappedCells.length
              return (
                <motion.span
                  key={i}
                  className="font-display font-bold text-xl px-2 py-1 rounded-lg"
                  style={{
                    background: isCompleted
                      ? 'rgba(91,140,90,0.15)'
                      : i === tappedCells.length
                      ? 'rgba(232,115,74,0.15)'
                      : 'var(--bg-surface)',
                    color: isCompleted
                      ? 'var(--accent-success)'
                      : i === tappedCells.length
                      ? 'var(--accent-primary)'
                      : 'var(--text-muted)',
                  }}
                  animate={i === tappedCells.length ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  {DIR_ARROWS[dir]}
                </motion.span>
              )
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="rounded-xl overflow-hidden p-1"
            style={{
              display: 'inline-grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
              gap: 3,
              background: 'var(--bg-card)',
              border: '2px solid var(--border-color)',
            }}
          >
            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const isStart = r === round.start[0] && c === round.start[1]
                const isEnd = r === round.end[0] && c === round.end[1]
                const isTapped = tappedCells.some(([tr, tc]) => tr === r && tc === c)
                const isWrong = wrongCell && wrongCell[0] === r && wrongCell[1] === c

                let bg = 'var(--bg-surface)'
                let borderStyle = 'none'
                if (isStart) {
                  bg = 'var(--accent-success)'
                } else if (isEnd) {
                  bg = feedback === 'correct' || (feedback === 'wrong' && isTapped) ? 'var(--accent-primary)' : 'rgba(232,115,74,0.3)'
                  borderStyle = '2px dashed var(--accent-primary)'
                } else if (isTapped) {
                  bg = 'rgba(91,140,90,0.3)'
                }

                return (
                  <motion.button
                    key={`${r}-${c}`}
                    onClick={() => handleTapCell(r, c)}
                    className="rounded-lg flex items-center justify-center font-display font-bold"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: isWrong ? 'rgba(168,197,214,0.4)' : bg,
                      border: borderStyle,
                      fontSize: 18,
                      color: isStart || (isEnd && (feedback === 'correct' || isTapped)) ? 'white' : 'var(--text-primary)',
                    }}
                    animate={isWrong ? { x: [-3, 3, -3, 0] } : {}}
                    whileTap={!feedback && !isStart && !isTapped ? { scale: 0.9 } : {}}
                  >
                    {isStart
                      ? '\uD83D\uDFE2'
                      : isEnd
                      ? '\uD83D\uDD34'
                      : isTapped
                      ? '\u2714'
                      : ''}
                  </motion.button>
                )
              }),
            )}
          </div>
        </div>

        <div className="flex justify-center mt-2">
          <SkipButton onClick={handleSkip} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. SymmetrieTekenaar — Symmetrie
// ═══════════════════════════════════════════════════════════════

function generateSymmetryPattern(gridSize: number, difficulty: number): boolean[][] {
  const halfCols = gridSize / 2
  // Generate left half
  const filledCount = difficulty >= 3 ? rand(5, 8) : difficulty >= 2 ? rand(4, 6) : rand(2, 4)
  const left: boolean[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: halfCols }, () => false),
  )

  const positions: [number, number][] = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < halfCols; c++) {
      positions.push([r, c])
    }
  }

  const chosen = shuffle(positions).slice(0, filledCount)
  for (const [r, c] of chosen) {
    left[r][c] = true
  }

  return left
}

function getExpectedRight(leftPattern: boolean[][]): boolean[][] {
  // Mirror: column 0 on left -> column (halfCols-1) on right, etc.
  const rows = leftPattern.length
  const halfCols = leftPattern[0].length
  const right: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: halfCols }, () => false),
  )
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < halfCols; c++) {
      right[r][halfCols - 1 - c] = leftPattern[r][c]
    }
  }
  return right
}

function SymmetrieTekenaar({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const TOTAL_ROUNDS = 8
  const GRID_SIZE = 6

  const rounds = useMemo(() => {
    return Array.from({ length: TOTAL_ROUNDS }, () => generateSymmetryPattern(GRID_SIZE, difficulty))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [rightPattern, setRightPattern] = useState<boolean[][]>(() =>
    Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE / 2 }, () => false)),
  )
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const leftPattern = rounds[currentRound]
  const expectedRight = useMemo(() => getExpectedRight(leftPattern), [leftPattern])

  // Reset right pattern on round change
  useEffect(() => {
    setRightPattern(
      Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE / 2 }, () => false)),
    )
  }, [currentRound])

  const advance = useCallback(() => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setDone(true)
      feedbackWin()
    } else {
      setCurrentRound((r) => r + 1)
      setFeedback(null)
    }
  }, [currentRound])

  const handleToggleCell = useCallback(
    (r: number, c: number) => {
      if (feedback) return
      soundTap()
      setRightPattern((prev) => {
        const next = prev.map((row) => [...row])
        next[r][c] = !next[r][c]
        return next
      })
    },
    [feedback],
  )

  const handleSubmit = useCallback(() => {
    if (feedback) return

    // Check if right pattern matches expected
    let correct = true
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE / 2; c++) {
        if (rightPattern[r][c] !== expectedRight[r][c]) {
          correct = false
          break
        }
      }
      if (!correct) break
    }

    if (correct) {
      setScore((s) => s + 1)
      setFeedback('correct')
      setShowConfetti(true)
      feedbackCorrect()
      setTimeout(() => {
        setShowConfetti(false)
        advance()
      }, 900)
    } else {
      setFeedback('wrong')
      feedbackWrong()
      // Show the correct answer
      setTimeout(() => {
        setRightPattern(expectedRight)
        setTimeout(() => advance(), 1000)
      }, 600)
    }
  }, [feedback, rightPattern, expectedRight, advance])

  const handleSkip = useCallback(() => {
    if (feedback) return
    setRightPattern(expectedRight)
    setFeedback('wrong')
    setTimeout(() => advance(), 1000)
  }, [feedback, expectedRight, advance])

  const handleReplay = useCallback(() => {
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setDone(false)
    setShowConfetti(false)
    setRightPattern(
      Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE / 2 }, () => false)),
    )
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Symmetrie"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={handleReplay}
      />
    )
  }

  const halfCols = GRID_SIZE / 2
  const cellSize = Math.min(44, Math.floor((window.innerWidth - 100) / GRID_SIZE))

  const patternColor = MIRROR_COLORS[currentRound % MIRROR_COLORS.length]

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-lg mx-auto w-full overflow-auto">
        <GameHeader
          title="Symmetrie"
          score={score}
          current={currentRound + 1}
          total={TOTAL_ROUNDS}
          onBack={onBack}
        />

        <div className="flex justify-center mb-3">
          <ScoreDisplay score={score} />
        </div>

        <ConfettiBurst active={showConfetti} />

        <p
          className="font-display font-bold text-lg mb-3 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Maak het spiegelbeeld af!
        </p>

        <p
          className="font-body text-sm mb-4 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          Tik op de vakjes rechts om het patroon te spiegelen
        </p>

        {/* Grid: left (fixed) | mirror line | right (interactive) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-stretch">
            {/* Left half */}
            <div
              style={{
                display: 'inline-grid',
                gridTemplateColumns: `repeat(${halfCols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
                gap: 2,
              }}
            >
              {leftPattern.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`l-${r}-${c}`}
                    className="rounded-sm"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: cell ? patternColor : 'var(--bg-card)',
                      border: `1px solid ${cell ? patternColor : 'var(--border-color)'}`,
                    }}
                  />
                )),
              )}
            </div>

            {/* Mirror line */}
            <div
              className="flex flex-col items-center justify-center mx-1"
              style={{ width: 4 }}
            >
              <div
                style={{
                  width: 3,
                  height: '100%',
                  background: 'var(--accent-secondary)',
                  borderRadius: 2,
                }}
              />
            </div>

            {/* Right half — interactive */}
            <div
              style={{
                display: 'inline-grid',
                gridTemplateColumns: `repeat(${halfCols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
                gap: 2,
              }}
            >
              {rightPattern.map((row, r) =>
                row.map((cell, c) => {
                  const isExpected = expectedRight[r][c]
                  const isCorrectCell = feedback && cell === isExpected
                  const isWrongCell = feedback === 'wrong' && cell !== isExpected

                  return (
                    <motion.button
                      key={`r-${r}-${c}`}
                      onClick={() => handleToggleCell(r, c)}
                      className="rounded-sm"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: cell
                          ? isWrongCell
                            ? 'rgba(168,197,214,0.5)'
                            : patternColor
                          : isWrongCell
                          ? 'rgba(168,197,214,0.2)'
                          : 'var(--bg-card)',
                        border: `1px solid ${
                          isWrongCell
                            ? 'var(--hint-color)'
                            : cell
                            ? patternColor
                            : 'var(--border-color)'
                        }`,
                        cursor: feedback ? 'default' : 'pointer',
                      }}
                      whileTap={!feedback ? { scale: 0.85 } : {}}
                      animate={isWrongCell ? { opacity: [1, 0.5, 1] } : {}}
                      transition={isWrongCell ? { duration: 0.4 } : {}}
                    />
                  )
                }),
              )}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-body text-center text-base mt-2"
              style={{ color: 'var(--hint-color)' }}
            >
              Kijk goed naar de spiegellijn!
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit / Skip */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <motion.button
            whileTap={!feedback ? { scale: 0.95 } : {}}
            onClick={handleSubmit}
            disabled={!!feedback}
            className="font-display font-bold text-lg py-4 px-10 rounded-2xl"
            style={{
              background:
                feedback === 'correct' ? 'var(--accent-success)' : 'var(--accent-primary)',
              color: 'white',
              minHeight: 56,
              minWidth: 160,
              opacity: feedback ? 0.7 : 1,
            }}
          >
            {feedback === 'correct' ? 'Goed zo!' : 'Controleer!'}
          </motion.button>
          <SkipButton onClick={handleSkip} />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Hoofd-component: LateralGamesPage
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
    id: 'links-rechts',
    emoji: '\uD83D\uDC48\uD83D\uDC49',
    name: 'Links of Rechts?',
    description: 'Welke kant wijst dit?',
    color: '#E8734A',
    Component: LinksRechts,
  },
  {
    id: 'spiegel-match',
    emoji: '\uD83E\uDE9E',
    name: 'Spiegelbeeld',
    description: 'Vind het juiste spiegelbeeld',
    color: '#7BAFA3',
    Component: SpiegelMatch,
  },
  {
    id: 'richting-volgen',
    emoji: '\uD83D\uDEB6',
    name: 'Richting Volgen',
    description: 'Volg de aanwijzingen stap voor stap',
    color: '#F2C94C',
    Component: RichtingVolgen,
  },
  {
    id: 'lichaams-kaart',
    emoji: '\uD83E\uDDD1',
    name: 'Lichaamsdelen',
    description: 'Tik op het juiste lichaamsdeel',
    color: '#5B8C5A',
    Component: LichaamsKaart,
  },
  {
    id: 'pad-volger',
    emoji: '\uD83D\uDDFA',
    name: 'Pad Volgen',
    description: 'Volg de pijlen over het raster',
    color: '#D4973B',
    Component: PadVolger,
  },
  {
    id: 'symmetrie',
    emoji: '\uD83E\uDDE9',
    name: 'Symmetrie',
    description: 'Maak het spiegelpatroon af',
    color: '#A8C5D6',
    Component: SymmetrieTekenaar,
  },
]

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Makkelijk', emoji: '\uD83C\uDF1F' },
  { value: 2, label: 'Gemiddeld', emoji: '\uD83D\uDD25' },
  { value: 3, label: 'Moeilijk', emoji: '\uD83D\uDCAA' },
]

export function LateralGamesPage() {
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
          Links & Rechts {'\uD83E\uDDE7'}
        </h1>
        <p className="font-body text-base mt-1" style={{ color: 'var(--text-muted)' }}>
          Oefen met richtingen, spiegelbeelden en lichaamsdelen!
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
                  difficulty === opt.value ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: difficulty === opt.value ? 'white' : 'var(--text-muted)',
                border: `2px solid ${
                  difficulty === opt.value ? 'var(--accent-primary)' : 'transparent'
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

export default LateralGamesPage
