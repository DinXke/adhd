/**
 * Schema-editor voor ouders.
 * Per dag: activiteiten bekijken, toevoegen, verwijderen.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useAllSchedules, useAddActivity, useDeleteActivity, Schedule, Activity, NewActivityInput } from '../../lib/queries'
import { IconPlus, IconBack } from '../../components/icons/NavIcons'

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']

const ICON_PRESETS = [
  '🌅','☀️','🌙','🛏️','👕','🦷','🥣','🥐','🍽️','🥪',
  '🎒','🚌','🏫','📚','📐','✏️','🎮','🎨','🌳','🛋️',
  '🏃','🚿','💤','🛁','❤️','🌟','🎵','📖','🧹','🐕',
]

function ActivityForm({
  scheduleId,
  onDone,
}: {
  scheduleId: string
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [startTime, setStartTime] = useState('08:00')
  const [duration, setDuration] = useState(30)
  const [color, setColor] = useState('#7BAFA3')
  const [steps, setSteps] = useState<string[]>([''])
  const [error, setError] = useState('')

  const addActivity = useAddActivity(scheduleId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('Vul een naam in')
    const newActivity: NewActivityInput = {
      title: title.trim(),
      icon,
      startTime,
      durationMinutes: duration,
      color,
      notifyBefore: [5, 1],
      steps: steps.filter((s) => s.trim()).map((s) => ({ title: s.trim() })),
    }
    try {
      await addActivity.mutateAsync(newActivity)
      onDone()
    } catch {
      setError('Kon activiteit niet opslaan')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-sm font-medium text-ink">Naam</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="bv. Ontbijt"
          className="px-3 py-2 rounded-lg font-body text-sm text-ink"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="font-body text-sm font-medium text-ink">Starttijd</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="px-3 py-2 rounded-lg font-body text-sm text-ink"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="font-body text-sm font-medium text-ink">Duur (min)</label>
          <input
            type="number"
            min={5}
            max={720}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="px-3 py-2 rounded-lg font-body text-sm text-ink"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          />
        </div>
      </div>

      {/* Icoon-picker */}
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

      {/* Stappen */}
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-sm font-medium text-ink">
          Stappen (optioneel) — voor "Nu Doen"-modus
        </label>
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
                <button
                  type="button"
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  className="text-ink-muted px-2"
                  style={{ minHeight: 40 }}
                >
                  ✕
                </button>
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

      <button
        type="submit"
        disabled={addActivity.isPending}
        className="btn-primary w-full font-body"
      >
        {addActivity.isPending ? 'Opslaan...' : '✅ Activiteit opslaan'}
      </button>
    </form>
  )
}

function ActivityRow({ act, onDelete }: { act: Activity; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'var(--bg-surface)' }}
    >
      <span className="text-xl w-7 text-center">{act.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-ink text-sm truncate">{act.title}</p>
        <p className="font-body text-ink-muted text-xs">
          {act.startTime} · {act.durationMinutes} min
          {act.steps.length > 0 ? ` · ${act.steps.length} stappen` : ''}
        </p>
      </div>
      {confirm ? (
        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="font-body text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--accent-danger)', color: '#fff', minHeight: 32 }}
          >
            Verwijder
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="font-body text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--border-color)', minHeight: 32 }}
          >
            Annuleer
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="text-ink-muted text-lg"
          style={{ minHeight: 36, minWidth: 36 }}
          aria-label="Verwijder"
        >
          🗑️
        </button>
      )}
    </div>
  )
}

export default function ScheduleEditorPage() {
  const { user } = useAuthStore()
  // In een echte multi-kind setup: kind kiezen. Nu: eerste kind via users/children.
  const [childId] = useState<string>('') // TODO: kind-picker
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useAllSchedules(childId || user?.id)
  const deleteActivity = useDeleteActivity()

  const schedule = data?.schedules.find((s: Schedule) => s.dayOfWeek === selectedDay)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display font-bold text-ink flex-1" style={{ fontSize: 'var(--font-size-heading)' }}>
          Schema-editor
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-sm px-4"
          style={{ minHeight: 40, borderRadius: 'var(--btn-radius)' }}
        >
          <IconPlus size={16} className="mr-1" /> Activiteit
        </button>
      </div>

      {/* Dag-tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {DAY_NAMES.map((day, i) => (
          <button
            key={i}
            onClick={() => { setSelectedDay(i); setShowForm(false) }}
            className="font-body text-sm px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0"
            style={{
              background: selectedDay === i ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: selectedDay === i ? '#fff' : 'var(--text-primary)',
              fontWeight: selectedDay === i ? 700 : 400,
              minHeight: 40,
            }}
          >
            {day.slice(0, 2)}
          </button>
        ))}
      </div>

      {/* Formulier */}
      <AnimatePresence>
        {showForm && schedule && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-ink text-base">
                  Activiteit toevoegen — {DAY_NAMES[selectedDay]}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-ink-muted">✕</button>
              </div>
              <ActivityForm scheduleId={schedule.id} onDone={() => setShowForm(false)} />
            </div>
          </motion.div>
        )}
        {showForm && !schedule && (
          <div className="card p-4 mb-4 text-center">
            <p className="font-body text-ink-muted text-sm">
              Maak eerst een schema aan voor {DAY_NAMES[selectedDay]}.
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* Activiteiten */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
          ))}
        </div>
      ) : schedule ? (
        <div className="flex flex-col gap-2">
          {schedule.activities.map((act: Activity) => (
            <ActivityRow
              key={act.id}
              act={act}
              onDelete={() => deleteActivity.mutate(act.id)}
            />
          ))}
          {schedule.activities.length === 0 && (
            <div className="text-center py-8">
              <p className="font-body text-ink-muted text-sm">
                Nog geen activiteiten op {DAY_NAMES[selectedDay]}.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="font-body text-ink-muted text-sm">Geen schema voor {DAY_NAMES[selectedDay]}.</p>
        </div>
      )}
    </div>
  )
}
