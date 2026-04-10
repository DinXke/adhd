/**
 * Oefeningen — Genereren, reviewen en statistieken
 * Route: /dashboard/exercises/review
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePendingExercises, useApproveExercise, useDeleteExercise, useMyChildren } from '../../lib/queries'
import { api } from '../../lib/api'

const SUBJECT_LABELS: Record<string, string> = {
  wiskunde: '🔢 Wiskunde',
  taal: '📝 Taal',
  spelling: '✏️ Spelling',
  lezen: '📖 Lezen',
  wereldorientatie: '🌍 Wereldoriëntatie',
}

const SUBJECT_THEMES: Record<string, string[]> = {
  wiskunde: ['Optellen & aftrekken', 'Vermenigvuldigen', 'Tafels', 'Breuken', 'Kloklezen', 'Geld tellen', 'Meten & wegen', 'Vormen & figuren'],
  taal: ['Zinsbouw', 'Hoofdletters', 'Werkwoorden', 'Zelfstandige naamwoorden', 'Lidwoorden', 'Leestekens'],
  spelling: ['ie/ei', 'au/ou', 'Dubbele medeklinker', 'Verdubbeling', 'Verlengingsregel', 'dt-regel'],
  lezen: ['Begrijpend lezen', 'Woordbetekenis', 'Samenvatten', 'Vragen over tekst'],
  wereldorientatie: ['Dieren & natuur', 'Het menselijk lichaam', 'Seizoenen & weer', 'België & buurlanden', 'Historische tijdlijn', 'Ruimte & heelal', 'Planten & bomen', 'Hoe werkt dat?', 'Wist je dat? feiten'],
}

// ── Genereren panel ────────────────────────────────────────────
function GeneratePanel() {
  const { data: childrenData } = useMyChildren()
  const qc = useQueryClient()
  const children = childrenData?.children ?? []

  const [subject, setSubject] = useState('wiskunde')
  const [theme, setTheme] = useState('')
  const [difficulty, setDifficulty] = useState(2)
  const [count, setCount] = useState(10)
  const [childId, setChildId] = useState('')
  const [success, setSuccess] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const themes = SUBJECT_THEMES[subject] ?? []

  const generate = useMutation({
    mutationFn: () => api.post<{ count: number }>('/api/exercises/generate', {
      subject,
      theme: theme || themes[0] || subject,
      difficulty,
      count,
      childId: childId || children[0]?.id || undefined,
    }),
    onSuccess: (res) => {
      setSuccess(res.count)
      setErrorMsg(null)
      qc.invalidateQueries({ queryKey: ['pending-exercises'] })
      setTimeout(() => setSuccess(null), 4000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message ?? 'Genereren mislukt. Controleer of CLAUDE_API_KEY is ingesteld.')
    },
  })

  const estimatedCost = (count * 0.00003).toFixed(5)

  return (
    <div className="card p-5 space-y-4 mb-6">
      <div>
        <h2 className="font-semibold text-ink text-base">✨ Genereer oefeningen met AI</h2>
        <p className="text-xs text-ink-muted mt-0.5">Claude Haiku maakt oefeningen op maat — je kan ze daarna goedkeuren.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Vak */}
        <div>
          <label className="text-xs font-medium text-ink-muted mb-1 block">Vak</label>
          <select
            value={subject}
            onChange={e => { setSubject(e.target.value); setTheme('') }}
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
          >
            {Object.entries(SUBJECT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Kind */}
        {children.length > 1 && (
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Voor</label>
            <select
              value={childId}
              onChange={e => setChildId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">Alle kinderen</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Thema */}
      <div>
        <label className="text-xs font-medium text-ink-muted mb-1 block">Thema</label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {themes.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                theme === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted hover:border-accent/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={theme}
          onChange={e => setTheme(e.target.value)}
          placeholder={`Of typ zelf een thema (bv. "${themes[0] ?? 'tafels van 6'}")`}
          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {/* Niveau + Aantal */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-ink-muted mb-1 block">Niveau (1–5)</label>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  difficulty === d ? 'bg-accent text-white' : 'bg-surface text-ink-muted border border-border'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted mb-1 block">Aantal ({count})</label>
          <input
            type="range"
            min={1} max={20} step={1}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-ink-muted mt-0.5">
            <span>1</span>
            <span>~€{estimatedCost}</span>
            <span>20</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(196,93,76,0.1)', color: 'var(--accent-danger, #C45D4C)' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {success !== null && (
        <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(91,140,90,0.1)', color: 'var(--accent-success)' }}>
          ✅ {success} oefeningen gegenereerd! Ze staan klaar om te reviewen.
        </div>
      )}

      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="w-full py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50"
      >
        {generate.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Genereren...
          </span>
        ) : `✨ ${count} oefeningen genereren`}
      </button>
    </div>
  )
}

// ── AI Statistieken panel ──────────────────────────────────────
function StatsPanel() {
  const { data } = useQuery({
    queryKey: ['exercise-generation-stats'],
    queryFn: () => api.get<{ stats: any }>('/api/exercises/generation-stats'),
    staleTime: 60_000,
  })

  const stats = data?.stats
  if (!stats) return null

  const rows = [
    { label: 'Vandaag', ...stats.today },
    { label: 'Deze week', ...stats.week },
    { label: 'Deze maand', ...stats.month },
    { label: 'Dit jaar', ...stats.year },
    { label: 'Totaal', ...stats.allTime },
  ]

  return (
    <div className="card p-5 mb-6">
      <h2 className="font-semibold text-ink text-base mb-3">📊 AI-gebruik statistieken</h2>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
            <span className="text-ink-muted">{r.label}</span>
            <div className="flex items-center gap-4">
              <span className="font-medium text-ink">{r.count} oefeningen</span>
              <span className="text-ink-muted text-xs font-mono">~€{r.estimatedCostEur}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-muted mt-3">
        * Kostenschatting gebaseerd op Claude Haiku API-tarieven (~€0,00003 per oefening).
      </p>
    </div>
  )
}

// ── Auto-schedule panel ───────────────────────────────────────
function AutoSchedulePanel() {
  const { data: childrenData } = useMyChildren()
  const children = childrenData?.children ?? []
  const qc = useQueryClient()

  const [childId, setChildId] = useState('')
  const activeChildId = childId || children[0]?.id || ''

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['exercise-auto-schedule', activeChildId],
    queryFn: () => api.get<{ config: any }>(`/api/exercises/auto-schedule/${activeChildId}`),
    enabled: !!activeChildId,
  })

  const [enabled, setEnabled] = useState(false)
  const [subjects, setSubjects] = useState<{ subject: string; theme: string; difficulty: number; count: number }[]>([
    { subject: 'wiskunde', theme: 'Tafels', difficulty: 2, count: 5 },
  ])
  const [intervalHours, setIntervalHours] = useState(24)
  const [initialized, setInitialized] = useState(false)

  // Sync state from server
  const config = scheduleData?.config
  if (config && !initialized) {
    setEnabled(config.enabled ?? false)
    if (config.subjects?.length) setSubjects(config.subjects)
    if (config.intervalHours) setIntervalHours(config.intervalHours)
    setInitialized(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => api.post('/api/exercises/auto-schedule', {
      childId: activeChildId,
      enabled,
      subjects,
      intervalHours,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise-auto-schedule', activeChildId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/exercises/auto-schedule/${activeChildId}`),
    onSuccess: () => {
      setEnabled(false)
      qc.invalidateQueries({ queryKey: ['exercise-auto-schedule', activeChildId] })
    },
  })

  const updateSubject = (idx: number, field: string, value: any) => {
    setSubjects(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const addSubject = () => {
    setSubjects(prev => [...prev, { subject: 'wiskunde', theme: '', difficulty: 2, count: 5 }])
  }

  const removeSubject = (idx: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="card p-5 space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink text-base">Automatisch genereren</h2>
          <p className="text-xs text-ink-muted mt-0.5">Laat oefeningen automatisch op interval genereren.</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className="relative w-12 h-7 rounded-full transition-colors"
          style={{ background: enabled ? 'var(--accent-success)' : 'var(--border-color)' }}
        >
          <span
            className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
            style={{ left: enabled ? 22 : 2 }}
          />
        </button>
      </div>

      {enabled && (
        <>
          {children.length > 1 && (
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1 block">Voor</label>
              <select
                value={activeChildId}
                onChange={e => { setChildId(e.target.value); setInitialized(false) }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
              >
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Subject configs */}
          <div className="space-y-3">
            {subjects.map((sub, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">Vak {idx + 1}</span>
                  {subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubject(idx)}
                      className="text-xs text-ink-muted hover:text-red-500"
                    >
                      Verwijder
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={sub.subject}
                    onChange={e => updateSubject(idx, 'subject', e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-ink"
                  >
                    {Object.entries(SUBJECT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    value={sub.theme}
                    onChange={e => updateSubject(idx, 'theme', e.target.value)}
                    placeholder="Thema"
                    className="px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-ink"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-ink-muted">Niveau (1-5)</label>
                    <select
                      value={sub.difficulty}
                      onChange={e => updateSubject(idx, 'difficulty', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-ink"
                    >
                      {[1,2,3,4,5].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-ink-muted">Aantal</label>
                    <input
                      type="number"
                      min={1} max={20}
                      value={sub.count}
                      onChange={e => updateSubject(idx, 'count', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-ink"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSubject}
              className="text-xs text-accent hover:underline"
            >
              + Vak toevoegen
            </button>
          </div>

          {/* Interval selector */}
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Interval</label>
            <select
              value={intervalHours}
              onChange={e => setIntervalHours(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value={12}>Elke 12 uur</option>
              <option value={24}>Elke 24 uur</option>
              <option value={48}>Elke 2 dagen</option>
              <option value={168}>Elke week</option>
            </select>
          </div>

          {/* Status */}
          {config?.lastRun && (
            <p className="text-xs text-ink-muted">
              Laatst uitgevoerd: {new Date(config.lastRun).toLocaleString('nl-BE')}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Opslaan...' : 'Schema opslaan'}
            </button>
            {config && (
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-border text-ink-muted text-sm hover:border-red-400 hover:text-red-500 disabled:opacity-50"
              >
                Verwijderen
              </button>
            )}
          </div>

          {saveMutation.isSuccess && (
            <p className="text-xs text-accent-success">Schema opgeslagen.</p>
          )}
        </>
      )}

      {!enabled && config?.enabled && (
        <p className="text-xs text-ink-muted">
          Automatisch genereren is momenteel ingeschakeld. Schakel hierboven uit om te stoppen.
        </p>
      )}
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Meerkeuze',
  fill_in: 'Invullen',
  drag_drop: 'Slepen',
  memory: 'Memory',
  balance_scale: 'Weegschaal',
  clock: 'Klok',
  number_line: 'Getallenrij',
  sorting: 'Sorteren',
}

function ExerciseCard({ ex, onApprove, onReject }: {
  ex: any
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const q = ex.questionJson as any

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {SUBJECT_LABELS[ex.subject] ?? ex.subject}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-ink-muted">
                {TYPE_LABELS[ex.type] ?? ex.type}
              </span>
              <span className="text-xs text-ink-muted">{'⭐'.repeat(ex.difficulty)}</span>
              {ex.isAiGenerated && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">✨ AI</span>
              )}
            </div>
            <p className="font-semibold text-ink text-sm leading-snug">
              {ex.title ?? q?.question ?? 'Oefening'}
            </p>
            {q?.question && ex.title && (
              <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{q.question}</p>
            )}
            {ex.tags?.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {ex.tags.map((t: string) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface text-ink-muted border border-border">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Acties */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-success text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              OK
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-ink-muted text-sm hover:border-red-400 hover:text-red-500 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Weigeren
            </button>
          </div>
        </div>

        {/* Detail uitklappen */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-accent hover:underline flex items-center gap-1"
        >
          {expanded ? 'Verberg details' : 'Bekijk inhoud'}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <pre className="mt-3 p-3 rounded-xl bg-surface text-xs text-ink-muted overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                {JSON.stringify(q, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function ExercisesReviewPage() {
  const { data, isLoading } = usePendingExercises()
  const approve = useApproveExercise()
  const deleteEx = useDeleteExercise()
  const [tab, setTab] = useState<'generate' | 'review' | 'stats'>('generate')
  const [approvedCount, setApprovedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)

  const exercises = data?.exercises ?? []

  async function handleApprove(id: string) {
    await approve.mutateAsync({ id, isApproved: true })
    setApprovedCount(c => c + 1)
  }

  async function handleReject(id: string) {
    await deleteEx.mutateAsync(id)
    setRejectedCount(c => c + 1)
  }

  async function handleApproveAll() {
    await Promise.allSettled(exercises.map(ex => approve.mutateAsync({ id: ex.id, isApproved: true })))
    setApprovedCount(c => c + exercises.length)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Oefeningen beheer</h1>
        <p className="text-sm text-ink-muted mt-0.5">AI-oefeningen genereren, reviewen en statistieken bekijken</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-surface border border-border">
        {([
          { key: 'generate', label: '✨ Genereren' },
          { key: 'review', label: `📋 Review${exercises.length > 0 ? ` (${exercises.length})` : ''}` },
          { key: 'stats', label: '📊 Statistieken' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-card shadow text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'generate' && (
          <motion.div key="generate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <GeneratePanel />
            <AutoSchedulePanel />
          </motion.div>
        )}

        {tab === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                {(approvedCount > 0 || rejectedCount > 0) && (
                  <div className="flex gap-2 flex-wrap">
                    {approvedCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-success/10 text-accent-success text-xs font-medium">
                        ✓ {approvedCount} goedgekeurd
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
                        ✗ {rejectedCount} geweigerd
                      </span>
                    )}
                  </div>
                )}
              </div>
              {exercises.length > 0 && (
                <button
                  onClick={handleApproveAll}
                  disabled={approve.isPending}
                  className="px-4 py-2 rounded-xl bg-accent-success text-white text-sm font-medium disabled:opacity-50"
                >
                  ✅ Alles ({exercises.length})
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-2xl border border-border">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-semibold text-ink">Niets te reviewen</p>
                <p className="text-sm text-ink-muted mt-1">Genereer nieuwe oefeningen via het ✨ Genereren-tabblad.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-muted">
                  <strong className="text-ink">{exercises.length}</strong> oefening{exercises.length !== 1 ? 'en' : ''} wachten
                </p>
                <AnimatePresence mode="popLayout">
                  {exercises.map((ex: any) => (
                    <ExerciseCard
                      key={ex.id}
                      ex={ex}
                      onApprove={() => handleApprove(ex.id)}
                      onReject={() => handleReject(ex.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <StatsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ExercisesReviewPage
