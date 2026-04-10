/**
 * Zelfstandigheidschecklist voor kinderen — dagelijkse/wekelijkse vaardigheden afvinken.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useIndependenceTasks, useCompleteIndependenceTask } from '../../lib/queries'
import { TtsButton } from '../../components/TtsButton'

const CATEGORY_COLORS: Record<string, string> = {
  zelfredzaamheid: '#7BAFA3',
  thuis: '#C17A3A',
  school: '#5B8C5A',
  sociaal: '#D4973B',
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Elke dag',
  weekly: 'Elke week',
  milestone: 'Mijlpaal',
}

function TaskCard({ task, onComplete }: { task: any; onComplete: (id: string) => void }) {
  const [celebrating, setCelebrating] = useState(false)
  const color = CATEGORY_COLORS[task.category] ?? '#7BAFA3'
  const done = task.frequency === 'daily' ? task.completedToday : task.completedThisWeek

  const handleTap = () => {
    if (done) return
    setCelebrating(true)
    onComplete(task.id)
    setTimeout(() => setCelebrating(false), 1200)
    if (navigator.vibrate) navigator.vibrate([40, 20, 40])
  }

  return (
    <motion.button
      onClick={handleTap}
      disabled={done}
      layout
      className="w-full text-left"
      whileTap={!done ? { scale: 0.97 } : undefined}
    >
      <div
        className="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all"
        style={{
          background: done ? `${color}18` : 'var(--bg-card)',
          borderColor: done ? color : 'var(--border-color)',
          opacity: done ? 0.85 : 1,
        }}
      >
        {/* Checkbox */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl transition-all"
          style={{
            background: done ? color : 'var(--bg-primary)',
            border: done ? 'none' : `2px solid ${color}55`,
          }}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                ✓
              </motion.span>
            ) : (
              <motion.span key="icon">{task.icon}</motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Tekst */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className="font-body font-semibold text-base flex-1"
              style={{
                color: done ? color : 'var(--text-primary)',
                textDecoration: done ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </p>
            <TtsButton text={task.title} size={28} />
          </div>
          {task.description && (
            <p className="font-body text-xs text-ink-muted mt-0.5">{task.description}</p>
          )}
          <p className="font-body text-xs mt-0.5" style={{ color: `${color}99` }}>
            {FREQUENCY_LABELS[task.frequency]}
          </p>
        </div>

        {/* Celebrating burst */}
        <AnimatePresence>
          {celebrating && (
            <motion.span
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl absolute"
            >
              ⭐
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

export function IndependencePage() {
  const { user } = useAuthStore()
  const childId = user?.id ?? ''
  const [activeCategory, setActiveCategory] = useState('all')

  const { data, isLoading, refetch } = useIndependenceTasks(childId)
  const complete = useCompleteIndependenceTask()

  const tasks = data?.tasks ?? []
  const categories = ['all', ...Array.from(new Set(tasks.map((t: any) => t.category)))]

  const filtered = activeCategory === 'all'
    ? tasks
    : tasks.filter((t: any) => t.category === activeCategory)

  const doneCount = tasks.filter((t: any) => t.frequency === 'daily' ? t.completedToday : t.completedThisWeek).length
  const totalCount = tasks.length

  async function handleComplete(id: string) {
    await complete.mutateAsync({ taskId: id })
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-4 h-4 rounded-full animate-bounce"
              style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <div className="text-6xl mb-4">🌱</div>
        <p className="font-display font-bold text-ink text-xl mb-2">Nog geen taken!</p>
        <p className="font-body text-ink-muted text-sm">Vraag papa of mama om je taken in te stellen.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-lg mx-auto">
      {/* Header + voortgang */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-ink text-2xl">Mijn vaardigheden</h1>
        <p className="font-body text-ink-muted text-sm mt-0.5">
          {doneCount === totalCount && totalCount > 0
            ? '🎉 Alles gedaan! Geweldig!'
            : `${doneCount} van ${totalCount} gedaan`}
        </p>
        {/* Progress balk */}
        <div className="mt-3 flex rounded-full overflow-hidden h-3 bg-surface border border-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ background: 'var(--accent-success)' }}
          />
        </div>
      </div>

      {/* Categorie filter */}
      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium font-body border transition-all"
              style={{
                background: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? 'var(--accent-primary)') : 'var(--bg-card)',
                borderColor: activeCategory === cat ? 'transparent' : 'var(--border-color)',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' ? 'Alles' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Taken */}
      <motion.div layout className="space-y-3">
        {filtered.map((task: any) => (
          <TaskCard key={task.id} task={task} onComplete={handleComplete} />
        ))}
      </motion.div>
    </div>
  )
}

export default IndependencePage
