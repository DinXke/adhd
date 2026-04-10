/**
 * Oefeningen — Fase 5
 *
 * Schermen:
 * 1. Vak-selector
 * 2. Sessie — één oefening tegelijk, fullscreen
 * 3. Afronding — score + tokens
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { useSpeechInput } from '../../hooks/useSpeechInput'
import { TtsButton } from '../../components/TtsButton'
import { feedbackCorrect, feedbackWrong, soundToken, soundWin } from '../../lib/sounds'

// ── Spelletjes-link component ─────────────────────────────────
function GamesLink({ to, emoji, title, sub, color }: {
  to: string; emoji: string; title: string; sub: string; color: string
}) {
  const navigate = useNavigate()
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(to)}
      className="w-full card flex items-center gap-4 px-5 py-5 text-left"
      style={{ borderLeft: `4px solid ${color}`, background: `${color}08` }}
    >
      <span className="text-4xl">{emoji}</span>
      <div className="flex-1">
        <p className="font-display font-bold text-ink text-xl">{title}</p>
        <p className="font-body text-ink-muted text-sm mt-0.5">{sub}</p>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </motion.button>
  )
}

// ── Types ──────────────────────────────────────────────────────
interface ExerciseQuestion {
  question: string
  options?: string[]
  answer: string | number
  hints: { type: string; content: string }[]
  explanation?: string
}

interface Exercise {
  id: string
  subject: string
  type: string
  difficulty: number
  title?: string | null
  questionJson: ExerciseQuestion
  tags: string[]
}

interface SessionItem {
  id: string
  exerciseId: string
  exercise: Exercise
  isCorrect?: boolean | null
  attempts: number
  answeredAt?: string | null
}

interface Session {
  id: string
  subject: string
  items: SessionItem[]
}

// ── Constanten ─────────────────────────────────────────────────
const SUBJECTS = [
  { key: 'wiskunde', label: 'Wiskunde', emoji: '🔢', color: '#E8734A' },
  { key: 'taal', label: 'Taal', emoji: '📖', color: '#7BAFA3' },
  { key: 'spelling', label: 'Spelling', emoji: '✏️', color: '#5B8C5A' },
  { key: 'wereldorientatie', label: 'Wereld', emoji: '🌍', color: '#9B7CC8' },
]

// TtsButton is now imported from ../../components/TtsButton

const DIFFICULTY_LABELS = ['', 'Makkelijk', 'Gemiddeld', 'Moeilijk', 'Extra moeilijk', 'Uitdaging']

const SESSION_DURATION = 15 * 60 // 15 minuten in seconden

// ── Oefening-renderer ──────────────────────────────────────────
function ExerciseRenderer({
  item,
  onAnswer,
  hint,
  showAnswer,
  isAnswering,
  attempts,
}: {
  item: SessionItem
  onAnswer: (answer: string) => void
  hint: string | null
  showAnswer: boolean
  isAnswering: boolean
  attempts: number
}) {
  const q = item.exercise.questionJson
  const [fillValue, setFillValue] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const correctAnswer = String(q.answer)

  const speech = useSpeechInput((transcript) => {
    setFillValue(transcript)
  })

  // Reset bij nieuwe oefening
  useEffect(() => {
    setFillValue('')
    setSelected(null)
  }, [item.id])

  // Reset selected na fout antwoord zodat je opnieuw kunt proberen
  useEffect(() => {
    if (attempts > 0 && !showAnswer) {
      const timer = setTimeout(() => setSelected(null), 800)
      return () => clearTimeout(timer)
    }
  }, [attempts, showAnswer])

  const handleOptionClick = (option: string) => {
    if (isAnswering || selected !== null) return
    setSelected(option)
    onAnswer(option)
  }

  const handleFillSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fillValue.trim() || isAnswering) return
    onAnswer(fillValue.trim())
  }

  const isMultipleChoice = item.exercise.type === 'multiple_choice' && q.options?.length

  return (
    <div className="flex flex-col gap-5">
      {/* Vraag */}
      <motion.div
        key={item.id + '-q'}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 text-center relative"
        style={{
          borderLeft: `4px solid ${item.exercise.tags?.includes('wist_je_dat') ? '#9B7CC8' : 'var(--accent-primary)'}`,
          background: item.exercise.tags?.includes('wist_je_dat') ? 'rgba(155,124,200,0.06)' : undefined,
        }}
      >
        {item.exercise.tags?.includes('wist_je_dat') && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
            style={{ background: 'rgba(155,124,200,0.15)', color: '#9B7CC8' }}>
            <span className="text-sm">🌍</span>
            <span className="font-display font-bold text-xs">Wist je dat?</span>
          </div>
        )}
        <p
          className="font-display font-bold text-ink leading-snug"
          style={{ fontSize: 'clamp(20px, 5vw, 28px)' }}
        >
          {q.question}
        </p>
        <TtsButton text={q.question} className="absolute top-2 right-2" />
      </motion.div>

      {/* Hint of uitleg */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl px-4 py-3 font-body text-base"
            style={{
              background: 'rgba(168,197,214,0.2)',
              border: '1.5px solid rgba(168,197,214,0.5)',
              color: 'var(--text-primary)',
            }}
          >
            💡 {hint}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl px-5 py-4 font-body text-base text-center"
            style={{
              background: 'rgba(91,140,90,0.12)',
              border: '1.5px solid rgba(91,140,90,0.3)',
              color: 'var(--accent-success)',
            }}
          >
            <strong>Het antwoord is: {correctAnswer}</strong>
            {q.explanation && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {q.explanation}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Antwoord-knoppen */}
      {isMultipleChoice && !showAnswer && (
        <div className="grid grid-cols-2 gap-3">
          {q.options!.map((option, i) => {
            const isSelected = selected === option
            const isCorrect = isSelected && option === correctAnswer
            const isWrong = isSelected && option !== correctAnswer
            return (
              <motion.button
                key={i}
                onClick={() => handleOptionClick(option)}
                disabled={!!selected || isAnswering}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={!selected ? { scale: 0.95 } : {}}
                className="font-display font-bold text-xl py-5 px-3 rounded-2xl"
                style={{
                  minHeight: 72,
                  background: isCorrect
                    ? 'var(--accent-success)'
                    : isWrong
                    ? 'rgba(168,197,214,0.3)'
                    : 'var(--bg-card)',
                  color: isCorrect ? 'white' : 'var(--text-primary)',
                  border: `2px solid ${
                    isCorrect
                      ? 'var(--accent-success)'
                      : isWrong
                      ? 'rgba(168,197,214,0.5)'
                      : 'var(--border-color)'
                  }`,
                  cursor: selected ? 'default' : 'pointer',
                  opacity: selected && !isSelected ? 0.5 : 1,
                }}
              >
                {option}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Invulveld */}
      {!isMultipleChoice && !showAnswer && (
        <form onSubmit={handleFillSubmit} className="flex gap-3">
          <input
            value={fillValue}
            onChange={(e) => setFillValue(e.target.value)}
            disabled={isAnswering}
            placeholder="Jouw antwoord..."
            inputMode="numeric"
            className="flex-1 font-display font-bold text-2xl text-center rounded-2xl"
            style={{
              padding: '16px',
              background: 'var(--bg-card)',
              border: `2px solid ${speech.isListening ? 'var(--accent-warm)' : 'var(--border-color)'}`,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
            autoFocus
          />
          {/* Microfoon knop (alleen als Web Speech ondersteund wordt) */}
          {speech.isSupported && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={speech.isListening ? speech.stop : speech.start}
              disabled={isAnswering}
              className="w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: speech.isListening ? 'var(--accent-warm)' : 'var(--bg-card)',
                border: `2px solid ${speech.isListening ? 'var(--accent-warm)' : 'var(--border-color)'}`,
              }}
              title={speech.isListening ? 'Stop opnemen' : 'Spreek je antwoord in'}
            >
              {speech.isListening ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="none">
                    <rect x="9" y="2" width="6" height="12" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <path d="M12 19v3M9 22h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </motion.div>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="var(--bg-surface)" stroke="var(--text-muted)"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/>
                  <path d="M12 19v3M9 22h6"/>
                </svg>
              )}
            </motion.button>
          )}
          <button
            type="submit"
            disabled={!fillValue.trim() || isAnswering}
            className="font-display font-bold text-xl px-6 rounded-2xl"
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
              minWidth: 80,
              opacity: !fillValue.trim() || isAnswering ? 0.5 : 1,
            }}
          >
            OK
          </button>
        </form>
      )}
    </div>
  )
}

// ── Sessie UI ──────────────────────────────────────────────────
function ExerciseSession({
  session,
  onComplete,
}: {
  session: Session
  onComplete: (stats: { correct: number; total: number; bonusTokens: number }) => void
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [items, setItems] = useState<SessionItem[]>(session.items)
  const [hint, setHint] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)
  const [correctThisRound, setCorrectThisRound] = useState(false)
  const [sessionTokens, setSessionTokens] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showBreak, setShowBreak] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())

  // Sessie-timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedSeconds(elapsed)
      if (elapsed >= SESSION_DURATION) {
        if (timerRef.current) clearInterval(timerRef.current)
        setShowBreak(true)
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const currentItem = items[currentIdx]
  const progress = (currentIdx / items.length) * 100
  const timeLeft = Math.max(0, SESSION_DURATION - elapsedSeconds)
  const timeLeftMin = Math.floor(timeLeft / 60)
  const timeLeftSec = timeLeft % 60
  const timerColor = timeLeft > 300 ? '#5B8C5A' : timeLeft > 60 ? '#E8734A' : '#C45D4C'

  const handleAnswer = useCallback(async (answer: string) => {
    if (isAnswering || !currentItem) return
    setIsAnswering(true)

    try {
      const res = await api.post<{
        isCorrect: boolean
        attempts: number
        hint: string | null
        tokensAwarded: number
      }>(`/api/exercises/sessions/${session.id}/answer`, {
        itemId: currentItem.id,
        answer,
        timeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      })

      if (res.tokensAwarded > 0) soundToken()
      setSessionTokens((t) => t + (res.tokensAwarded ?? 0))

      if (res.isCorrect) {
        feedbackCorrect()
        setCorrectThisRound(true)
        setHint(null)
        setShowAnswer(false)
        // Update items
        setItems((prev) =>
          prev.map((it) =>
            it.id === currentItem.id ? { ...it, isCorrect: true, attempts: res.attempts } : it
          )
        )
        // Even wachten voor animatie dan volgende
        setTimeout(() => {
          setCorrectThisRound(false)
          if (currentIdx + 1 >= items.length) {
            finishSession()
          } else {
            setCurrentIdx((i) => i + 1)
            setHint(null)
            setShowAnswer(false)
          }
        }, 900)
      } else {
        feedbackWrong()
        if (res.hint) {
          setHint(res.hint)
        }
        if (res.attempts >= 2) {
          setShowAnswer(true)
          setHint(null)
          // Na 2.5 seconden automatisch volgende
          setTimeout(() => {
            setShowAnswer(false)
            if (currentIdx + 1 >= items.length) {
              finishSession()
            } else {
              setCurrentIdx((i) => i + 1)
              setHint(null)
              setShowAnswer(false)
            }
          }, 2500)
        }
        setItems((prev) =>
          prev.map((it) =>
            it.id === currentItem.id ? { ...it, attempts: res.attempts } : it
          )
        )
      }
    } catch {}
    setIsAnswering(false)
  }, [currentItem, currentIdx, items.length, isAnswering, session.id])

  const finishSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const res = await api.post<{ correct: number; total: number; bonusTokens: number }>(
        `/api/exercises/sessions/${session.id}/complete`,
        { durationSeconds: elapsedSeconds }
      )
      onComplete({ correct: res.correct, total: res.total, bonusTokens: res.bonusTokens })
    } catch {
      onComplete({
        correct: items.filter((i) => i.isCorrect).length,
        total: items.length,
        bonusTokens: 0,
      })
    }
  }

  if (showBreak) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <span className="text-6xl mb-4">⏰</span>
        <h2 className="font-display font-bold text-ink text-2xl mb-2">Tijd voor een pauze!</h2>
        <p className="font-body text-ink-muted text-base mb-8">
          Je hebt 15 minuten geoefend. Ga even bewegen of drink iets.
        </p>
        <button
          onClick={finishSession}
          className="btn-primary font-body px-8"
          style={{ background: 'var(--accent-primary)', borderRadius: 'var(--btn-radius)' }}
        >
          Sessie afronden
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-4 pt-2 pb-20 max-h-[100dvh] overflow-auto">
      {/* Header: voortgang + timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {items.map((it, i) => (
            <div
              key={it.id}
              className="rounded-full"
              style={{
                width: i === currentIdx ? 20 : 10,
                height: 10,
                background: it.isCorrect
                  ? 'var(--accent-success)'
                  : i === currentIdx
                  ? 'var(--accent-primary)'
                  : i < currentIdx
                  ? 'var(--accent-secondary)'
                  : 'var(--border-color)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
        <span className="font-body font-semibold text-sm" style={{ color: timerColor }}>
          {timeLeftMin}:{String(timeLeftSec).padStart(2, '0')}
        </span>
      </div>

      {/* Timer balk */}
      <div className="w-full rounded-full mb-5 overflow-hidden" style={{ height: 6, background: 'var(--border-color)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: timerColor }}
          animate={{ width: `${(timeLeft / SESSION_DURATION) * 100}%` }}
          transition={{ duration: 1 }}
        />
      </div>

      {/* Succesanimatie overlay */}
      <AnimatePresence>
        {correctThisRound && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(91,140,90,0.15)' }}
          >
            <span className="text-8xl">⭐</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Oefening */}
      <AnimatePresence mode="wait">
        {currentItem && (
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-body text-ink-muted text-sm">
                {currentIdx + 1} / {items.length}
              </span>
              <span className="font-body text-xs px-2 py-1 rounded-full" style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-muted)',
              }}>
                {DIFFICULTY_LABELS[currentItem.exercise.difficulty]}
              </span>
            </div>

            <ExerciseRenderer
              item={currentItem}
              onAnswer={handleAnswer}
              hint={hint}
              showAnswer={showAnswer}
              isAnswering={isAnswering}
              attempts={currentItem.attempts}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tokens counter */}
      {sessionTokens > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-24 right-4 font-display font-bold text-base px-3 py-1.5 rounded-full"
          style={{ background: 'var(--accent-token)', color: '#3D3229' }}
        >
          +{sessionTokens} ⭐
        </motion.div>
      )}
    </div>
  )
}

