/**
 * Hulpverleners beheren — uitnodigen, rechten instellen, toegang intrekken.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMyChildren, useInvites, useCreateInvite, useDeleteInvite, useCaregivers } from '../../lib/queries'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const MODULE_OPTIONS = [
  { key: 'communication', label: 'Communicatie', icon: '💬' },
  { key: 'dossier', label: 'Dossier', icon: '📋' },
  { key: 'exercises', label: 'Oefeningen', icon: '📚' },
  { key: 'progress', label: 'Voortgang', icon: '📈' },
]

const ROLE_OPTIONS = [
  { key: 'caregiver', label: 'Hulpverlener' },
  { key: 'parent', label: 'Mede-ouder' },
]

// ── Uitnodigen formulier ───────────────────────────────────────
function InviteForm({ childId, onDone }: { childId: string; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('caregiver')
  const [modules, setModules] = useState<string[]>(['communication', 'progress'])
  const [result, setResult] = useState<{ inviteUrl: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const createInvite = useCreateInvite()

  function toggleModule(key: string) {
    setModules(m => m.includes(key) ? m.filter(x => x !== key) : [...m, key])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    const res = await createInvite.mutateAsync({ email: email.trim(), childId, modules, role })
    setResult(res)
  }

  function copyUrl() {
    if (result?.inviteUrl) {
      navigator.clipboard.writeText(result.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-1">✅ Uitnodiging aangemaakt!</p>
          <p className="text-xs text-green-700 mb-3">
            Geldig tot {format(new Date(result.expiresAt), 'd MMM yyyy HH:mm', { locale: nl })}
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={result.inviteUrl}
              className="flex-1 px-3 py-2 rounded-xl border border-green-300 bg-white text-xs text-green-900 font-mono"
            />
            <button
              onClick={copyUrl}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
            >
              {copied ? 'Gekopieerd!' : 'Kopiëren'}
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-muted text-center">
          Stuur deze link naar de hulpverlener via e-mail of WhatsApp.
        </p>
        <button onClick={onDone} className="w-full py-3 rounded-xl bg-accent text-white font-medium">
          Klaar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* E-mail */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">E-mailadres</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="hulpverlener@voorbeeld.be"
          required
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {/* Rol */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">Rol</label>
        <div className="flex gap-2">
          {ROLE_OPTIONS.map(r => (
            <button key={r.key} type="button"
              onClick={() => setRole(r.key)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${role === r.key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">Toegang tot modules</label>
        <div className="grid grid-cols-2 gap-2">
          {MODULE_OPTIONS.map(m => (
            <button key={m.key} type="button"
              onClick={() => toggleModule(m.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                modules.includes(m.key) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'
              }`}>
              <span>{m.icon}</span>
              <span className="font-medium">{m.label}</span>
              {modules.includes(m.key) && (
                <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onDone}
          className="flex-1 py-3 rounded-xl border border-border text-ink-muted hover:bg-surface transition-colors font-medium">
          Annuleren
        </button>
        <button type="submit" disabled={createInvite.isPending}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50">
          {createInvite.isPending ? 'Aanmaken...' : 'Uitnodiging genereren'}
        </button>
      </div>
    </form>
  )
}

// ── Caregiver kaart ────────────────────────────────────────────
function CaregiverCard({ caregiver }: { caregiver: any }) {
  const activeModules = caregiver.modules ?? []
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-xl flex-shrink-0">
        {caregiver.user.role === 'parent' ? '👨‍👩‍👧' : '🏥'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{caregiver.user.name}</p>
        <p className="text-xs text-ink-muted truncate">{caregiver.user.email}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {activeModules.map((m: string) => {
            const mod = MODULE_OPTIONS.find(o => o.key === m)
            return mod ? (
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {mod.icon} {mod.label}
              </span>
            ) : null
          })}
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium border border-green-200">Actief</span>
      </div>
    </div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────
export function InvitesPage() {
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'caregivers' | 'invites'>('caregivers')

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data: caregiversData } = useCaregivers(childId)
  const { data: invitesData } = useInvites(childId)
  const deleteInvite = useDeleteInvite()

  const caregivers = caregiversData?.caregivers ?? []
  const invites = invitesData?.invites ?? []
  const pendingInvites = invites.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date())

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Hulpverleners</h1>
          <p className="text-sm text-ink-muted mt-0.5">Beheer toegang van hulpverleners</p>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:border-accent focus:outline-none">
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Uitnodigen
          </button>
        </div>
      </div>

      {/* Uitnodigingsformulier */}
      <AnimatePresence>
        {showForm && childId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-card border border-accent/30 rounded-2xl p-6">
              <h2 className="font-semibold text-ink text-lg mb-5">Hulpverlener uitnodigen</h2>
              <InviteForm childId={childId} onDone={() => setShowForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border mb-5">
        {[
          { key: 'caregivers', label: `Actief (${caregivers.length})` },
          { key: 'invites', label: `Openstaand (${pendingInvites.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Actieve hulpverleners */}
      {tab === 'caregivers' && (
        <div className="space-y-3">
          {caregivers.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border">
              <div className="text-5xl mb-3">🏥</div>
              <p className="font-semibold text-ink">Geen actieve hulpverleners</p>
              <p className="text-ink-muted text-sm mt-1">Stuur een uitnodiging via de knop hierboven</p>
            </div>
          ) : (
            caregivers.map(cg => <CaregiverCard key={cg.id} caregiver={cg} />)
          )}
        </div>
      )}

      {/* Openstaande uitnodigingen */}
      {tab === 'invites' && (
        <div className="space-y-3">
          {pendingInvites.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border">
              <div className="text-5xl mb-3">📧</div>
              <p className="font-semibold text-ink">Geen openstaande uitnodigingen</p>
            </div>
          ) : (
            pendingInvites.map(inv => (
              <div key={inv.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-lg flex-shrink-0">
                  📧
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-sm truncate">{inv.email}</p>
                  <p className="text-xs text-ink-muted">
                    Verloopt {format(new Date(inv.expiresAt), 'd MMM HH:mm', { locale: nl })}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {inv.modules.map(m => {
                      const mod = MODULE_OPTIONS.find(o => o.key === m)
                      return mod ? <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface text-ink-muted border border-border">{mod.icon}</span> : null
                    })}
                  </div>
                </div>
                <button onClick={() => deleteInvite.mutate(inv.id)}
                  className="p-2 rounded-xl border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default InvitesPage
