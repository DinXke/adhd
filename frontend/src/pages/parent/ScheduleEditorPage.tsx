/**
 * Schema-editor voor ouders.
 * Per dag: activiteiten bekijken, toevoegen, verwijderen.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useMyChildren, useAllSchedules, useAddActivity, useDeleteActivity, Schedule, Activity, NewActivityInput } from '../../lib/queries'
import { IconPlus, IconBack } from '../../components/icons/NavIcons'
import { api } from '../../lib/api'

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

// ── Vakantie panel ────────────────────────────────────────────
function VacationPanel({ childId, schedules }: { childId: string; schedules: Schedule[] }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['vacations', childId],
    queryFn: () => api.get<{ periods: any[] }>(`/api/vacations/${childId}`),
    enabled: !!childId,
  })
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [scheduleId, setScheduleId] = useState('')

  const createMutation = useMutation({
    mutationFn: () => api.post(`/api/vacations/${childId}`, {
      title, startDate, endDate,
      scheduleId: scheduleId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vacations', childId] })
      setShowForm(false); setTitle(''); setStartDate(''); setEndDate(''); setScheduleId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/vacations/${childId}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vacations', childId] }),
  })

  const periods = data?.periods ?? []
  // Vakantie-specifieke schema's (dayOfWeek >= 7)
  const vacationSchedules = schedules.filter(s => s.dayOfWeek >= 7)

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-ink text-lg">🏖️ Vakantieperiodes</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Stel vrije dagen en vakanties in — koppel optioneel een vakantieschema
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-2 rounded-xl bg-accent text-white text-sm font-medium"
        >
          + Periode
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4">
            <div className="card p-4 space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="bv. Herfstvakantie, Vrije dag, Zomervakantie"
                className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Van</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Tot</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Vakantieschema (optioneel)
                </label>
                <select value={scheduleId} onChange={e => setScheduleId(e.target.value)} className={inputCls}>
                  <option value="">Geen schema (vrije dag)</option>
                  {vacationSchedules.map(s => (
                    <option key={s.id} value={s.id}>{s.label ?? `Vakantie-schema ${s.dayOfWeek - 6}`}</option>
                  ))}
                  {schedules.filter(s => s.dayOfWeek < 7).map(s => (
                    <option key={s.id} value={s.id}>
                      {DAY_NAMES[s.dayOfWeek]} (normaal schema)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-ink-muted mt-1">
                  Tip: maak een vakantieschema aan via dag 8+ (Vakantie Ma, Vakantie Di, ...) in de dagtabs hierboven
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm text-ink-muted">Annuleren</button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!title || !startDate || !endDate || createMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50">
                  {createMutation.isPending ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {periods.length === 0 ? (
        <div className="text-center py-6 bg-surface rounded-xl border border-border">
          <p className="text-sm text-ink-muted">Nog geen vakantieperiodes ingesteld</p>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((p: any) => {
            const start = new Date(p.startDate)
            const end = new Date(p.endDate)
            const now = new Date()
            const isActive = now >= start && now <= end
            const isPast = now > end
            return (
              <div key={p.id}
                className="card p-3 flex items-center gap-3"
                style={{ opacity: isPast ? 0.5 : 1, borderLeft: isActive ? '3px solid #9B7CC8' : '3px solid transparent' }}>
                <span className="text-xl flex-shrink-0">{isActive ? '🏖️' : isPast ? '📅' : '📆'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{p.title}</p>
                  <p className="text-xs text-ink-muted">
                    {start.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })} — {end.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.schedule ? ` · Schema: ${p.schedule.label ?? 'dag ' + p.schedule.dayOfWeek}` : ' · Vrije dag'}
                    {isActive && ' · Nu actief'}
                  </p>
                </div>
                <button onClick={() => deleteMutation.mutate(p.id)}
                  className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ScheduleEditorPage() {
  const { user } = useAuthStore()
  const { data: childrenData } = useMyChildren()
  const children = childrenData?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const childId = selectedChildId || children[0]?.id || user?.id || ''
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading, refetch } = useAllSchedules(childId)
  const deleteActivity = useDeleteActivity()
  const [creating, setCreating] = useState(false)

  const schedule = data?.schedules.find((s: Schedule) => s.dayOfWeek === selectedDay)

  // Auto-create schedule for selected day if it doesn't exist
  async function ensureScheduleAndShowForm() {
    if (schedule) {
      setShowForm(true)
      return
    }
    if (!childId) return
    setCreating(true)
    try {
      await api.post('/api/schedules', { childId, dayOfWeek: selectedDay })
      await refetch()
      setShowForm(true)
    } catch {}
    setCreating(false)
  }

  return (
    <div>
      {/* Kind-selector */}
      {children.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                childId === c.id ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display font-bold text-ink flex-1" style={{ fontSize: 'var(--font-size-heading)' }}>
          Schema-editor
        </h1>
        <button
          onClick={ensureScheduleAndShowForm}
          disabled={creating}
          className="btn-primary text-sm px-4"
          style={{ minHeight: 40, borderRadius: 'var(--btn-radius)' }}
        >
          {creating ? 'Schema aanmaken...' : <><IconPlus size={16} className="mr-1" /> Activiteit</>}
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
        {showForm && !schedule && !creating && (
          <div className="card p-4 mb-4 text-center">
            <p className="font-body text-ink-muted text-sm mb-3">
              Nog geen schema voor {DAY_NAMES[selectedDay]}.
            </p>
            <button
              onClick={ensureScheduleAndShowForm}
              className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium"
            >
              Schema aanmaken
            </button>
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

      {/* Vakantieperiodes */}
      {childId && <VacationPanel childId={childId} schedules={data?.schedules ?? []} />}
    </div>
  )
}