// ── Resultaat-scherm ───────────────────────────────────────────
function SessionResult({
  correct,
  total,
  bonusTokens,
  earnedTokens,
  onRetry,
  onDone,
}: {
  correct: number
  total: number
  bonusTokens: number
  earnedTokens: number
  onRetry: () => void
  onDone: () => void
}) {
  const pct = Math.round((correct / total) * 100)
  const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : 1

  // Play win sound on mount for good scores
  useEffect(() => {
    if (pct >= 80) soundWin()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center pb-24">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      >
        <div className="text-5xl mb-2">{'⭐'.repeat(stars)}</div>
        <h2 className="font-display font-bold text-ink text-3xl mb-1">
          {pct >= 80 ? 'Geweldig!' : pct >= 60 ? 'Goed gedaan!' : 'Blijf oefenen!'}
        </h2>
        <p className="font-body text-ink-muted text-base mb-2">
          {correct} van {total} goed ({pct}%)
        </p>
        {(bonusTokens + earnedTokens) > 0 && (
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="font-display font-bold text-xl mb-6"
            style={{ color: 'var(--accent-token)' }}
          >
            +{bonusTokens + earnedTokens} ⭐ verdiend!
          </motion.p>
        )}
        {(bonusTokens + earnedTokens) === 0 && <div className="mb-6" />}
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="font-display font-bold py-4 rounded-2xl text-lg"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          Nog een keer!
        </button>
        <button
          onClick={onDone}
          className="font-body font-semibold py-3.5 rounded-2xl"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          Klaar
        </button>
      </div>
    </div>
  )
}

// ── Hoofd-component ────────────────────────────────────────────
type Screen = 'subject' | 'loading' | 'session' | 'result' | 'no-exercises'

export default function ExercisesPage() {
  const { user } = useAuthStore()
  const [screen, setScreen] = useState<Screen>('subject')
  const [selectedSubject, setSelectedSubject] = useState<string>('wiskunde')
  const [selectedDifficulty, setSelectedDifficulty] = useState(1)
  const [session, setSession] = useState<Session | null>(null)
  const [result, setResult] = useState<{ correct: number; total: number; bonusTokens: number } | null>(null)
  const [sessionTokens, setSessionTokens] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'exercises' | 'games'>('exercises')
  const [availability, setAvailability] = useState<Record<string, Record<number, number>>>({})

  // Fetch availability on mount
  useEffect(() => {
    api.get<{ availability: Record<string, Record<number, number>> }>('/api/exercises/availability')
      .then(res => {
        setAvailability(res.availability)
        // Auto-select first available difficulty for selected subject
        const subj = res.availability[selectedSubject]
        if (subj) {
          const available = [1,2,3,4,5].find(d => (subj[d] ?? 0) > 0)
          if (available) setSelectedDifficulty(available)
        }
      })
      .catch(() => {})
  }, [])

  const startSession = async (subject: string, difficulty: number) => {
    setScreen('loading')
    setError(null)

    try {
      // Oefeningen ophalen
      const data = await api.get<{ exercises: Exercise[] }>(
        `/api/exercises?subject=${subject}&difficulty=${difficulty}&limit=8&childId=${user?.id}`
      )

      if (!data.exercises.length) {
        setScreen('no-exercises')
        return
      }

      // Sessie aanmaken
      const sessionData = await api.post<{ session: Session }>('/api/exercises/sessions', {
        childId: user?.id,
        subject,
        exerciseIds: data.exercises.map((e) => e.id),
      })

      setSession(sessionData.session)
      setSessionTokens(0)
      setScreen('session')
    } catch (err: any) {
      setError(err.message ?? 'Kon oefeningen niet laden')
      setScreen('subject')
    }
  }

  const handleComplete = (stats: { correct: number; total: number; bonusTokens: number }) => {
    setResult(stats)
    setScreen('result')
  }

  return (
    <div className="max-w-lg mx-auto">
      <AnimatePresence mode="wait">

        {/* ── Vak-selector ─────────────────────────────────────── */}
        {screen === 'subject' && (
          <motion.div
            key="subject"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="px-5 pt-6 pb-24"
          >
            <h1
              className="font-display font-bold text-ink mb-2"
              style={{ fontSize: 'var(--font-size-heading)' }}
            >
              Leren & Spelen 📚
            </h1>

            {/* Modus: Oefenen of Spelletjes */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('exercises')}
                className="flex-1 py-3 rounded-2xl font-display font-bold text-base"
                style={{
                  background: mode === 'exercises' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: mode === 'exercises' ? 'white' : 'var(--text-muted)',
                  border: `2px solid ${mode === 'exercises' ? 'var(--accent-primary)' : 'transparent'}`,
                }}
              >
                📝 Oefenen
              </button>
              <button
                onClick={() => setMode('games')}
                className="flex-1 py-3 rounded-2xl font-display font-bold text-base"
                style={{
                  background: mode === 'games' ? 'var(--accent-warm)' : 'var(--bg-surface)',
                  color: mode === 'games' ? 'white' : 'var(--text-muted)',
                  border: `2px solid ${mode === 'games' ? 'var(--accent-warm)' : 'transparent'}`,
                }}
              >
                🎮 Spelletjes
              </button>
            </div>

            {/* Spelletjes modus */}
            {mode === 'games' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <GamesLink
                  to="/app/rekenspelletjes"
                  emoji="🔢"
                  title="Rekenspelletjes"
                  sub="Memory, bubbels, pizza breuken, patronen..."
                  color="#E8734A"
                />
                <GamesLink
                  to="/app/taalspelletjes"
                  emoji="📖"
                  title="Taalspelletjes"
                  sub="Woordpuzzels, woordzoeker, zinnen bouwen..."
                  color="#7BAFA3"
                />
                <GamesLink
                  to="/app/lateralisatie"
                  emoji="🧭"
                  title="Links & Rechts"
                  sub="Spiegelbeelden, richtingen, lichaamsdelen..."
                  color="#9B7CC8"
                />
                <GamesLink
                  to="/app/breinspelletjes"
                  emoji="🧠"
                  title="Breintraining"
                  sub="Werkgeheugen, impulscontrole, aandacht..."
                  color="#9B7CC8"
                />
              </motion.div>
            )}

            {/* Oefenen modus */}
            {mode === 'exercises' && <>
            <p className="font-body text-ink-muted text-base mb-6">
              Kies een vak en een niveau
            </p>

            {error && (
              <div className="rounded-2xl px-4 py-3 mb-4 font-body text-sm" style={{
                background: 'rgba(168,197,214,0.2)',
                color: 'var(--text-primary)',
              }}>
                {error}
              </div>
            )}

            {/* Vakken */}
            <div className="flex flex-col gap-3 mb-6">
              {SUBJECTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setSelectedSubject(s.key)
                    // Auto-select first available difficulty
                    const subj = availability[s.key]
                    if (subj) {
                      const avail = [1,2,3,4,5].find(d => (subj[d] ?? 0) > 0)
                      if (avail) setSelectedDifficulty(avail)
                    }
                  }}
                  className="card flex items-center gap-4 px-5 py-4 w-full text-left"
                  style={{
                    borderLeft: `4px solid ${s.color}`,
                    background: selectedSubject === s.key ? `${s.color}10` : undefined,
                    outline: selectedSubject === s.key ? `2px solid ${s.color}` : undefined,
                  }}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="font-display font-bold text-ink text-xl">{s.label}</span>
                  {selectedSubject === s.key && (
                    <span className="ml-auto font-display font-bold text-base" style={{ color: s.color }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Moeilijkheidsgraad */}
            <div className="card p-5 mb-6">
              <p className="font-body font-semibold text-ink text-base mb-4">Niveau</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((d) => {
                  const count = availability[selectedSubject]?.[d] ?? 0
                  const isEmpty = count === 0
                  return (
                    <button
                      key={d}
                      onClick={() => !isEmpty && setSelectedDifficulty(d)}
                      disabled={isEmpty}
                      className="flex-1 py-3 rounded-xl font-display font-bold text-lg relative"
                      style={{
                        background: isEmpty
                          ? 'var(--bg-surface)'
                          : selectedDifficulty === d ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        color: isEmpty
                          ? 'var(--border-color)'
                          : selectedDifficulty === d ? 'white' : 'var(--text-muted)',
                        border: `2px solid ${selectedDifficulty === d && !isEmpty ? 'var(--accent-primary)' : 'transparent'}`,
                        opacity: isEmpty ? 0.4 : 1,
                        cursor: isEmpty ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {d}
                      {!isEmpty && count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                          style={{
                            background: selectedDifficulty === d ? 'white' : 'var(--accent-calm)',
                            color: selectedDifficulty === d ? 'var(--accent-primary)' : 'white',
                          }}>
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="font-body text-ink-muted text-sm mt-2 text-center">
                {(availability[selectedSubject]?.[selectedDifficulty] ?? 0) === 0
                  ? 'Geen oefeningen beschikbaar'
                  : DIFFICULTY_LABELS[selectedDifficulty]}
              </p>
            </div>

            <button
              onClick={() => startSession(selectedSubject, selectedDifficulty)}
              disabled={(availability[selectedSubject]?.[selectedDifficulty] ?? 0) === 0}
              className="w-full font-display font-bold py-4 rounded-2xl text-xl disabled:opacity-40"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              {(availability[selectedSubject]?.[selectedDifficulty] ?? 0) === 0
                ? 'Geen oefeningen beschikbaar'
                : 'Starten! 🚀'}
            </button>
            </>}
          </motion.div>
        )}

        {/* ── Laden ────────────────────────────────────────────── */}
        {screen === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh]"
          >
            <div className="flex gap-2 mb-4">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-4 h-4 rounded-full animate-bounce"
                  style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="font-body text-ink-muted">Oefeningen worden geladen...</p>
          </motion.div>
        )}

        {/* ── Geen oefeningen ───────────────────────────────────── */}
        {screen === 'no-exercises' && (
          <motion.div
            key="noex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center"
          >
            <span className="text-6xl mb-4">😴</span>
            <h2 className="font-display font-bold text-ink text-2xl mb-2">Geen oefeningen gevonden</h2>
            <p className="font-body text-ink-muted mb-6">
              Vraag een ouder om oefeningen toe te voegen voor dit vak en niveau.
            </p>
            <button
              onClick={() => setScreen('subject')}
              className="btn-primary font-body"
              style={{ background: 'var(--accent-primary)', borderRadius: 'var(--btn-radius)' }}
            >
              Terug
            </button>
          </motion.div>
        )}

        {/* ── Sessie ───────────────────────────────────────────── */}
        {screen === 'session' && session && (
          <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ExerciseSession
              session={session}
              onComplete={handleComplete}
            />
          </motion.div>
        )}

        {/* ── Resultaat ────────────────────────────────────────── */}
        {screen === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SessionResult
              correct={result.correct}
              total={result.total}
              bonusTokens={result.bonusTokens}
              earnedTokens={sessionTokens}
              onRetry={() => startSession(selectedSubject, selectedDifficulty)}
              onDone={() => setScreen('subject')}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
