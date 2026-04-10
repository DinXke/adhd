/**
 * Zelfstandigheidschecklist-editor voor ouders.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useMyChildren, useIndependenceTasks, useCreateIndependenceTask,
  useSeedIndependenceTasks, useToggleIndependenceTask,
} from '../../lib/queries'

const CATEGORIES = [
  { key: 'zelfredzaamheid', label: 'Zelfredzaamheid', icon: '💪', color: '#7BAFA3' },
  { key: 'thuis', label: 'Thuis', icon: '🏠', color: '#C17A3A' },
  { key: 'school', label: 'School', icon: '🎒', color: '#5B8C5A' },
  { key: 'sociaal', label: 'Sociaal', icon: '👫', color: '#D4973B' },
]

const FREQUENCIES = [
  { key: 'daily', label: 'Elke dag' },
  { key: 'weekly', label: 'Elke week' },
  { key: 'milestone', label: 'Mijlpaal' },
]

const ICONS = ['✅', '🦷', '🧼', '🛏️', '🎒', '👕', '📓', '📅', '⏰', '🍽️', '🗑️', '👋', '📱', '🚿', '👞', '📚', '✏️', '🧹', '🍳', '💊']

function AddTaskForm({ childId, onDone }: { childId: string; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', icon: '✅', category: 'thuis', frequency: 'daily', description: '' })
  const create = useCreateIndependenceTask()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    await create.mutateAsync({ childId, ...form })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Icoon kiezer */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">Icoon</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => setForm(f => ({ ...f, icon }))}
              className="w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all"
              style={{ borderColor: form.icon === icon ? 'var(--accent-primary)' : 'var(--border-color)', background: form.icon === icon ? 'var(--accent-primary)11' : 'var(--bg-card)' }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Titel */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Taak</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Bv. Schooltas inpakken"
          required
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {/* Omschrijving */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Uitleg (optioneel)</label>
        <input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Korte uitleg voor het kind"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {/* Categorie */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">Categorie</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(c => (
            <button key={c.key} type="button" onClick={() => setForm(f => ({ ...f, category: c.key }))}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{
                borderColor: form.category === c.key ? c.color : 'var(--border-color)',
                background: form.category === c.key ? `${c.color}18` : 'var(--bg-card)',
                color: form.category === c.key ? c.color : 'var(--text-secondary)',
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frequentie */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">Frequentie</label>
        <div className="flex gap-2">
          {FREQUENCIES.map(f => (
            <button key={f.key} type="button" onClick={() => setForm(fm => ({ ...fm, frequency: f.key }))}
              className="flex-1 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{
                borderColor: form.frequency === f.key ? 'var(--accent-primary)' : 'var(--border-color)',
                background: form.frequency === f.key ? 'var(--accent-primary)11' : 'var(--bg-card)',
                color: form.frequency === f.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onDone}
          className="flex-1 py-3 rounded-xl border border-border text-ink-muted font-medium text-sm">
          Annuleren
        </button>
        <button type="submit" disabled={create.isPending}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50">
          {create.isPending ? 'Toevoegen...' : 'Toevoegen'}
        </button>
      </div>
    </form>
  )
}

export function IndependenceEditorPage() {
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [showForm, setShowForm] = useState(false)

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data, refetch } = useIndependenceTasks(childId)
  const seedTasks = useSeedIndependenceTasks()
  const toggleTask = useToggleIndependenceTask()

  const tasks = data?.tasks ?? []
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    tasks: tasks.filter((t: any) => t.category === cat.key),
  })).filter(g => g.tasks.length > 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Vaardigheden</h1>
          <p className="text-sm text-ink-muted mt-0.5">Zelfstandigheidstaken per kind</p>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:border-accent focus:outline-none">
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:opacity-90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Toevoegen
          </button>
        </div>
      </div>

      {/* Formulier */}
      <AnimatePresence>
        {showForm && childId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-card border border-accent/30 rounded-2xl p-6">
              <h2 className="font-semibold text-ink text-lg mb-5">Nieuwe vaardigheid</h2>
              <AddTaskForm childId={childId} onDone={() => { setShowForm(false); refetch() }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standaardtaken-prompt */}
      {tasks.length === 0 && childId && (
        <div className="bg-card border border-border rounded-2xl p-6 text-center mb-6">
          <div className="text-5xl mb-3">🌱</div>
          <p className="font-semibold text-ink mb-1">Nog geen taken</p>
          <p className="text-sm text-ink-muted mb-4">
            Genereer leeftijdspassende standaardtaken of voeg ze handmatig toe.
          </p>
          <button
            onClick={async () => {
              await seedTasks.mutateAsync({ childId })
              refetch()
            }}
            disabled={seedTasks.isPending}
            className="px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50"
          >
            {seedTasks.isPending ? 'Genereren...' : '✨ Standaardtaken genereren'}
          </button>
        </div>
      )}

      {/* Taken per categorie */}
      <div className="space-y-6">
        {grouped.map(group => (
          <div key={group.key}>
            <h3 className="text-sm font-semibold text-ink-muted mb-2 flex items-center gap-1.5">
              <span>{group.icon}</span> {group.label}
            </h3>
            <div className="space-y-2">
              {group.tasks.map((task: any) => (
                <div key={task.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xl">{task.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate" style={{ opacity: task.isActive ? 1 : 0.4 }}>
                      {task.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {FREQUENCIES.find(f => f.key === task.frequency)?.label}
                      {' · '}
                      {task.weekCount ?? 0}× deze week gedaan
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await toggleTask.mutateAsync({ taskId: task.id, isActive: !task.isActive })
                      refetch()
                    }}
                    className="p-2 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors"
                    title={task.isActive ? 'Deactiveren' : 'Activeren'}
                  >
                    {task.isActive ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IndependenceEditorPage
