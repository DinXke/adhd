/**
 * Wiskunde Spelletjes — 7 interactieve rekenspellen
 *
 * Spellen:
 * 1. NumberMemory   — Memory kaartspel (som ↔ antwoord)
 * 2. BubblePopMath  — Bubbels knallen die samen een doel maken
 * 3. DragEquation   — Sleep het ontbrekende getal in de som
 * 4. PatternComplete — Maak het getalpatroon af
 * 5. FractionPizza  — Kleur breuken op een pizza
 * 6. SpeedTap       — Beantwoord zo snel mogelijk
 * 7. SplitTree      — Splitsboom (getallen splitsen)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { api } from '../../../lib/api'
import { soundCorrect, soundWrong, soundMatch, soundWin, soundPop, soundFlip, soundTap, soundStreak, feedbackCorrect, feedbackWrong, feedbackWin, soundTick, soundPickup, soundDrop, vibrate, isMuted, toggleMute } from '../../../lib/sounds'

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

/** Returns a readable text color (dark or white) for a given hex background */
function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#3D3229' : '#fff'
}

/** Stuur tokens naar de backend */
async function grantTokens(childId: string, amount: number, note: string) {
  try {
    await api.post(`/api/tokens/${childId}/grant`, {
      amount,
      sourceType: 'math_game',
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
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
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

/** Timer-balk bovenaan een spel */
function TimerBar({
  timeLeft,
  maxTime,
}: {
  timeLeft: number
  maxTime: number
}) {
  const pct = (timeLeft / maxTime) * 100
  const color = pct > 50 ? '#5B8C5A' : pct > 20 ? '#E8734A' : '#C45D4C'

  return (
    <div className="w-full mb-4">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, background: 'var(--border-color)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'linear' }}
        />
      </div>
      <p className="font-body font-semibold text-sm mt-1 text-right" style={{ color }}>
        {timeLeft}s
      </p>
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

// Shared game props
interface GameProps {
  onBack: () => void
  difficulty: number // 1, 2, 3
}

// ═══════════════════════════════════════════════════════════════
// 1. NumberMemory — Memory kaartspel
// ═══════════════════════════════════════════════════════════════

interface MemoryCard {
  id: number
  display: string
  matchGroup: number
  isFlipped: boolean
  isMatched: boolean
}

function generateMemoryPairs(difficulty: number): MemoryCard[] {
  const pairCount = difficulty === 1 ? 6 : difficulty === 2 ? 8 : 10
  const maxNum = difficulty === 1 ? 10 : difficulty === 2 ? 15 : 20
  const pairs: MemoryCard[] = []
  const usedResults = new Set<number>()

  for (let i = 0; i < pairCount; i++) {
    let a: number, b: number, result: number
    do {
      a = rand(1, Math.floor(maxNum / 2))
      b = rand(1, Math.floor(maxNum / 2))
      result = a + b
    } while (usedResults.has(result) || result > maxNum)
    usedResults.add(result)

    pairs.push(
      { id: i * 2, display: `${a} + ${b}`, matchGroup: i, isFlipped: false, isMatched: false },
      { id: i * 2 + 1, display: `${result}`, matchGroup: i, isFlipped: false, isMatched: false },
    )
  }
  return shuffle(pairs)
}

function NumberMemory({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const [cards, setCards] = useState<MemoryCard[]>(() => generateMemoryPairs(difficulty))
  const [flippedIds, setFlippedIds] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [moves, setMoves] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const totalPairs = cards.length / 2

  const handleSkipNumberMemory = useCallback(() => {
    // Reveal all cards briefly, then finish
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: true, isMatched: true })))
    setTimeout(() => setGameOver(true), 1500)
  }, [])

  const resetGame = useCallback(() => {
    setCards(generateMemoryPairs(difficulty))
    setFlippedIds([])
    setMatches(0)
    setMoves(0)
    setShowConfetti(false)
    setIsChecking(false)
    setGameOver(false)
    setGameKey((k) => k + 1)
  }, [difficulty])

  const handleTap = useCallback(
    (id: number) => {
      if (isChecking) return
      const card = cards.find((c) => c.id === id)
      if (!card || card.isFlipped || card.isMatched) return
      if (flippedIds.length >= 2) return

      const newFlipped = [...flippedIds, id]
      setFlippedIds(newFlipped)

      // Flip the card
      soundFlip()
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)))

      if (newFlipped.length === 2) {
        setIsChecking(true)
        setMoves((m) => m + 1)
        const [first, second] = newFlipped
        const c1 = cards.find((c) => c.id === first)!
        const c2 = cards.find((c) => c.id === second)!

        if (c1.matchGroup === c2.matchGroup) {
          // Match!
          soundMatch()
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === first || c.id === second ? { ...c, isMatched: true } : c,
              ),
            )
            setMatches((m) => {
              const next = m + 1
              if (next === totalPairs) {
                feedbackWin()
                setShowConfetti(true)
                setTimeout(() => setGameOver(true), 1500)
              }
              return next
            })
            setFlippedIds([])
            setIsChecking(false)
          }, 600)
        } else {
          // No match — flip back
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === first || c.id === second ? { ...c, isFlipped: false } : c,
              ),
            )
            setFlippedIds([])
            setIsChecking(false)
          }, 900)
        }
      }
    },
    [cards, flippedIds, isChecking, totalPairs],
  )

  if (gameOver) {
    const maxScore = totalPairs
    // Score: fewer moves = better. Perfect = totalPairs moves.
    const efficiency = Math.max(0, Math.round((totalPairs / Math.max(moves, totalPairs)) * totalPairs))
    return (
      <GameEndScreen
        score={efficiency}
        maxScore={maxScore}
        gameName="Reken Memory"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  const cols = cards.length <= 12 ? 4 : cards.length <= 16 ? 4 : 5

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <ConfettiBurst active={showConfetti} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkipNumberMemory} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={matches} label="Paren" />
      </div>

      <p
        className="font-body text-center text-sm mb-2 flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        Vind de som en het antwoord! ({moves} zetten)
      </p>

      {/* Card grid */}
      <div className="flex-1 overflow-auto px-4 pb-4">
      <div
        className="grid gap-2 flex-1 content-start mx-auto w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          maxWidth: 420,
        }}
      >
        {cards.map((card) => (
          <motion.button
            key={card.id}
            onClick={() => handleTap(card.id)}
            className="relative rounded-2xl font-display font-bold flex items-center justify-center"
            style={{
              aspectRatio: '1',
              minHeight: 56,
              perspective: 600,
              cursor: card.isMatched ? 'default' : 'pointer',
            }}
            whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.93 } : {}}
          >
            <motion.div
              animate={{
                rotateY: card.isFlipped || card.isMatched ? 180 : 0,
              }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Front (face-down) */}
              <div
                className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  background: card.isMatched
                    ? 'var(--accent-success)'
                    : 'var(--accent-primary)',
                  border: '2px solid rgba(0,0,0,0.08)',
                  opacity: card.isMatched ? 0.3 : 1,
                }}
              >
                <span className="text-2xl" style={{ color: 'white' }}>?</span>
              </div>

              {/* Back (face-up) */}
              <div
                className="absolute inset-0 rounded-2xl flex items-center justify-center px-1"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: card.isMatched
                    ? 'rgba(91,140,90,0.15)'
                    : 'var(--bg-card)',
                  border: card.isMatched
                    ? '2px solid var(--accent-success)'
                    : '2px solid var(--accent-primary)',
                }}
              >
                <span
                  className="font-display font-bold"
                  style={{
                    fontSize: card.display.length > 4 ? 14 : 18,
                    color: card.isMatched ? 'var(--accent-success)' : 'var(--text-primary)',
                  }}
                >
                  {card.display}
                </span>
              </div>
            </motion.div>
          </motion.button>
        ))}
      </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. BubblePopMath — Bubbels knallen
