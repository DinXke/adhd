/**
 * Kookrecept-modus — Stap-voor-stap voor Julie
 * Route: /app/recepten
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'

interface RecipeStep {
  id: string
  sortOrder: number
  title: string
  description?: string
  duration?: number // seconden
  tip?: string
}

interface Recipe {
  id: string
  title: string
  icon: string
  description?: string
  duration?: number
  difficulty: number
  steps: RecipeStep[]
  playCount: number
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m} min`
}

// ── Stap-voor-stap speler ─────────────────────────────────────
function RecipePlayer({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [timer, setTimer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const playMutation = useMutation({ mutationFn: () => api.post(`/api/recipes/play/${recipe.id}`, {}) })

  const current = recipe.steps[step]
  const isLast = step === recipe.steps.length - 1
  const progress = Math.round((step / recipe.steps.length) * 100)

  useEffect(() => {
    if (timer === null) return
    if (timeLeft <= 0) { setTimer(null); return }
    const id = window.setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timer, timeLeft])

  function startTimer() {
    if (!current.duration) return
    setTimeLeft(current.duration)
    setTimer(Date.now())
  }

  function handleNext() {
    setTimer(null)
    if (isLast) {
      playMutation.mutate()
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  function handlePrev() {
    if (step > 0) { setTimer(null); setStep(s => s - 1) }
  }

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] z-50 flex flex-col">
      {/* Progressbalk */}
      <div className="h-2 bg-[var(--bg-surface)]">
        <motion.div
          animate={{ width: `${progress}%` }}
          className="h-full rounded-full bg-[var(--accent-warm)]"
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={handlePrev} disabled={step === 0}
          className="w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-30"
          style={{ background: 'var(--bg-surface)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="text-center">
          <p className="font-display font-bold text-[var(--text-primary)]">{recipe.title}</p>
          <p className="font-body text-xs text-[var(--text-muted)]">
            Stap {step + 1} van {recipe.steps.length}
          </p>
        </div>
        <button onClick={onDone}
          className="w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'var(--bg-surface)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Stap inhoud */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            {/* Stap nummer */}
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center font-display font-bold text-2xl text-white"
              style={{ background: 'var(--accent-warm)' }}>
              {step + 1}
            </div>

            {/* Stap titel */}
            <h2 className="font-display font-bold text-[var(--text-primary)] mb-3"
              style={{ fontSize: 'clamp(22px, 6vw, 30px)' }}>
              {current.title}
            </h2>

            {/* Beschrijving */}
            {current.description && (
              <p className="font-body text-[var(--text-muted)] leading-relaxed mb-4 max-w-sm mx-auto"
                style={{ fontSize: 'var(--font-size-body)' }}>
                {current.description}
              </p>
            )}

            {/* Timer */}
            {current.duration && (
              <div className="mb-4">
                {timer === null ? (
                  <button onClick={startTimer}
                    className="px-5 py-2.5 rounded-full font-display font-bold text-white"
                    style={{ background: 'var(--accent-calm)' }}>
                    ⏱ Timer starten ({formatDuration(current.duration)})
                  </button>
                ) : (
                  <div className="text-5xl font-display font-bold" style={{ color: timeLeft < 10 ? 'var(--accent-warm)' : 'var(--text-primary)' }}>
                    {formatDuration(timeLeft)}
                  </div>
                )}
              </div>
            )}

            {/* Tip */}
            {current.tip && (
              <div className="inline-block px-4 py-2 rounded-2xl mt-2 max-w-sm"
                style={{ background: 'var(--hint-color)20', border: '1px solid var(--hint-color)40' }}>
                <p className="font-body text-sm" style={{ color: 'var(--hint-color)' }}>
                  💡 {current.tip}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Volgende knop */}
      <div className="px-6 pb-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-display font-bold text-xl text-white shadow-lg"
          style={{ background: 'var(--accent-warm)' }}
        >
          {isLast ? '🎉 Klaar!' : 'Volgende stap →'}
        </motion.button>
      </div>
    </div>
  )
}

// ── Recept kaart ──────────────────────────────────────────────
function RecipeCard({ recipe, onStart }: { recipe: Recipe; onStart: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }}
      className="bg-[var(--bg-card)] rounded-3xl p-5 border-2 border-[var(--accent-calm)]/20">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">{recipe.icon}</span>
        <div className="flex-1">
          <h2 className="font-display font-bold text-[var(--text-primary)] text-lg">{recipe.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-body text-xs text-[var(--text-muted)]">
              {recipe.steps.length} stappen
            </span>
            {recipe.duration && (
              <span className="font-body text-xs text-[var(--text-muted)]">
                · {recipe.duration} min
              </span>
            )}
            <span className="font-body text-xs text-[var(--text-muted)]">
              · {'⭐'.repeat(recipe.difficulty)}
            </span>
          </div>
          {recipe.description && (
            <p className="font-body text-sm text-[var(--text-muted)] mt-1">{recipe.description}</p>
          )}
        </div>
      </div>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onStart}
        className="w-full py-3 rounded-2xl font-display font-bold text-lg text-white"
        style={{ background: 'var(--accent-warm)' }}>
        🍳 Beginnen!
      </motion.button>
      {recipe.playCount > 0 && (
        <p className="text-center font-body text-xs text-[var(--text-muted)] mt-2">
          {recipe.playCount}× al gemaakt
        </p>
      )}
    </motion.div>
  )
}

// ── Hoofd pagina ──────────────────────────────────────────────
export function RecipePage() {
  const { user } = useAuthStore()
  const childId = user?.id ?? ''
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['recipes', childId],
    queryFn: () => api.get<{ recipes: Recipe[] }>(`/api/recipes/${childId}`),
    enabled: !!childId,
  })

  const recipes = data?.recipes ?? []

  if (activeRecipe) {
    return (
      <RecipePlayer
        recipe={activeRecipe}
        onDone={() => { setDone(activeRecipe.id); setActiveRecipe(null) }}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Mijn recepten 🍳
        </h1>
        <p className="text-[var(--text-muted)] mt-1">Kies een recept en kook stap voor stap!</p>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center p-5 rounded-3xl mb-5"
            style={{ background: 'var(--accent-forest)10', border: '2px solid var(--accent-forest)30' }}
          >
            <p className="font-display font-bold text-2xl" style={{ color: 'var(--accent-forest)' }}>
              🎉 Super gedaan!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ y: [0, -12, 0] }}
                transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-[var(--accent-warm)]" />
            ))}
          </div>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-card)] rounded-3xl border-2 border-[var(--accent-calm)]/20">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="font-display font-bold text-[var(--text-primary)]">Nog geen recepten</p>
          <p className="font-body text-sm text-[var(--text-muted)] mt-1">
            Vraag papa of mama om een recept toe te voegen!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onStart={() => setActiveRecipe(recipe)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default RecipePage
