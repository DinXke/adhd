import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useMyChildren, useCreateChild, useUpdateChild, useDeleteChild, ChildProfile } from '../../lib/queries'
import { AvatarDisplay, AVATARS } from '../../components/AvatarDisplay'
import { api } from '../../lib/api'

// ── Leeftijd berekenen ─────────────────────────────────────────
function calcAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return ''
  const born = new Date(dateOfBirth)
  const now = new Date()
  const age = now.getFullYear() - born.getFullYear() -
    (now < new Date(now.getFullYear(), born.getMonth(), born.getDate()) ? 1 : 0)
  return `${age} jaar`
}

function dateToInput(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

// ── Avatar picker ──────────────────────────────────────────────
function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [filter, setFilter] = useState<string>('alle')

  const filtered = filter === 'alle' ? AVATARS : AVATARS.filter((a) => a.gender === filter)

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {['alle', 'meisje', 'jongen', 'neutraal'].map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === g
                ? 'bg-accent text-white'
                : 'bg-surface text-ink-muted border border-border hover:border-accent'
            }`}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {filtered.map((av) => (
          <button
            key={av.id}
            onClick={() => onChange(av.id)}
            className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
              value === av.id
                ? 'border-accent bg-accent/10 scale-105'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <AvatarDisplay avatarId={av.id} size={56} />
            <span className="text-xs text-ink-muted">{av.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Kind formulier ─────────────────────────────────────────────
interface ChildFormData {
  name: string
  pin: string
  gender: string
  dateOfBirth: string
  avatarId: string
}

const emptyForm = (): ChildFormData => ({
  name: '', pin: '', gender: 'neutraal', dateOfBirth: '', avatarId: 'neutraal-1',
})

function ChildForm({
  initial,
  onSave,
  onCancel,
  isNew,
}: {
  initial?: Partial<ChildFormData>
  onSave: (data: ChildFormData) => Promise<void>
  onCancel: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState<ChildFormData>({ ...emptyForm(), ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAvatars, setShowAvatars] = useState(false)

  const set = (k: keyof ChildFormData) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Naam is verplicht')
    if (isNew && !/^\d{4}$/.test(form.pin)) return setError('PIN moet 4 cijfers zijn')
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => setShowAvatars(!showAvatars)} className="relative group">
          <div className="w-24 h-24 rounded-full bg-surface border-2 border-accent/30 flex items-center justify-center overflow-hidden">
            <AvatarDisplay avatarId={form.avatarId} size={88} />
          </div>
          <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Kiezen</span>
          </div>
        </button>
        {showAvatars && (
          <div className="w-full border border-border rounded-xl p-4 bg-surface">
            <AvatarPicker value={form.avatarId} onChange={(v) => {
              const gender = AVATARS.find((a) => a.id === v)?.gender ?? 'neutraal'
              setForm((f) => ({ ...f, avatarId: v, gender }))
            }} />
          </div>
        )}
      </div>

      {/* Naam */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Naam</label>
        <input
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          placeholder="Voornaam van het kind"
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Geboortedatum */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Geboortedatum</label>
        <input
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set('dateOfBirth')(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors"
        />
        <p className="text-xs text-ink-muted mt-1">Wordt gebruikt om oefeningen op maat te maken</p>
      </div>

      {/* PIN */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">
          PIN {!isNew && '(leeg laten om niet te wijzigen)'}
        </label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={form.pin}
          onChange={(e) => set('pin')(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="4 cijfers"
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors font-mono text-xl tracking-widest"
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-border text-ink-muted hover:bg-surface transition-colors font-medium"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : isNew ? 'Kind toevoegen' : 'Opslaan'}
        </button>
      </div>
    </form>
  )
}

// ── Kind kaart ─────────────────────────────────────────────────
function ChildCard({ child, onEdit, onDelete }: {
  child: ChildProfile
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetTokens, setResetTokens] = useState(true)
  const [resetExercises, setResetExercises] = useState(false)
  const [resetEmotions, setResetEmotions] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const resetMutation = useMutation({
    mutationFn: () => api.post(`/api/tokens/${child.id}/reset`, { resetTokens, resetExercises, resetEmotions }),
    onSuccess: () => { setResetDone(true); setTimeout(() => { setShowReset(false); setResetDone(false) }, 2000) },
  })

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
    <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-surface border-2 border-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        <AvatarDisplay avatarId={child.avatarId} avatarUrl={child.avatarUrl} name={child.name} size={56} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-ink text-lg truncate">{child.name}</h3>
          {child.isPrimary && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Primair</span>
          )}
        </div>
        <div className="text-sm text-ink-muted flex gap-3 mt-0.5">
          {child.dateOfBirth && <span>{calcAge(child.dateOfBirth)}</span>}
          {child.gender && <span className="capitalize">{child.gender}</span>}
          {!child.isActive && <span className="text-amber-600">Inactief</span>}
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2.5 rounded-xl border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors"
          title="Bewerken"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <button
          onClick={() => setShowReset(!showReset)}
          className="p-2.5 rounded-xl border border-border text-ink-muted hover:border-amber-400 hover:text-amber-600 transition-colors"
          title="Voortgang resetten"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>

        {confirming ? (
          <div className="flex gap-1">
            <button onClick={() => onDelete()} className="px-3 py-2 rounded-xl bg-red-500 text-white text-sm font-medium">Ja</button>
            <button onClick={() => setConfirming(false)} className="px-3 py-2 rounded-xl border border-border text-sm">Nee</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="p-2.5 rounded-xl border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors"
            title="Verwijderen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        )}
      </div>
    </div>

    {/* Reset panel */}
    <AnimatePresence>
      {showReset && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="border border-amber-200 rounded-xl mx-1 mb-1 p-4" style={{ background: 'rgba(212,151,59,0.06)' }}>
            <p className="font-semibold text-ink text-sm mb-3">Voortgang resetten voor {child.name}</p>
            <div className="space-y-2 mb-4">
              {[
                { key: 'resetTokens', label: 'Tokens & beloningshistoriek', value: resetTokens, set: setResetTokens },
                { key: 'resetExercises', label: 'Oefeningen & sessies', value: resetExercises, set: setResetExercises },
                { key: 'resetEmotions', label: 'Emotie-logs', value: resetEmotions, set: setResetEmotions },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={e => item.set(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm text-ink">{item.label}</span>
                </label>
              ))}
            </div>
            {resetDone && (
              <p className="text-sm text-green-700 mb-2 font-medium">✅ Voortgang gereset!</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => resetMutation.mutate()}
                disabled={(!resetTokens && !resetExercises && !resetEmotions) || resetMutation.isPending}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: '#D4973B' }}
              >
                {resetMutation.isPending ? 'Resetten...' : '↺ Reset uitvoeren'}
              </button>
              <button onClick={() => setShowReset(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-ink-muted">
                Annuleren
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </motion.div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────
export function ChildrenPage() {
  const { data, isLoading } = useMyChildren()
  const createChild = useCreateChild()
  const updateChild = useUpdateChild()
  const deleteChild = useDeleteChild()

  const [showForm, setShowForm] = useState(false)
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null)

  const children = data?.children ?? []

  async function handleCreate(form: any) {
    await createChild.mutateAsync({
      name: form.name,
      pin: form.pin,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      avatarId: form.avatarId || undefined,
    })
    setShowForm(false)
  }

  async function handleUpdate(form: any) {
    if (!editingChild) return
    await updateChild.mutateAsync({
      id: editingChild.id,
      name: form.name,
      pin: form.pin || undefined,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      avatarId: form.avatarId || undefined,
    })
    setEditingChild(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Kinderen</h1>
          <p className="text-sm text-ink-muted mt-0.5">Beheer de gekoppelde kinderen</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingChild(null) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Toevoegen
        </button>
      </div>

      {/* Nieuw kind formulier */}
      <AnimatePresence>
        {showForm && !editingChild && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-card border border-accent/30 rounded-2xl p-6">
              <h2 className="font-semibold text-ink text-lg mb-5">Kind toevoegen</h2>
              <ChildForm
                isNew={true}
                onSave={handleCreate}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kinderen lijst */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
          <p className="font-semibold text-ink text-lg">Nog geen kinderen</p>
          <p className="text-ink-muted text-sm mt-1">Voeg het eerste kind toe via de knop hierboven</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {children.map((child) => (
              <div key={child.id}>
                {editingChild?.id === child.id ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-card border border-accent/30 rounded-2xl p-6"
                  >
                    <h2 className="font-semibold text-ink text-lg mb-5">{child.name} bewerken</h2>
                    <ChildForm
                      isNew={false}
                      initial={{
                        name: child.name,
                        pin: '',
                        gender: child.gender ?? 'neutraal',
                        dateOfBirth: dateToInput(child.dateOfBirth),
                        avatarId: child.avatarId ?? 'neutraal-1',
                      }}
                      onSave={handleUpdate}
                      onCancel={() => setEditingChild(null)}
                    />
                  </motion.div>
                ) : (
                  <ChildCard
                    child={child}
                    onEdit={() => { setEditingChild(child); setShowForm(false) }}
                    onDelete={() => deleteChild.mutate(child.id)}
                  />
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {children.length > 0 && (
        <p className="text-center text-xs text-ink-muted mt-6">
          {children.length} {children.length === 1 ? 'kind' : 'kinderen'} gekoppeld
        </p>
      )}
    </div>
  )
}
