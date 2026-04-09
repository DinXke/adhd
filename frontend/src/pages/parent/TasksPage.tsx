/**
 * Takenbeheer voor ouders.
 * Taken aanmaken met substappen, bestaande taken bekijken/verwijderen.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useTasks, useCreateTask, useDeleteTask, Task } from '../../lib/queries'
import { IconPlus } from '../../components/icons/NavIcons'

const ICON_PRESETS = ['📚','📐','✏️','🧹','🛁','🐕','🛒','🏃','🎵','🧺','🍳','💊','📱','🎒','🌱']

function TaskForm({ childId, onDone }: { childId: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('📚')
  const [duration, setDuration] = useState(15)
  const [steps, setSteps] = useState<string[]>([''])
  const [scheduleFor, setScheduleFor] = useState<'today' | 'none'>('today')
  const [error, setError] = useState('')

  const createTask = useCreateTask()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('Geef een naam op')
    try {
      await createTask.mutateAsync({
        childId,
        title: title.trim(),
        icon,
        durationMinutes: duration,
        scheduledFor: scheduleFor === 'today' ? new Date().toISOString() : undefined,
        steps: steps.filter((s) => s.trim()).map((s) => ({ title: s.trim() })),
      })
      onDone()
    } catch {
      setError('Kon taak niet opslaan')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-sm font-medium text-ink">Naam</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="bv. Huiswerk wiskunde"
          className="px-3 py-2 rounded-lg font-body text-sm text-ink"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="font-body text-sm font-medium text-ink">Duur (min)</label>
          <input
            type="number"
            min={1}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="px-3 py-2 rounded-lg font-body text-sm text-ink"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="font-body text-sm font-medium text-ink">Wanneer</label>
          <select
            value={scheduleFor}
            onChange={(e) => setScheduleFor(e.target.value as any)}
            className="px-3 py-2 rounded-lg font-body text-sm text-ink"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            <option value="today">Vandaag</option>
            <option value="none">Geen datum</option>
          </select>
        </div>
      </div>

      {/* Icoon */}
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-sm font-medium text-ink">Icoon</label>
        <div className="flex flex-wrap gap-2">
          {ICON_PRESETS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: icon === ic ? 'var(--accent-secondary)' : 'var(--bg-surface)',
                border: icon === ic ? '2px solid var(--accent-secondary)' : '2px solid transparent',
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Substappen */}
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-sm font-medium text-ink">Substappen</label>
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={step}
                onChange={(e) => setSteps(steps.map((s, j) => (j === i ? e.target.value : s)))}
                placeholder={`Stap ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-lg font-body text-sm text-ink"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              />
              {steps.length > 1 && (
                <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  className="text-ink-muted px-2" style={{ minHeight: 40 }}>✕</button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSteps([...steps, ''])}
            className="text-left font-body text-sm text-ink-muted flex items-center gap-1"
            style={{ minHeight: 36 }}
          >
            <IconPlus size={16} /> Stap toevoegen
          </button>
        </div>
      </div>

      {error && <p className="text-sm font-body" style={{ color: 'var(--accent-danger)' }}>{error}</p>}

      <button type="submit" disabled={createTask.isPending} className="btn-primary w-full font-body">
        {createTask.isPending ? 'Opslaan...' : '✅ Taak opslaan'}
      </button>
    </form>
  )
}

function TaskCard({ task, onDelete }: { task: Task; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const isDone = !!task.completedAt
  const doneSteps = task.steps.filter((s) => !!s.completedAt).length

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-2xl">{task.icon ?? '📋'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-ink text-sm truncate"
            style={{ textDecoration: isDone ? 'line-through' : undefined }}>
            {task.title}
          </p>
          <p className="font-body text-ink-muted text-xs">
            {task.durationMinutes && `${task.durationMinutes} min · `}
            {task.steps.length > 0
              ? `${doneSteps}/${task.steps.length} stappen`
              : 'Geen substappen'}
            {isDone && ' · ✅ Klaar'}
          </p>
        </div>
        <span className="text-ink-muted text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-2"
              style={{ borderTop: '1px solid var(--border-color)' }}>
              {task.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 pt-2">
                  <span className="text-base">{step.completedAt ? '✅' : '○'}</span>
                  <span className="font-body text-sm text-ink"
                    style={{ textDecoration: step.completedAt ? 'line-through' : undefined }}>
                    {step.title}
                  </span>
                </div>
              ))}
              {task.steps.length === 0 && (
                <p className="font-body text-ink-muted text-xs pt-2">Geen substappen.</p>
              )}

              <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                {confirm ? (
                  <>
                    <button onClick={onDelete}
                      className="font-body text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--accent-danger)', color: '#fff', minHeight: 34 }}>
                      Verwijder
                    </button>
                    <button onClick={() => setConfirm(false)}
                      className="font-body text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--border-color)', minHeight: 34 }}>
                      Annuleer
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirm(true)}
                    className="font-body text-xs px-3 py-1.5 rounded-lg text-ink-muted"
                    style={{ background: 'var(--bg-surface)', minHeight: 34 }}>
                    🗑️ Verwijderen
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  // TODO: kind-picker voor multi-kind. Nu: admin/ouder ziet eigen taken (placeholder)
  const childId = user?.id ?? ''

  const { data, isLoading } = useTasks(childId)
  const deleteTask = useDeleteTask()

  const tasks = data?.tasks ?? []
  const pending = tasks.filter((t) => !t.completedAt)
  const done = tasks.filter((t) => t.completedAt)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display font-bold text-ink flex-1" style={{ fontSize: 'var(--font-size-heading)' }}>
          Taken
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm px-4"
          style={{ minHeight: 40, borderRadius: 'var(--btn-radius)' }}
        >
          <IconPlus size={16} className="mr-1" /> Nieuwe taak
        </button>
      </div>

      {/* Formulier */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-ink text-base">Nieuwe taak</h2>
                <button onClick={() => setShowForm(false)} className="text-ink-muted">✕</button>
              </div>
              <TaskForm childId={childId} onDone={() => setShowForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Openstaande taken */}
          {pending.length > 0 && (
            <section className="mb-6">
              <h2 className="font-display font-semibold text-ink-muted text-sm mb-2 uppercase tracking-wide">
                Te doen ({pending.length})
              </h2>
              <div className="flex flex-col gap-2">
                {pending.map((task) => (
                  <TaskCard key={task.id} task={task} onDelete={() => deleteTask.mutate(task.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Voltooide taken */}
          {done.length > 0 && (
            <section>
              <h2 className="font-display font-semibold text-ink-muted text-sm mb-2 uppercase tracking-wide">
                Klaar vandaag ({done.length})
              </h2>
              <div className="flex flex-col gap-2">
                {done.map((task) => (
                  <TaskCard key={task.id} task={task} onDelete={() => deleteTask.mutate(task.id)} />
                ))}
              </div>
            </section>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body text-ink-muted">Nog geen taken. Maak er een aan.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
