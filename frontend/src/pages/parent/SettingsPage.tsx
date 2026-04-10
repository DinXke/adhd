/**
 * Instellingen — Centraal overzicht per kind
 * Met snelle links naar alle beheermodules + app-configuratie
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import {
  useMyChildren,
  useTokenBalance,
  useRewards,
  useAllSchedules,
  useTasks,
} from '../../lib/queries'
import { useHaStatus, useHaTest } from '../../lib/queries'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { AvatarDisplay } from '../../components/AvatarDisplay'

interface SettingsData {
  settings: { extraAllowedOrigins: string[]; appName: string }
  envOrigins: string[]
  allOrigins: string[]
}

// ── Kind-overzicht panel ──────────────────────────────────────
function ChildOverview({ childId }: { childId: string }) {
  const navigate = useNavigate()
  const { data: tokenData } = useTokenBalance(childId)
  const { data: rewardsData } = useRewards(childId)
  const { data: scheduleData } = useAllSchedules(childId)
  const { data: tasksData } = useTasks(childId)
  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', childId],
    queryFn: () => api.get<{ appointments: any[] }>(`/api/appointments/${childId}`),
    enabled: !!childId,
  })
  const { data: recipesData } = useQuery({
    queryKey: ['recipes', childId],
    queryFn: () => api.get<{ recipes: any[] }>(`/api/recipes/${childId}`),
    enabled: !!childId,
  })
  const { data: moneyData } = useQuery({
    queryKey: ['money-balance', childId],
    queryFn: () => api.get<{ balance: number; goals: any[] }>(`/api/money/${childId}/balance`),
    enabled: !!childId,
  })

  const balance = tokenData?.balance ?? 0
  const streak = tokenData?.streak ?? 0
  const rewards = rewardsData?.rewards ?? []
  const schedules = scheduleData?.schedules ?? []
  const tasks = tasksData?.tasks ?? []
  const appointments = appointmentsData?.appointments ?? []
  const recipes = recipesData?.recipes ?? []
  const moneyBalance = moneyData?.balance ?? 0
  const savingGoals = moneyData?.goals ?? []

  const sections = [
    {
      title: "Schema's",
      icon: '📅',
      route: '/dashboard/schedule',
      stats: `${schedules.length} dag${schedules.length !== 1 ? 'en' : ''} ingesteld`,
      color: '#7BAFA3',
    },
    {
      title: 'Taken',
      icon: '✅',
      route: '/dashboard/tasks',
      stats: `${tasks.length} taken${tasks.filter(t => t.completedAt).length > 0 ? `, ${tasks.filter(t => t.completedAt).length} af` : ''}`,
      color: '#5B8C5A',
    },
    {
      title: 'Afspraken',
      icon: '🗓️',
      route: '/dashboard/appointments',
      stats: `${appointments.filter(a => a.isRecurring).length} wekelijks, ${appointments.filter(a => !a.isRecurring).length} eenmalig`,
      color: '#9B7CC8',
    },
    {
      title: 'Beloningen',
      icon: '🎁',
      route: '/dashboard/tokens',
      stats: `⭐ ${balance} tokens · ${rewards.length} beloningen · 🔥 ${streak}d streak`,
      color: '#D4973B',
    },
    {
      title: 'Oefeningen',
      icon: '📚',
      route: '/dashboard/exercises/review',
      stats: 'Genereren, reviewen en statistieken',
      color: '#E8734A',
    },
    {
      title: 'Vaardigheden',
      icon: '💪',
      route: '/dashboard/vaardigheden',
      stats: 'Zelfstandigheidschecklist',
      color: '#5B8C5A',
    },
    {
      title: 'Sociale scripts',
      icon: '💬',
      route: '/dashboard/social-scripts',
      stats: 'Scenario-oefeningen',
      color: '#7BAFA3',
    },
    {
      title: 'Spaarpotje',
      icon: '🐷',
      route: '/dashboard/money',
      stats: `€${(moneyBalance / 100).toFixed(2)} saldo · ${savingGoals.length} doelen`,
      color: '#5B8C5A',
    },
    {
      title: 'Recepten',
      icon: '🍳',
      route: '/dashboard/recipes',
      stats: `${recipes.length} recept${recipes.length !== 1 ? 'en' : ''}`,
      color: '#D4973B',
    },
  ]

  return (
    <div className="space-y-2">
      {sections.map((s, i) => (
        <motion.button
          key={s.route}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => navigate(s.route)}
          className="w-full card p-4 flex items-center gap-4 text-left hover:bg-surface transition-colors"
          style={{ borderLeft: `3px solid ${s.color}` }}
        >
          <span className="text-2xl w-9 text-center flex-shrink-0">{s.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm">{s.title}</p>
            <p className="text-xs text-ink-muted mt-0.5 truncate">{s.stats}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </motion.button>
      ))}
    </div>
  )
}

// ── Push panel ────────────────────────────────────────────────
function PushPanel() {
  const { state, subscribe, unsubscribe } = usePushNotifications()
  const [testing, setTesting] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      await api.post('/api/push/test', { title: 'GRIP testbericht', body: 'Push notificaties werken!' })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } finally {
      setTesting(false)
    }
  }

  const stateLabels: Record<string, string> = {
    unsupported: 'Niet ondersteund door browser',
    denied: 'Geblokkeerd — sta meldingen toe in browserinstellingen',
    subscribed: 'Ingeschakeld',
    unsubscribed: 'Uitgeschakeld',
    loading: 'Laden...',
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-ink text-base mb-1">Push notificaties</h2>
      <p className="font-body text-xs text-ink-muted mb-3">
        Meldingen bij nieuwe berichten en emotie check-ins.
      </p>
      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border mb-3">
        <div>
          <p className="font-body text-sm font-medium text-ink">Status</p>
          <p className="font-body text-xs text-ink-muted">{stateLabels[state] ?? state}</p>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${
          state === 'subscribed' ? 'bg-accent-success' :
          state === 'denied' ? 'bg-red-400' :
          state === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-border'
        }`} />
      </div>
      <div className="flex gap-2">
        {state === 'unsubscribed' && (
          <button onClick={subscribe}
            className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium">
            Inschakelen
          </button>
        )}
        {state === 'subscribed' && (
          <>
            <button onClick={handleTest} disabled={testing}
              className="flex-1 py-2 rounded-xl border border-border text-sm font-medium text-ink disabled:opacity-50">
              {testSent ? '✅ Verzonden!' : testing ? 'Sturen...' : 'Test sturen'}
            </button>
            <button onClick={unsubscribe}
              className="flex-1 py-2 rounded-xl border border-border text-sm font-medium text-ink-muted">
              Uitschakelen
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Home Assistant panel ──────────────────────────────────────
function HaPanel() {
  const { data: ha, isLoading } = useHaStatus()
  const test = useHaTest()
  const [selectedTrigger, setSelectedTrigger] = useState('all_tasks_done')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTestResult(null)
    const res = await test.mutateAsync(selectedTrigger)
    setTestResult(res)
  }

  if (isLoading) return null

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-ink text-base mb-1">Home Assistant</h2>
      <p className="font-body text-xs text-ink-muted mb-3">
        Webhooks bij events — lichten, TTS, automaties.
      </p>
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-surface border border-border">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ha?.configured ? 'var(--accent-success)' : 'var(--accent-warning)' }} />
        <span className="font-body text-xs text-ink">
          {ha?.configured ? `Verbonden met ${ha.haUrl}` : 'Niet geconfigureerd'}
        </span>
      </div>
      {ha?.configured && (
        <div className="border-t pt-3 mt-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex gap-2">
            <select value={selectedTrigger} onChange={e => setSelectedTrigger(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-xs text-ink focus:border-accent focus:outline-none">
              {(ha.triggers ?? []).map((t: any) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button onClick={handleTest} disabled={test.isPending}
              className="px-3 py-2 rounded-xl text-xs font-medium text-white flex-shrink-0 disabled:opacity-50"
              style={{ background: 'var(--accent-primary)' }}>
              {test.isPending ? '...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <p className="font-body text-xs mt-2" style={{ color: testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {testResult.success ? '✓' : '⚠'} {testResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Domeinen panel ────────────────────────────────────────────
function DomainsPanel() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newOrigin, setNewOrigin] = useState('')
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingOrigin, setRemovingOrigin] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<SettingsData>('/api/admin/settings')
      setData(res)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAddOrigin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    const trimmed = newOrigin.trim().replace(/\/$/, '')
    if (!trimmed.startsWith('http')) {
      setAddError('URL moet beginnen met http:// of https://')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/admin/settings/origins', { origin: trimmed })
      setNewOrigin('')
      setSuccess('Domein toegevoegd!')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setAddError(err.message ?? 'Toevoegen mislukt')
    }
    setSaving(false)
  }

  const handleRemoveOrigin = async (origin: string) => {
    setRemovingOrigin(origin)
    try {
      await api.delete('/api/admin/settings/origins', { origin })
      setSuccess('Domein verwijderd')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch {}
    setRemovingOrigin(null)
  }

  if (loading) return null

  return (
    <div className="card p-5">
      <h2 className="font-display font-semibold text-ink text-base mb-1">Toegestane domeinen</h2>
      <p className="font-body text-xs text-ink-muted mb-3">
        De app is bereikbaar via deze adressen.
      </p>
      {success && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs font-medium"
          style={{ background: 'rgba(91,140,90,0.1)', color: 'var(--accent-success)' }}>
          ✓ {success}
        </div>
      )}
      <div className="space-y-1.5 mb-3">
        {(data?.envOrigins ?? []).map(o => (
          <div key={o} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success flex-shrink-0" />
            <span className="font-body text-xs text-ink truncate flex-1">{o}</span>
            <span className="text-[10px] text-ink-muted">vast</span>
          </div>
        ))}
        {(data?.settings.extraAllowedOrigins ?? []).map(o => (
          <div key={o} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-secondary)' }} />
            <span className="font-body text-xs text-ink truncate flex-1">{o}</span>
            <button onClick={() => handleRemoveOrigin(o)} disabled={removingOrigin === o}
              className="text-[10px] px-1.5 py-0.5 rounded text-red-500 hover:bg-red-50">
              {removingOrigin === o ? '...' : '✕'}
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddOrigin} className="flex gap-2">
        <input
          value={newOrigin}
          onChange={(e) => setNewOrigin(e.target.value)}
          placeholder="https://nieuwdomein.be"
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-xs text-ink focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={saving || !newOrigin.trim()}
          className="px-3 py-2 rounded-lg text-xs font-medium text-white flex-shrink-0 disabled:opacity-50"
          style={{ background: 'var(--accent-primary)' }}>
          {saving ? '...' : '+'}
        </button>
      </form>
      {addError && <p className="text-xs mt-1" style={{ color: 'var(--accent-danger, #C45D4C)' }}>{addError}</p>}
    </div>
  )
}

// ── Hoofdpagina ───────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const { data: childrenData, isLoading: childrenLoading } = useMyChildren()
  const children = childrenData?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState('')
  const [activeTab, setActiveTab] = useState<'child' | 'app'>('child')

  const childId = selectedChildId || children[0]?.id || ''
  const selectedChild = children.find(c => c.id === childId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-ink text-2xl">Instellingen</h1>
        <p className="font-body text-ink-muted text-sm mt-0.5">
          Beheer alles per kind of pas app-instellingen aan
        </p>
      </div>

      {/* Tabs: Kind / App */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-surface border border-border">
        {([
          { key: 'child' as const, label: `👧 Per kind${children.length > 0 ? ` (${children.length})` : ''}` },
          { key: 'app' as const, label: '⚙️ App-instellingen' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-card shadow text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Tab: Per kind ───────────────────────────────────── */}
        {activeTab === 'child' && (
          <motion.div key="child" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

            {/* Kind selector */}
            {children.length > 0 && (
              <div className="mb-5">
                {children.length === 1 ? (
                  <div className="card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface border-2 border-accent/20 flex items-center justify-center overflow-hidden">
                      <AvatarDisplay avatarId={selectedChild?.avatarId} name={selectedChild?.name} size={44} />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{selectedChild?.name}</p>
                      <p className="text-xs text-ink-muted">Instellingen voor dit kind</p>
                    </div>
                  </div>
                ) : (
                  <div className="card p-4">
                    <p className="text-xs font-medium text-ink-muted mb-3">Kies een kind</p>
                    <div className="flex gap-2 flex-wrap">
                      {children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedChildId(child.id)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all ${
                            childId === child.id
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:border-accent/40'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-surface overflow-hidden flex-shrink-0">
                            <AvatarDisplay avatarId={child.avatarId} name={child.name} size={32} />
                          </div>
                          <span className={`text-sm font-medium ${childId === child.id ? 'text-ink' : 'text-ink-muted'}`}>
                            {child.name}
                          </span>
                          {childId === child.id && (
                            <span className="text-accent text-sm">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Kind modules overzicht */}
            {childId ? (
              <ChildOverview childId={childId} />
            ) : (
              <div className="text-center py-12 bg-surface rounded-2xl border border-border">
                <div className="text-4xl mb-3">👶</div>
                <p className="font-semibold text-ink">Nog geen kinderen</p>
                <p className="text-sm text-ink-muted mt-1 mb-4">Voeg eerst een kind toe.</p>
                <button
                  onClick={() => navigate('/dashboard/children')}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium"
                >
                  Kind toevoegen
                </button>
              </div>
            )}

            {/* Extra acties */}
            {childId && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate('/dashboard/children')}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-ink-muted hover:text-ink hover:border-accent/40 transition-colors"
                >
                  👧 Kinderen beheren
                </button>
                <button
                  onClick={() => navigate('/dashboard/hulpverleners')}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-ink-muted hover:text-ink hover:border-accent/40 transition-colors"
                >
                  🤝 Hulpverleners
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tab: App-instellingen ──────────────────────────── */}
        {activeTab === 'app' && (
          <motion.div key="app" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="space-y-4">

              {/* Push notificaties */}
              <PushPanel />

              {/* Home Assistant */}
              <HaPanel />

              {/* Domeinen (admin only) */}
              {isAdmin && <DomainsPanel />}

              {/* Snelkoppelingen */}
              <div className="card p-5">
                <h2 className="font-display font-semibold text-ink text-base mb-3">Snelkoppelingen</h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Communicatie', icon: '💬', route: '/dashboard/communication' },
                    { label: 'Dossier', icon: '📋', route: '/dashboard/dossier' },
                    { label: 'Voortgang', icon: '📈', route: '/dashboard/voortgang' },
                    { label: 'Systeembeheer', icon: '🖥️', route: '/dashboard/system', admin: true },
                  ].filter(l => !l.admin || isAdmin).map(l => (
                    <button
                      key={l.route}
                      onClick={() => navigate(l.route)}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border text-left hover:bg-surface transition-colors"
                    >
                      <span className="text-lg">{l.icon}</span>
                      <span className="text-sm font-medium text-ink">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Versie-info */}
              <div className="card p-5">
                <h2 className="font-display font-semibold text-ink text-base mb-3">Over GRIP</h2>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Naam', value: 'GRIP — Groei, Routine, Inzicht, Planning' },
                    { label: 'Versie', value: 'v1.0.0' },
                    { label: 'Stack', value: 'React · Fastify · PostgreSQL · Docker' },
                    { label: 'Methode', value: 'Barkley External Executive Function' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3 text-sm">
                      <span className="text-ink-muted w-16 flex-shrink-0">{label}</span>
                      <span className="text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