// ═══════════════════════════════════════════════════════════════

interface Bubble {
  id: number
  value: number
  x: number
  y: number
  size: number
  color: string
  popped: boolean
  shaking: boolean
  speedX: number
  speedY: number
}

function generateBubbleTarget(difficulty: number): { target: number; label: string } {
  if (difficulty === 1) {
    const t = rand(5, 10)
    return { target: t, label: `Tik alle getallen die samen ${t} maken` }
  }
  if (difficulty === 2) {
    const t = rand(10, 15)
    return { target: t, label: `Tik twee bubbels die samen ${t} maken` }
  }
  const t = rand(15, 25)
  return { target: t, label: `Tik twee bubbels die samen ${t} maken` }
}

function generateBubbles(target: number, difficulty: number): Bubble[] {
  const count = difficulty === 1 ? 10 : difficulty === 2 ? 14 : 18
  const colors = ['#E8734A', '#7BAFA3', '#F2C94C', '#5B8C5A', '#A8C5D6']
  const bubbles: Bubble[] = []

  // Ensure at least 3-4 valid pairs exist
  const pairCount = rand(3, 5)
  for (let i = 0; i < pairCount && bubbles.length < count - 2; i++) {
    const a = rand(1, target - 1)
    const b = target - a
    bubbles.push(
      {
        id: bubbles.length,
        value: a,
        x: rand(10, 80),
        y: rand(10, 75),
        size: rand(54, 72),
        color: pickRandom(colors),
        popped: false,
        shaking: false,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.3,
      },
      {
        id: bubbles.length + 1,
        value: b,
        x: rand(10, 80),
        y: rand(10, 75),
        size: rand(54, 72),
        color: pickRandom(colors),
        popped: false,
        shaking: false,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.3,
      },
    )
  }

  // Fill rest with random numbers
  while (bubbles.length < count) {
    bubbles.push({
      id: bubbles.length,
      value: rand(1, target + 5),
      x: rand(10, 80),
      y: rand(10, 75),
      size: rand(54, 72),
      color: pickRandom(colors),
      popped: false,
      shaking: false,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.3,
    })
  }

  return bubbles
}

function BubblePopMath({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const MAX_TIME = 60
  const [gameKey, setGameKey] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MAX_TIME)
  const [score, setScore] = useState(0)
  const [{ target, label }, setTargetInfo] = useState(() => generateBubbleTarget(difficulty))
  const [bubbles, setBubbles] = useState<Bubble[]>(() => generateBubbles(target, difficulty))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(Date.now())

  const resetGame = useCallback(() => {
    const newTarget = generateBubbleTarget(difficulty)
    setTargetInfo(newTarget)
    setBubbles(generateBubbles(newTarget.target, difficulty))
    setTimeLeft(MAX_TIME)
    setScore(0)
    setSelectedId(null)
    setGameOver(false)
    setShowConfetti(false)
    setGameKey((k) => k + 1)
  }, [difficulty])

  const handleSkipBubblePop = useCallback(() => {
    if (gameOver) return
    setTimeLeft(0)
    setGameOver(true)
  }, [gameOver])

  // Timer
  useEffect(() => {
    if (gameOver) return
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          soundWin()
          setGameOver(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [gameOver])

  // Gentle floating animation
  useEffect(() => {
    if (gameOver) return

    const animate = () => {
      const now = Date.now()
      const dt = (now - lastTimeRef.current) / 16 // normalize to ~60fps
      lastTimeRef.current = now

      setBubbles((prev) =>
        prev.map((b) => {
          if (b.popped) return b
          let nx = b.x + b.speedX * dt
          let ny = b.y + b.speedY * dt
          let sx = b.speedX
          let sy = b.speedY

          if (nx < 2 || nx > 88) sx = -sx
          if (ny < 2 || ny > 78) sy = -sy
          nx = Math.max(2, Math.min(88, nx))
          ny = Math.max(2, Math.min(78, ny))

          return { ...b, x: nx, y: ny, speedX: sx, speedY: sy }
        }),
      )
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameOver])

  const handleBubbleTap = useCallback(
    (id: number) => {
      if (gameOver) return
      const bubble = bubbles.find((b) => b.id === id)
      if (!bubble || bubble.popped) return

      if (selectedId === null) {
        setSelectedId(id)
        return
      }

      // Second bubble tapped
      const first = bubbles.find((b) => b.id === selectedId)
      if (!first || first.popped) {
        setSelectedId(id)
        return
      }

      if (first.id === id) {
        setSelectedId(null)
        return
      }

      if (first.value + bubble.value === target) {
        // Correct pair!
        soundPop()
        setScore((s) => s + 1)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 800)
        setBubbles((prev) =>
          prev.map((b) =>
            b.id === first.id || b.id === id ? { ...b, popped: true } : b,
          ),
        )
        // Haptic
        if (navigator.vibrate) navigator.vibrate(50)
      } else {
        // Wrong pair — shake
        feedbackWrong()
        setBubbles((prev) =>
          prev.map((b) =>
            b.id === first.id || b.id === id ? { ...b, shaking: true } : b,
          ),
        )
        setTimeout(() => {
          setBubbles((prev) => prev.map((b) => ({ ...b, shaking: false })))
        }, 500)
      }
      setSelectedId(null)
    },
    [bubbles, selectedId, target, gameOver],
  )

  if (gameOver) {
    const maxScore = Math.floor(bubbles.length / 2)
    return (
      <GameEndScreen
        score={score}
        maxScore={maxScore}
        gameName="Bubbels Knallen"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <ConfettiBurst active={showConfetti} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkipBubblePop} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={score} />
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col">
      <TimerBar timeLeft={timeLeft} maxTime={MAX_TIME} />

      <p
        className="font-display font-bold text-center text-lg mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        {label}
      </p>

      {/* Bubble area */}
      <div
        className="relative flex-1 rounded-3xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--border-color)',
          minHeight: 380,
        }}
      >
        {bubbles.map((bubble) =>
          bubble.popped ? null : (
            <motion.button
              key={bubble.id}
              onClick={() => handleBubbleTap(bubble.id)}
              className="absolute rounded-full font-display font-bold flex items-center justify-center"
              animate={{
                x: bubble.shaking ? [0, -6, 6, -4, 4, 0] : 0,
              }}
              transition={bubble.shaking ? { duration: 0.4 } : {}}
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                width: bubble.size,
                height: bubble.size,
                background: bubble.color,
                color: textColorForBg(bubble.color),
                fontSize: bubble.size > 64 ? 22 : 18,
                border:
                  selectedId === bubble.id
                    ? '4px solid var(--text-primary)'
                    : `3px solid ${textColorForBg(bubble.color) === '#fff' ? 'rgba(255,255,255,0.4)' : 'rgba(61,50,41,0.2)'}`,
                boxShadow:
                  selectedId === bubble.id
                    ? '0 0 0 4px rgba(232,115,74,0.3)'
                    : 'none',
                transform: 'translate(-50%, -50%)',
                zIndex: selectedId === bubble.id ? 10 : 1,
              }}
              whileTap={{ scale: 0.88 }}
            >
              {bubble.value}
            </motion.button>
          ),
        )}

        {/* Pop animations */}
        <AnimatePresence>
          {bubbles
            .filter((b) => b.popped)
            .map((b) => (
              <motion.div
                key={`pop-${b.id}`}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute rounded-full"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: b.size,
                  height: b.size,
                  background: b.color,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              />
            ))}
        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. DragEquation — Sleep de som
// ═══════════════════════════════════════════════════════════════

interface DragRound {
  left: number | null // null = missing
  op: '+' | '-'
  right: number | null // null = missing
  result: number
  answer: number // the missing number
  options: number[]
}

function generateDragRounds(difficulty: number): DragRound[] {
  const count = 10
  const maxVal = difficulty === 1 ? 10 : difficulty === 2 ? 20 : 50
  const rounds: DragRound[] = []

  for (let i = 0; i < count; i++) {
    const op = difficulty >= 2 && Math.random() > 0.5 ? '-' : '+'
    let a: number, b: number, result: number

    if (op === '+') {
      a = rand(1, Math.floor(maxVal * 0.6))
      b = rand(1, Math.floor(maxVal * 0.6))
      result = a + b
    } else {
      result = rand(3, maxVal)
      b = rand(1, result - 1)
      a = result // a - b = result becomes result = a, so a - b gives something
      // Redo: a - b = result => a = result + b
      a = result
      result = a - b
    }

    // Decide which position is missing
    const missingPos = rand(0, 2)
    let answer: number
    let left: number | null = a
    let right: number | null = b
    let displayResult = op === '+' ? a + b : a - b

    if (missingPos === 0) {
      answer = a
      left = null
    } else if (missingPos === 1) {
      answer = b
      right = null
    } else {
      answer = displayResult
      displayResult = -1 // signal that result is missing
    }

    // Generate wrong options
    const opts = new Set<number>([answer])
    while (opts.size < (difficulty === 1 ? 4 : 6)) {
      const wrong = answer + rand(-5, 5)
      if (wrong > 0 && wrong !== answer) opts.add(wrong)
    }

    rounds.push({
      left,
      op,
      right,
      result: displayResult === -1 ? -1 : displayResult,
      answer,
      options: shuffle([...opts]),
    })
  }
  return rounds
}

function DragEquation({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [rounds, setRounds] = useState(() => generateDragRounds(difficulty))
  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [draggedValue, setDraggedValue] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [slotRect, setSlotRect] = useState<DOMRect | null>(null)
  const slotRef = useRef<HTMLDivElement>(null)

  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  const handleSkipDragEquation = () => {
    if (feedback || showSkipAnswer) return
    setShowSkipAnswer(true)
    setTimeout(() => {
      setShowSkipAnswer(false)
      if (currentRound + 1 >= rounds.length) {
        setGameOver(true)
      } else {
        setCurrentRound((r) => r + 1)
      }
    }, 1500)
  }

  const resetGame = useCallback(() => {
    setRounds(generateDragRounds(difficulty))
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setShowConfetti(false)
    setGameOver(false)
    setDraggedValue(null)
    setShowSkipAnswer(false)
  }, [difficulty])

  const round = rounds[currentRound]

  useEffect(() => {
    if (slotRef.current) {
      setSlotRect(slotRef.current.getBoundingClientRect())
    }
  }, [currentRound])

  const handleOptionTap = (value: number) => {
    if (feedback) return
    soundDrop()

    if (value === round.answer) {
      feedbackCorrect()
      setFeedback('correct')
      setScore((s) => s + 1)
      setShowConfetti(true)
      if (navigator.vibrate) navigator.vibrate(50)
      setTimeout(() => {
        setShowConfetti(false)
        setFeedback(null)
        if (currentRound + 1 >= rounds.length) {
          setGameOver(true)
        } else {
          setCurrentRound((r) => r + 1)
        }
      }, 900)
    } else {
      soundWrong()
      setFeedback('wrong')
      setTimeout(() => setFeedback(null), 800)
    }
  }

  if (gameOver) {
    return (
      <GameEndScreen
        score={score}
        maxScore={rounds.length}
        gameName="Sleep de Som"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  const displayLeft = round.left !== null ? round.left : (showSkipAnswer ? round.answer : null)
  const displayRight = round.right !== null ? round.right : (showSkipAnswer ? round.answer : null)
  const displayResult = round.result !== -1 ? round.result : (showSkipAnswer ? round.answer : null)

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <ConfettiBurst active={showConfetti} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkipDragEquation} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <div className="flex items-center gap-2">
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentRound + 1} / {rounds.length}
          </p>
          <ScoreDisplay score={score} />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col">
      {/* Progress dots */}
      <div className="flex gap-1 justify-center mb-6">
        {rounds.map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === currentRound ? 16 : 8,
              height: 8,
              background:
                i < currentRound
                  ? 'var(--accent-success)'
                  : i === currentRound
                  ? 'var(--accent-primary)'
                  : 'var(--border-color)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* Equation display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          {/* Left operand */}
          {displayLeft !== null ? (
            <span
              className="font-display font-bold"
              style={{ fontSize: 48, color: 'var(--text-primary)' }}
            >
              {displayLeft}
            </span>
          ) : (
            <div
              ref={round.left === null ? slotRef : undefined}
              className="rounded-2xl flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                border: `3px dashed ${
                  feedback === 'correct'
                    ? 'var(--accent-success)'
                    : feedback === 'wrong'
                    ? 'var(--hint-color)'
                    : 'var(--accent-primary)'
                }`,
                background:
                  feedback === 'correct'
                    ? 'rgba(91,140,90,0.15)'
                    : 'rgba(232,115,74,0.08)',
              }}
            >
              <span
                className="font-display font-bold"
                style={{
                  fontSize: 36,
                  color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--text-muted)',
                }}
              >
                {feedback === 'correct' ? round.answer : '?'}
              </span>
            </div>
          )}

          {/* Operator */}
          <span
            className="font-display font-bold"
            style={{ fontSize: 36, color: 'var(--accent-secondary)' }}
          >
            {round.op}
          </span>

          {/* Right operand */}
          {displayRight !== null ? (
            <span
              className="font-display font-bold"
              style={{ fontSize: 48, color: 'var(--text-primary)' }}
            >
              {displayRight}
            </span>
          ) : (
            <div
              ref={round.right === null ? slotRef : undefined}
              className="rounded-2xl flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                border: `3px dashed ${
                  feedback === 'correct'
                    ? 'var(--accent-success)'
                    : feedback === 'wrong'
                    ? 'var(--hint-color)'
                    : 'var(--accent-primary)'
                }`,
                background:
                  feedback === 'correct'
                    ? 'rgba(91,140,90,0.15)'
                    : 'rgba(232,115,74,0.08)',
              }}
            >
              <span
                className="font-display font-bold"
                style={{
                  fontSize: 36,
                  color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--text-muted)',
                }}
              >
                {feedback === 'correct' ? round.answer : '?'}
              </span>
            </div>
          )}

          {/* Equals sign */}
          <span
            className="font-display font-bold"
            style={{ fontSize: 36, color: 'var(--text-muted)' }}
          >
            =
          </span>

          {/* Result */}
          {displayResult !== null ? (
            <span
              className="font-display font-bold"
              style={{ fontSize: 48, color: 'var(--text-primary)' }}
            >
              {displayResult}
            </span>
          ) : (
            <div
              ref={round.result === -1 ? slotRef : undefined}
              className="rounded-2xl flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                border: `3px dashed ${
                  feedback === 'correct'
                    ? 'var(--accent-success)'
                    : feedback === 'wrong'
                    ? 'var(--hint-color)'
                    : 'var(--accent-primary)'
                }`,
                background:
                  feedback === 'correct'
                    ? 'rgba(91,140,90,0.15)'
                    : 'rgba(232,115,74,0.08)',
              }}
            >
              <span
                className="font-display font-bold"
                style={{
                  fontSize: 36,
                  color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--text-muted)',
                }}
              >
                {feedback === 'correct' ? round.answer : '?'}
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Hint on wrong */}
      <AnimatePresence>
        {feedback === 'wrong' && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-body text-center text-base mb-4"
            style={{ color: 'var(--hint-color)' }}
          >
            Probeer nog eens! Denk goed na.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Number tiles */}
      <div className="flex flex-wrap gap-3 justify-center mt-auto pt-4">
        {round.options.map((value, i) => (
          <motion.button
            key={`${currentRound}-${i}-${value}`}
            onClick={() => handleOptionTap(value)}
            className="rounded-2xl font-display font-bold flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              background: 'var(--bg-card)',
              border: '2px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 28,
              cursor: feedback ? 'default' : 'pointer',
            }}
            whileTap={!feedback ? { scale: 0.9, rotate: rand(-4, 4) } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {value}
          </motion.button>
        ))}
      </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. PatternComplete — Patroon afmaken
// ═══════════════════════════════════════════════════════════════

interface PatternRound {
  sequence: number[]
  answer: number
  options: number[]
  patternName: string
}

function generatePatternRounds(difficulty: number): PatternRound[] {
  const count = 8
  const rounds: PatternRound[] = []

  const generators: Array<() => { seq: number[]; answer: number; name: string }> = []

  // +N patterns
  if (difficulty >= 1) {
    generators.push(() => {
      const step = rand(2, difficulty === 1 ? 3 : 5)
      const start = rand(1, 10)
      const length = 5
      const seq = Array.from({ length }, (_, i) => start + step * i)
      return { seq, answer: start + step * length, name: `+${step}` }
    })
  }

  // -N patterns
  if (difficulty >= 2) {
    generators.push(() => {
      const step = rand(2, 4)
      const start = rand(30, 50)
      const length = 5
      const seq = Array.from({ length }, (_, i) => start - step * i)
      return { seq, answer: start - step * length, name: `-${step}` }
    })
  }

  // x2 patterns
  if (difficulty >= 1) {
    generators.push(() => {
      const start = rand(1, 3)
      const length = 5
      const seq = Array.from({ length }, (_, i) => start * Math.pow(2, i))
      return { seq, answer: start * Math.pow(2, length), name: 'x2' }
    })
  }

  // Fibonacci-like
  if (difficulty >= 2) {
    generators.push(() => {
      const a = rand(1, 3)
      const b = rand(2, 5)
      const seq = [a, b]
      for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2])
      const answer = seq[seq.length - 1] + seq[seq.length - 2]
      return { seq: seq.slice(0, 5), answer, name: 'fibonacci' }
    })
  }

  // +1, +2, +3, ... growing increment
  if (difficulty >= 2) {
    generators.push(() => {
      const start = rand(1, 5)
      const seq = [start]
      for (let i = 1; i <= 5; i++) seq.push(seq[i - 1] + i)
      const answer = seq[5] + 6
      return { seq: seq.slice(0, 5), answer, name: '+groeiend' }
    })
  }

  // Alternating +a, +b
  if (difficulty >= 3) {
    generators.push(() => {
      const a = rand(2, 4)
      const b = rand(5, 8)
      const start = rand(1, 5)
      const seq = [start]
      for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 === 1 ? a : b))
      const answer = seq[5] + (6 % 2 === 1 ? a : b)
      return { seq: seq.slice(0, 5), answer, name: `+${a}/+${b}` }
    })
  }

  for (let i = 0; i < count; i++) {
    const gen = pickRandom(generators)
    const { seq, answer, name } = gen()

    // Wrong options
    const opts = new Set<number>([answer])
    while (opts.size < 4) {
      const wrong = answer + rand(-6, 6)
      if (wrong >= 0 && wrong !== answer) opts.add(wrong)
    }

    rounds.push({
      sequence: seq,
      answer,
      options: shuffle([...opts]),
      patternName: name,
    })
  }

  return rounds
}

function PatternComplete({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [rounds, setRounds] = useState(() => generatePatternRounds(difficulty))
  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  const handleSkipPattern = () => {
    if (feedback || showSkipAnswer) return
    setShowSkipAnswer(true)
    setSelectedOption(round.answer)
    setTimeout(() => {
      setShowSkipAnswer(false)
      setSelectedOption(null)
      if (currentRound + 1 >= rounds.length) {
        setGameOver(true)
      } else {
        setCurrentRound((r) => r + 1)
      }
    }, 1500)
  }

  const resetGame = useCallback(() => {
    setRounds(generatePatternRounds(difficulty))
    setCurrentRound(0)
    setScore(0)
    setFeedback(null)
    setSelectedOption(null)
    setShowConfetti(false)
    setGameOver(false)
    setShowSkipAnswer(false)
  }, [difficulty])

  const round = rounds[currentRound]

  const handleAnswer = (value: number) => {
    if (feedback || showSkipAnswer) return
    setSelectedOption(value)

    if (value === round.answer) {
      feedbackCorrect()
      setFeedback('correct')
      setScore((s) => s + 1)
      setShowConfetti(true)
      if (navigator.vibrate) navigator.vibrate(50)
      setTimeout(() => {
        setShowConfetti(false)
        setFeedback(null)
        setSelectedOption(null)
        if (currentRound + 1 >= rounds.length) {
          setGameOver(true)
        } else {
          setCurrentRound((r) => r + 1)
        }
      }, 1000)
    } else {
      soundWrong()
      setFeedback('wrong')
      setTimeout(() => {
        setFeedback(null)
        setSelectedOption(null)
      }, 700)
    }
  }

  if (gameOver) {
    return (
      <GameEndScreen
        score={score}
        maxScore={rounds.length}
        gameName="Patroon Afmaken"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <ConfettiBurst active={showConfetti} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkipPattern} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <div className="flex items-center gap-2">
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentRound + 1} / {rounds.length}
          </p>
          <ScoreDisplay score={score} />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col">
      {/* Instruction */}
      <p
        className="font-display font-bold text-center text-xl mb-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Welk getal komt er na?
      </p>

      {/* Sequence display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          className="flex items-center justify-center gap-2 flex-wrap mb-8"
        >
          {round.sequence.map((num, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring' }}
              className="rounded-2xl flex items-center justify-center"
              style={{
                width: 60,
                height: 60,
                background: 'var(--bg-card)',
                border: '2px solid var(--accent-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="font-display font-bold text-xl">{num}</span>
            </motion.div>
          ))}

          {/* Arrow */}
          <span
            className="font-display font-bold text-2xl mx-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            {'\u2192'}
          </span>

          {/* Missing slot */}
          <motion.div
            animate={
              feedback === 'correct'
                ? { scale: [1, 1.15, 1], borderColor: 'var(--accent-success)' }
                : feedback === 'wrong'
                ? { x: [-4, 4, -4, 4, 0] }
                : {}
            }
            className="rounded-2xl flex items-center justify-center"
            style={{
              width: 60,
              height: 60,
              border: `3px dashed ${
                feedback === 'correct'
                  ? 'var(--accent-success)'
                  : 'var(--accent-primary)'
              }`,
              background:
                feedback === 'correct'
                  ? 'rgba(91,140,90,0.15)'
                  : 'rgba(232,115,74,0.08)',
            }}
          >
            <span
              className="font-display font-bold text-xl"
              style={{
                color:
                  feedback === 'correct' ? 'var(--accent-success)' : 'var(--text-muted)',
              }}
            >
              {feedback === 'correct' ? round.answer : '?'}
            </span>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Hint */}
      <AnimatePresence>
        {feedback === 'wrong' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-body text-center text-base mb-4"
            style={{ color: 'var(--hint-color)' }}
          >
            Kijk goed naar het verschil tussen de getallen!
          </motion.p>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4 max-w-xs mx-auto w-full">
        {round.options.map((opt, i) => {
          const isSelected = selectedOption === opt
          const isCorrect = isSelected && feedback === 'correct'
          const isWrong = isSelected && feedback === 'wrong'

          return (
            <motion.button
              key={`${currentRound}-${i}`}
              onClick={() => handleAnswer(opt)}
              className="rounded-2xl font-display font-bold py-5"
              style={{
                fontSize: 28,
                background: isCorrect
                  ? 'var(--accent-success)'
                  : isWrong
                  ? 'var(--bg-surface)'
                  : 'var(--bg-card)',
                color: isCorrect ? 'white' : 'var(--text-primary)',
                border: `2px solid ${
                  isCorrect
                    ? 'var(--accent-success)'
                    : isWrong
                    ? 'var(--hint-color)'
                    : 'var(--border-color)'
                }`,
                minHeight: 64,
                opacity: feedback && !isSelected ? 0.5 : 1,
                cursor: feedback ? 'default' : 'pointer',
              }}
              whileTap={!feedback ? { scale: 0.93 } : {}}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: feedback && !isSelected ? 0.5 : 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. FractionPizza — Pizza breuken
// ═══════════════════════════════════════════════════════════════

interface PizzaRound {
  numerator: number
  denominator: number
  label: string
}

const PIZZA_ROUNDS: PizzaRound[] = [
  { numerator: 1, denominator: 2, label: '1/2' },
  { numerator: 1, denominator: 4, label: '1/4' },
  { numerator: 3, denominator: 4, label: '3/4' },
  { numerator: 1, denominator: 3, label: '1/3' },
  { numerator: 2, denominator: 3, label: '2/3' },
  { numerator: 2, denominator: 4, label: '2/4' },
]

function PizzaSlice({
  index,
  total,
  colored,
  onClick,
  radius,
}: {
  index: number
  total: number
  colored: boolean
  onClick: () => void
  radius: number
}) {
  const angle = (2 * Math.PI) / total
  const startAngle = angle * index - Math.PI / 2
  const endAngle = startAngle + angle
  const largeArc = angle > Math.PI ? 1 : 0

  const x1 = radius + radius * Math.cos(startAngle)
  const y1 = radius + radius * Math.sin(startAngle)
  const x2 = radius + radius * Math.cos(endAngle)
  const y2 = radius + radius * Math.sin(endAngle)

  const path = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

  return (
    <motion.path
      d={path}
      fill={colored ? '#E8734A' : '#FFF9F0'}
      stroke="#3D3229"
      strokeWidth={2.5}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      whileTap={{ scale: 0.96 }}
      animate={{
        fill: colored ? '#E8734A' : '#FFF9F0',
      }}
      transition={{ duration: 0.2 }}
    />
  )
}

function FractionPizza({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const allRounds = useMemo(() => {
    const base = [...PIZZA_ROUNDS]
    if (difficulty >= 2) {
      base.push(
        { numerator: 3, denominator: 6, label: '3/6' },
        { numerator: 5, denominator: 8, label: '5/8' },
      )
    }
    if (difficulty >= 3) {
      base.push(
        { numerator: 3, denominator: 8, label: '3/8' },
        { numerator: 5, denominator: 6, label: '5/6' },
      )
    }
    return shuffle(base).slice(0, difficulty === 1 ? 6 : 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [currentRound, setCurrentRound] = useState(0)
  const [coloredSlices, setColoredSlices] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  const handleSkipFractionPizza = () => {
    if (feedback || showSkipAnswer) return
    setShowSkipAnswer(true)
    // Show the correct answer: color the first N slices
    const correctSlices = new Set<number>()
    for (let i = 0; i < round.numerator; i++) correctSlices.add(i)
    setColoredSlices(correctSlices)
    setTimeout(() => {
      setShowSkipAnswer(false)
      setColoredSlices(new Set())
      if (currentRound + 1 >= allRounds.length) {
        setGameOver(true)
      } else {
        setCurrentRound((r) => r + 1)
      }
    }, 1500)
  }

  const resetGame = useCallback(() => {
    setCurrentRound(0)
    setColoredSlices(new Set())
    setFeedback(null)
    setScore(0)
    setShowConfetti(false)
    setGameOver(false)
    setShowSkipAnswer(false)
    setGameKey((k) => k + 1)
  }, [])

  const round = allRounds[currentRound]
  const radius = 130

  const toggleSlice = (index: number) => {
    if (feedback || showSkipAnswer) return
    soundTap()
    setColoredSlices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const checkAnswer = () => {
    if (feedback) return
    if (coloredSlices.size === round.numerator) {
      feedbackCorrect()
      setFeedback('correct')
      setScore((s) => s + 1)
      setShowConfetti(true)
      if (navigator.vibrate) navigator.vibrate(50)
      setTimeout(() => {
        setShowConfetti(false)
        setFeedback(null)
        setColoredSlices(new Set())
        if (currentRound + 1 >= allRounds.length) {
          soundWin()
          setGameOver(true)
        } else {
          setCurrentRound((r) => r + 1)
        }
      }, 1200)
    } else {
      soundWrong()
      setFeedback('wrong')
      setTimeout(() => setFeedback(null), 900)
    }
  }

  if (gameOver) {
    return (
      <GameEndScreen
        score={score}
        maxScore={allRounds.length}
        gameName="Pizza Breuken"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <ConfettiBurst active={showConfetti} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkipFractionPizza} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <div className="flex items-center gap-2">
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentRound + 1} / {allRounds.length}
          </p>
          <ScoreDisplay score={score} />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col items-center">
      {/* Instruction */}
      <motion.div
        key={currentRound}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p
          className="font-display font-bold text-xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Kleur{' '}
          <span style={{ color: 'var(--accent-primary)', fontSize: 28 }}>
            {round.label}
          </span>{' '}
          van de pizza
        </p>
        <p className="font-body text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Tik op de stukken om ze te kleuren
        </p>
      </motion.div>

      {/* Pizza SVG */}
      <motion.div
        key={`pizza-${currentRound}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mb-6"
      >
        <svg
          width={radius * 2 + 12}
          height={radius * 2 + 12}
          viewBox={`-6 -6 ${radius * 2 + 12} ${radius * 2 + 12}`}
        >
          {/* Pizza base with crust */}
          <circle
            cx={radius}
            cy={radius}
            r={radius + 3}
            fill="#D4973B"
          />
          <circle
            cx={radius}
            cy={radius}
            r={radius}
            fill="#FFF9F0"
          />

          {/* Slices */}
          {Array.from({ length: round.denominator }, (_, i) => (
            <PizzaSlice
              key={i}
              index={i}
              total={round.denominator}
              colored={coloredSlices.has(i)}
              onClick={() => toggleSlice(i)}
              radius={radius}
            />
          ))}

          {/* Center dot (decoration) */}
          <circle cx={radius} cy={radius} r={6} fill="#D4973B" />
        </svg>
      </motion.div>

      {/* Status */}
      <p className="font-body text-base mb-4" style={{ color: 'var(--text-muted)' }}>
        {coloredSlices.size} van {round.denominator} stukken gekleurd
      </p>

      {/* Hint on wrong */}
      <AnimatePresence>
        {feedback === 'wrong' && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-body text-center text-base mb-4"
            style={{ color: 'var(--hint-color)' }}
          >
            {round.label} betekent {round.numerator} van de {round.denominator} stukken.
            Kleur er precies {round.numerator}!
          </motion.p>
        )}
      </AnimatePresence>

      {/* Check button */}
      <button
        onClick={checkAnswer}
        disabled={coloredSlices.size === 0 || !!feedback}
        className="font-display font-bold py-4 px-10 text-lg mt-auto"
        style={{
          background:
            feedback === 'correct'
              ? 'var(--accent-success)'
              : 'var(--accent-primary)',
          color: 'white',
          borderRadius: 'var(--btn-radius)',
          minHeight: 56,
          opacity: coloredSlices.size === 0 || feedback ? 0.6 : 1,
        }}
      >
        {feedback === 'correct' ? 'Goed zo!' : 'Controleer'}
      </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. SpeedTap — Rekenrace
// ═══════════════════════════════════════════════════════════════

interface SpeedProblem {
  question: string
  answer: number
  options: number[]
}

function generateSpeedProblem(streak: number, difficulty: number): SpeedProblem {
  // Adaptive difficulty: higher streak = harder problems
  const level = Math.min(streak + difficulty, 8)
  let a: number, b: number, op: string, answer: number

  if (level <= 2) {
    a = rand(1, 9)
    b = rand(1, 9)
    op = '+'
    answer = a + b
  } else if (level <= 4) {
    if (Math.random() > 0.4) {
      a = rand(2, 15)
      b = rand(2, 15)
      op = '+'
      answer = a + b
    } else {
      a = rand(5, 20)
      b = rand(1, a - 1)
      op = '-'
      answer = a - b
    }
  } else if (level <= 6) {
    if (Math.random() > 0.5) {
      a = rand(2, 12)
      b = rand(2, 9)
      op = '\u00D7'
      answer = a * b
    } else {
      a = rand(10, 50)
      b = rand(5, 30)
      op = Math.random() > 0.5 ? '+' : '-'
      answer = op === '+' ? a + b : a - b
    }
  } else {
    const r = Math.random()
    if (r < 0.33) {
      a = rand(3, 12)
      b = rand(3, 12)
      op = '\u00D7'
      answer = a * b
    } else if (r < 0.66) {
      b = rand(2, 9)
      answer = rand(2, 12)
      a = b * answer
      op = '\u00F7'
    } else {
      a = rand(20, 99)
      b = rand(10, 50)
      op = Math.random() > 0.5 ? '+' : '-'
      answer = op === '+' ? a + b : a - b
      if (answer < 0) {
        op = '+'
        answer = a + b
      }
    }
  }

  const question = `${a} ${op} ${b}`

  // Generate wrong options
  const opts = new Set<number>([answer])
  while (opts.size < 4) {
    const offset = rand(1, Math.max(5, Math.abs(answer) > 20 ? 10 : 5))
    const wrong = answer + (Math.random() > 0.5 ? offset : -offset)
    if (wrong >= 0 && wrong !== answer) opts.add(wrong)
    if (opts.size < 4 && wrong <= 0) opts.add(answer + rand(1, 8))
  }

  return { question, answer, options: shuffle([...opts]) }
}

function SpeedTap({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const MAX_TIME = 60
  const [timeLeft, setTimeLeft] = useState(MAX_TIME)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [problem, setProblem] = useState<SpeedProblem>(() =>
    generateSpeedProblem(0, difficulty),
  )
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [showStreak, setShowStreak] = useState(false)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const handleSkipSpeedTap = useCallback(() => {
    if (gameOver) return
    setTimeLeft(0)
    feedbackWin()
    setGameOver(true)
  }, [gameOver])

  const resetGame = useCallback(() => {
    setTimeLeft(MAX_TIME)
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setProblem(generateSpeedProblem(0, difficulty))
    setFeedback(null)
    setSelectedOption(null)
    setGameOver(false)
    setShowStreak(false)
    setTotalAnswered(0)
  }, [difficulty])

  // Timer
  useEffect(() => {
    if (gameOver) return
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          feedbackWin()
          setGameOver(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [gameOver])

  const handleAnswer = (value: number) => {
    if (feedback || gameOver) return
    setSelectedOption(value)
    setTotalAnswered((t) => t + 1)

    if (value === problem.answer) {
      feedbackCorrect()
      setFeedback('correct')
      setScore((s) => s + 1)
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak > maxStreak) setMaxStreak(newStreak)
      if (newStreak > 0 && newStreak % 3 === 0) {
        soundStreak()
        setShowStreak(true)
        setTimeout(() => setShowStreak(false), 800)
      }
      if (navigator.vibrate) navigator.vibrate(30)
      setTimeout(() => {
        setFeedback(null)
        setSelectedOption(null)
        setProblem(generateSpeedProblem(newStreak, difficulty))
      }, 400)
    } else {
      soundWrong()
      setFeedback('wrong')
      setStreak(0)
      setTimeout(() => {
        setFeedback(null)
        setSelectedOption(null)
        setProblem(generateSpeedProblem(0, difficulty))
      }, 600)
    }
  }

  if (gameOver) {
    // Max score is roughly how many you could answer in 60 seconds
    const maxScore = Math.max(totalAnswered, score + 5)
    return (
      <GameEndScreen
        score={score}
        maxScore={maxScore}
        gameName="Rekenrace"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {'\u2190'} Terug
        </button>
        <button onClick={handleSkipSpeedTap} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
        <MuteButton />
        <ScoreDisplay score={score} />
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col">
      <TimerBar timeLeft={timeLeft} maxTime={MAX_TIME} />

      {/* Streak indicator */}
      <AnimatePresence>
        {showStreak && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <span className="text-6xl">
              {streak >= 9 ? '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25' : streak >= 6 ? '\uD83D\uDD25\uD83D\uDD25' : '\uD83D\uDD25'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak bar */}
      {streak > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1 mb-3"
        >
          <span className="font-body font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>
            Streak: {streak}
          </span>
          {Array.from({ length: Math.min(streak, 10) }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-sm"
            >
              {'\uD83D\uDD25'}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* Problem */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={problem.question}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -16 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl px-8 py-6 mb-8 text-center"
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--border-color)',
            }}
          >
            <span
              className="font-display font-bold"
              style={{
                fontSize: 'clamp(36px, 10vw, 56px)',
                color: 'var(--text-primary)',
              }}
            >
              {problem.question}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Answer buttons */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {problem.options.map((opt, i) => {
            const isSelected = selectedOption === opt
            const isCorrect = isSelected && feedback === 'correct'
            const isWrong = isSelected && feedback === 'wrong'

            return (
              <motion.button
                key={`${problem.question}-${i}`}
                onClick={() => handleAnswer(opt)}
                className="rounded-2xl font-display font-bold"
                style={{
                  fontSize: 28,
                  paddingTop: 20,
                  paddingBottom: 20,
                  background: isCorrect
                    ? 'var(--accent-success)'
                    : isWrong
                    ? 'var(--bg-surface)'
                    : 'var(--bg-card)',
                  color: isCorrect ? 'white' : 'var(--text-primary)',
                  border: `2px solid ${
                    isCorrect
                      ? 'var(--accent-success)'
                      : isWrong
                      ? 'var(--hint-color)'
                      : 'var(--border-color)'
                  }`,
                  minHeight: 64,
                  opacity: feedback && !isSelected ? 0.5 : 1,
                  cursor: feedback ? 'default' : 'pointer',
                }}
                whileTap={!feedback ? { scale: 0.92 } : {}}
              >
                {opt}
              </motion.button>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 7. SplitTree — Splitsboom
// ═══════════════════════════════════════════════════════════════

interface SplitProblem {
  total: number
  left: number
  right: number
  missing: 'top' | 'left' | 'right'
  answer: number
  options: number[]
}

function generateSplitProblem(difficulty: number, _roundIndex: number): SplitProblem {
  const minTotal = difficulty === 1 ? 3 : difficulty === 2 ? 10 : 15
  const maxTotal = difficulty === 1 ? 10 : difficulty === 2 ? 20 : 50
  const total = rand(minTotal, maxTotal)
  const left = rand(1, total - 1)
  const right = total - left

  // ~20% chance the top is missing, otherwise one of the branches
  const missing: 'top' | 'left' | 'right' = Math.random() < 0.2 ? 'top' : Math.random() < 0.5 ? 'left' : 'right'
  const answer = missing === 'top' ? total : missing === 'left' ? left : right

  // Generate 3 distractors close to the answer
  const distractorSet = new Set<number>()
  const offsets = [-2, -1, 1, 2, -3, 3]
  for (const off of shuffle(offsets)) {
    const d = answer + off
    if (d > 0 && d !== answer) distractorSet.add(d)
    if (distractorSet.size >= 3) break
  }
  // Fill up if we don't have enough
  let fill = 1
  while (distractorSet.size < 3) {
    if (answer + fill !== answer && answer + fill > 0 && !distractorSet.has(answer + fill)) distractorSet.add(answer + fill)
    if (answer - fill !== answer && answer - fill > 0 && !distractorSet.has(answer - fill)) distractorSet.add(answer - fill)
    fill++
  }

  const options = shuffle([answer, ...Array.from(distractorSet).slice(0, 3)])
  return { total, left, right, missing, answer, options }
}

function SplitTree({ onBack, difficulty }: GameProps) {
  const { user } = useAuthStore()
  const TOTAL_ROUNDS = 10
  const [gameKey, setGameKey] = useState(0)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [problem, setProblem] = useState<SplitProblem>(() => generateSplitProblem(difficulty, 0))
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [showLeaves, setShowLeaves] = useState(false)
  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  // Initialiseer ronde
  useEffect(() => {
    const p = generateSplitProblem(difficulty, round)
    setProblem(p)
    setFeedback(null)
    setShowLeaves(false)
    setShowSkipAnswer(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, difficulty, gameKey])

  const advanceRound = () => {
    setShowLeaves(false)
    if (round + 1 >= TOTAL_ROUNDS) {
      finishGame(score)
    } else {
      setRound((r) => r + 1)
    }
  }

  const handleAnswer = (value: number) => {
    if (feedback || showSkipAnswer) return
    if (value === problem.answer) {
      feedbackCorrect()
      soundMatch()
      setFeedback('correct')
      setShowLeaves(true)
      setScore((s) => s + 1)
      if (navigator.vibrate) navigator.vibrate(30)
      setTimeout(() => {
        setShowLeaves(false)
        if (round + 1 >= TOTAL_ROUNDS) {
          finishGame(score + 1)
        } else {
          setRound((r) => r + 1)
        }
      }, 1200)
    } else {
      soundWrong()
      setFeedback('wrong')
      if (navigator.vibrate) navigator.vibrate([50, 30, 50])
      setTimeout(() => {
        setFeedback(null)
      }, 800)
    }
  }

  const handleSkip = () => {
    if (feedback || showSkipAnswer) return
    setShowSkipAnswer(true)
    setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        finishGame(score)
      } else {
        setRound((r) => r + 1)
      }
    }, 1500)
  }

  const finishGame = async (finalScore: number) => {
    const maxScore = TOTAL_ROUNDS
    feedbackWin()
    setDone(true)
    if (user?.id) {
      const pct = Math.round((finalScore / maxScore) * 100)
      const tokens = pct >= 80 ? 3 : pct >= 50 ? 2 : 1
      await grantTokens(user.id, tokens, `Splitsboom: ${finalScore}/${maxScore}`)
    }
  }

  const resetGame = useCallback(() => {
    setRound(0)
    setScore(0)
    setDone(false)
    setGameKey((k) => k + 1)
  }, [])

  if (done) {
    return (
      <GameEndScreen
        score={score}
        maxScore={TOTAL_ROUNDS}
        gameName="Splitsboom"
        onBack={onBack}
        childId={user?.id ?? ''}
        onReplay={resetGame}
      />
    )
  }

  // Determine display values for the tree circles
  const topDisplay = problem.missing === 'top' ? (showSkipAnswer || feedback === 'correct' ? problem.total : null) : problem.total
  const leftDisplay = problem.missing === 'left' ? (showSkipAnswer || feedback === 'correct' ? problem.left : null) : problem.left
  const rightDisplay = problem.missing === 'right' ? (showSkipAnswer || feedback === 'correct' ? problem.right : null) : problem.right

  const treeW = 300
  const treeH = 220

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
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
        <div className="text-center flex-1">
          <p className="font-display font-bold text-ink" style={{ fontSize: 16 }}>Splitsboom</p>
          <p className="font-body text-ink-muted text-xs">{round + 1} / {TOTAL_ROUNDS}</p>
        </div>
        <ScoreDisplay score={score} />
      </div>

      <div className="flex-1 overflow-auto flex flex-col items-center px-4 pb-4 gap-2">
        {/* Boom SVG */}
        <svg
          viewBox={`0 0 ${treeW} ${treeH}`}
          className="w-full max-w-sm touch-none"
          style={{ maxHeight: '45vh' }}
        >
          {/* Stam */}
          <line x1={150} y1={55} x2={150} y2={100} stroke="#8C7B6B" strokeWidth={8} strokeLinecap="round" />

          {/* Takken */}
          <line x1={150} y1={100} x2={75} y2={170} stroke="#8C7B6B" strokeWidth={6} strokeLinecap="round" />
          <line x1={150} y1={100} x2={225} y2={170} stroke="#8C7B6B" strokeWidth={6} strokeLinecap="round" />

          {/* Blaadjes animatie bij goed antwoord */}
          {showLeaves && (
            <>
              {[...Array(8)].map((_, i) => {
                const lx = rand(40, 260)
                const ly = rand(30, 120)
                return (
                  <g key={`leaf-${i}`}>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values={`0,0; ${rand(-20, 20)},${rand(40, 80)}`}
                      dur="1s"
                      begin={`${i * 0.1}s`}
                      fill="freeze"
                    />
                    <circle cx={lx} cy={ly} r={5} fill={['#5B8C5A', '#7BAFA3', '#F2C94C'][i % 3]} opacity={0.8}>
                      <animate attributeName="opacity" values="0.8;0" dur="1s" begin={`${i * 0.1}s`} fill="freeze" />
                    </circle>
                  </g>
                )
              })}
            </>
          )}

          {/* Top cirkel (totaal) */}
          <circle
            cx={150}
            cy={38}
            r={32}
            fill={problem.missing === 'top' && topDisplay === null ? '#FFF9F0' : feedback === 'correct' || showSkipAnswer ? '#5B8C5A' : '#E8734A'}
            stroke={problem.missing === 'top' && topDisplay === null ? '#E8E0D6' : 'white'}
            strokeWidth={3}
            strokeDasharray={problem.missing === 'top' && topDisplay === null ? '6 4' : 'none'}
          />
          <text
            x={150}
            y={40}
            textAnchor="middle"
            dominantBaseline="central"
            fill={problem.missing === 'top' && topDisplay === null ? '#8C7B6B' : 'white'}
            fontSize={topDisplay !== null && topDisplay >= 10 ? 22 : 26}
            fontWeight={700}
            fontFamily="var(--font-display)"
          >
            {topDisplay !== null ? topDisplay : '?'}
          </text>

          {/* Links */}
          <circle
            cx={75}
            cy={185}
            r={30}
            fill={problem.missing === 'left' && leftDisplay === null ? '#FFF9F0' : feedback === 'correct' || showSkipAnswer ? '#5B8C5A' : '#7BAFA3'}
            stroke={problem.missing === 'left' && leftDisplay === null ? '#E8E0D6' : 'white'}
            strokeWidth={problem.missing === 'left' && leftDisplay === null ? 2.5 : 3}
            strokeDasharray={problem.missing === 'left' && leftDisplay === null ? '6 4' : 'none'}
          />
          <text
            x={75}
            y={187}
            textAnchor="middle"
            dominantBaseline="central"
            fill={problem.missing === 'left' && leftDisplay === null ? '#8C7B6B' : 'white'}
            fontSize={leftDisplay !== null && leftDisplay >= 10 ? 20 : 24}
            fontWeight={700}
            fontFamily="var(--font-display)"
            style={{ pointerEvents: 'none' }}
          >
            {leftDisplay !== null ? leftDisplay : '?'}
          </text>

          {/* Rechts */}
          <circle
            cx={225}
            cy={185}
            r={30}
            fill={problem.missing === 'right' && rightDisplay === null ? '#FFF9F0' : feedback === 'correct' || showSkipAnswer ? '#5B8C5A' : '#7BAFA3'}
            stroke={problem.missing === 'right' && rightDisplay === null ? '#E8E0D6' : 'white'}
            strokeWidth={problem.missing === 'right' && rightDisplay === null ? 2.5 : 3}
            strokeDasharray={problem.missing === 'right' && rightDisplay === null ? '6 4' : 'none'}
          />
          <text
            x={225}
            y={187}
            textAnchor="middle"
            dominantBaseline="central"
            fill={problem.missing === 'right' && rightDisplay === null ? '#8C7B6B' : 'white'}
            fontSize={rightDisplay !== null && rightDisplay >= 10 ? 20 : 24}
            fontWeight={700}
            fontFamily="var(--font-display)"
            style={{ pointerEvents: 'none' }}
          >
            {rightDisplay !== null ? rightDisplay : '?'}
          </text>
        </svg>

        {/* Hint bij fout */}
        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center font-body text-sm rounded-2xl px-4 py-2 w-full"
              style={{ background: 'rgba(168,197,214,0.2)', color: 'var(--text-primary)' }}
            >
              {problem.missing === 'top'
                ? `${problem.left} + ${problem.right} = ?`
                : `De getallen moeten samen ${problem.total} maken.`} Probeer opnieuw!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Antwoordknoppen */}
        <div className="w-full max-w-sm">
          <p className="font-body font-semibold text-xs mb-2 text-center" style={{ color: 'var(--text-muted)' }}>
            Welk getal past op de ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((opt, i) => {
              const isCorrectOpt = opt === problem.answer
              const showAsCorrect = (feedback === 'correct' || showSkipAnswer) && isCorrectOpt
              return (
                <motion.button
                  key={`${round}-${i}`}
                  whileTap={{ scale: 0.93 }}
                  animate={feedback === 'wrong' && !isCorrectOpt ? { x: [0, -4, 4, -4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  onClick={() => handleAnswer(opt)}
                  className="flex items-center justify-center font-display font-bold rounded-2xl"
                  style={{
                    height: 64,
                    fontSize: opt >= 10 ? 24 : 28,
                    background: showAsCorrect ? 'var(--accent-success)' : 'var(--bg-card)',
                    color: showAsCorrect ? 'white' : 'var(--text-primary)',
                    border: `2px solid ${showAsCorrect ? 'var(--accent-success)' : 'var(--border-color)'}`,
                    transition: 'background 0.2s, color 0.2s',
                    opacity: feedback || showSkipAnswer ? 0.7 : 1,
                    pointerEvents: feedback || showSkipAnswer ? 'none' : 'auto',
                  }}
                >
                  {opt}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Hoofd-component: MathGamesPage
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
    id: 'memory',
    emoji: '\uD83C\uDFB4',
    name: 'Reken Memory',
    description: 'Vind de som en het antwoord',
    color: '#E8734A',
    Component: NumberMemory,
  },
  {
    id: 'bubbles',
    emoji: '\uD83E\uDEE7',
    name: 'Bubbels Knallen',
    description: 'Tik bubbels die samen het doel maken',
    color: '#7BAFA3',
    Component: BubblePopMath,
  },
  {
    id: 'drag',
    emoji: '\uD83E\uDDE9',
    name: 'Sleep de Som',
    description: 'Welk getal ontbreekt?',
    color: '#F2C94C',
    Component: DragEquation,
  },
  {
    id: 'pattern',
    emoji: '\uD83D\uDD22',
    name: 'Patroon Afmaken',
    description: 'Welk getal komt er na?',
    color: '#5B8C5A',
    Component: PatternComplete,
  },
  {
    id: 'pizza',
    emoji: '\uD83C\uDF55',
    name: 'Pizza Breuken',
    description: 'Kleur het juiste deel van de pizza',
    color: '#D4973B',
    Component: FractionPizza,
  },
  {
    id: 'speed',
    emoji: '\u26A1',
    name: 'Rekenrace',
    description: 'Hoe snel kun jij rekenen?',
    color: '#A8C5D6',
    Component: SpeedTap,
  },
  {
    id: 'split-tree',
    emoji: '\uD83C\uDF33',
    name: 'Splitsboom',
    description: 'Splits het getal in twee delen',
    color: '#5B8C5A',
    Component: SplitTree,
  },
]

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Makkelijk', emoji: '\uD83C\uDF1F' },
  { value: 2, label: 'Gemiddeld', emoji: '\uD83D\uDD25' },
  { value: 3, label: 'Moeilijk', emoji: '\uD83D\uDCAA' },
]

export function MathGamesPage() {
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
          Reken Spelletjes {'\uD83C\uDFAE'}
        </h1>
        <p className="font-body text-base mt-1" style={{ color: 'var(--text-muted)' }}>
          Kies een spelletje en oefen wiskunde!
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

export default MathGamesPage
