/**
 * Recepten beheer — ouder maakt stap-voor-stap recepten aan
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMyChildren } from '../../lib/queries'
import { api } from '../../lib/api'

const RECIPE_ICONS = ['🍳', '🥗', '🍝', '🥪', '🧁', '🍪', '🥞', '🍲', '🥘', '🍜', '🥙', '🌮', '🍕', '🥣']

interface StepForm {
  title: string
  description: string
  duration: string
  tip: string
}

const defaultStep = (): StepForm => ({ title: '', description: '', duration: '', tip: '' })

export function RecipeEditorPage() {
  const qc = useQueryClient()
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('🍳')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [difficulty, setDifficulty] = useState(1)
  const [steps, setSteps] = useState<StepForm[]>([defaultStep()])

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data, refetch } = useQuery({
    queryKey: ['recipes', childId],
    queryFn: () => api.get<{ recipes: any[] }>(`/api/recipes/${childId}`),
    enabled: !!childId,
  })

  const recipes = data?.recipes ?? []

  const create = useMutation({
    mutationFn: () => api.post(`/api/recipes/${childId}`, {
      title,
      icon,
      description: description || undefined,
      duration: duration ? parseInt(duration) : undefined,
      difficulty,
      steps: steps.filter(s => s.title.trim()).map(s => ({
        title: s.title,
        description: s.description || undefined,
        duration: s.duration ? parseInt(s.duration) * 60 : undefined,
        tip: s.tip || undefined,
      })),
    }),
    onSuccess: () => {
      setShowForm(false)
      setTitle(''); setIcon('🍳'); setDescription(''); setDuration('')
      setDifficulty(1); setSteps([defaultStep()])
      refetch()
    },
  })

  const deleteRecipe = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/recipes/${childId}/recipes/${id}`),
    onSuccess: () => refetch(),
  })

  function addStep() { setSteps(s => [...s, defaultStep()]) }
  function removeStep(i: number) { setSteps(s => s.filter((_, idx) => idx !== i)) }
  function updateStep(i: number, field: keyof StepForm, value: string) {
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Recepten</h1>
          <p className="text-sm text-ink-muted mt-0.5">Stap-voor-stap kookrecepten voor {children.find(c => c.id === childId)?.name}</p>
        </div>
        <div className="flex gap-2">
          {children.length > 1 && (
            <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm">
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium">
            + Recept
          </button>
        </div>
      </div>

      {/* Nieuw recept formulier */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6">
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-ink">Nieuw recept</h2>

              {/* Icon */}
              <div className="flex gap-2 flex-wrap">
                {RECIPE_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={`text-xl w-10 h-10 rounded-xl transition-all ${icon === ic ? 'bg-accent/20 border-2 border-accent' : 'bg-surface border border-border'}`}>
                    {ic}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Naam van het recept"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
                </div>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Omschrijving (optioneel)"
                  className="px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
                <input value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder="Duur in min" inputMode="numeric"
                  className="px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
              </div>

              <div className="flex gap-2">
                {[1, 2, 3].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-all ${difficulty === d ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'}`}>
                    {'⭐'.repeat(d)}
                  </button>
                ))}
              </div>

              {/* Stappen */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink text-sm">Stappen</p>
                  <button onClick={addStep} className="text-sm text-accent hover:underline">+ Stap</button>
                </div>
                {steps.map((step, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <input value={step.title} onChange={e => updateStep(i, 'title', e.target.value)}
                        placeholder="Wat moet er gedaan worden?"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
                      {steps.length > 1 && (
                        <button onClick={() => removeStep(i)} className="text-ink-muted hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pl-8">
                      <input value={step.description} onChange={e => updateStep(i, 'description', e.target.value)}
                        placeholder="Extra uitleg"
                        className="col-span-2 px-2 py-1 rounded-lg border border-border bg-card text-ink text-xs focus:border-accent focus:outline-none" />
                      <input value={step.duration} onChange={e => updateStep(i, 'duration', e.target.value)}
                        placeholder="Min." inputMode="numeric"
                        className="px-2 py-1 rounded-lg border border-border bg-card text-ink text-xs focus:border-accent focus:outline-none" />
                      <input value={step.tip} onChange={e => updateStep(i, 'tip', e.target.value)}
                        placeholder="Tip 💡"
                        className="col-span-3 px-2 py-1 rounded-lg border border-border bg-card text-ink text-xs focus:border-accent focus:outline-none" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm text-ink-muted">
                  Annuleren
                </button>
                <button onClick={() => create.mutate()}
                  disabled={!title || steps.every(s => !s.title.trim()) || create.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50">
                  {create.isPending ? 'Opslaan...' : 'Recept opslaan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receptenlijst */}
      {recipes.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="font-semibold text-ink">Nog geen recepten</p>
          <p className="text-sm text-ink-muted mt-1">Klik op "+ Recept" om stap-voor-stap kookrecepten toe te voegen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((r: any) => (
            <div key={r.id} className="card p-4 flex items-center gap-4">
              <span className="text-3xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink">{r.title}</p>
                <p className="text-xs text-ink-muted">
                  {r.steps.length} stappen · {'⭐'.repeat(r.difficulty)}
                  {r.duration ? ` · ${r.duration} min` : ''}
                  {r.playCount > 0 ? ` · ${r.playCount}× gemaakt` : ''}
                </p>
              </div>
              <button onClick={() => deleteRecipe.mutate(r.id)}
                className="p-2 rounded-xl border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecipeEditorPage
