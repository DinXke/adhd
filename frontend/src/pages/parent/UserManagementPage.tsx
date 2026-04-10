/**
 * Gebruikersbeheer — Admin-only
 * Alle gebruikers bekijken, bewerken, aanmaken, wachtwoord/PIN resetten
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'

interface UserRecord {
  id: string
  name: string
  email: string | null
  role: 'child' | 'parent' | 'caregiver' | 'admin'
  avatarUrl: string | null
  avatarId: string | null
  gender: string | null
  dateOfBirth: string | null
  isActive: boolean
  createdAt: string
  myParents?: { parent: { id: string; name: string }; isPrimary: boolean }[]
}

type FormMode = 'closed' | 'create' | 'edit'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  parent: 'Ouder',
  child: 'Kind',
  caregiver: 'Hulpverlener',
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: 'rgba(196,93,76,0.1)', text: '#C45D4C', border: 'rgba(196,93,76,0.25)' },
  parent: { bg: 'rgba(210,155,59,0.1)', text: '#B8862D', border: 'rgba(210,155,59,0.25)' },
  child: { bg: 'rgba(91,140,90,0.1)', text: '#5B8C5A', border: 'rgba(91,140,90,0.25)' },
  caregiver: { bg: 'rgba(123,175,163,0.1)', text: '#5A998D', border: 'rgba(123,175,163,0.25)' },
}

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.parent
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function UserManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<string>('parent')
  const [formPassword, setFormPassword] = useState('')
  const [formPin, setFormPin] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Password/PIN reset state
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetType, setResetType] = useState<'password' | 'pin' | null>(null)
  const [resetValue, setResetValue] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    try {
      const data = await api.get<{ users: UserRecord[] }>('/api/users')
      setUsers(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  function openCreate() {
    setFormMode('create')
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('parent')
    setFormPassword('')
    setFormPin('')
    setFormError('')
  }

  function openEdit(user: UserRecord) {
    setFormMode('edit')
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email ?? '')
    setFormRole(user.role)
    setFormPassword('')
    setFormPin('')
    setFormError('')
  }

  function closeForm() {
    setFormMode('closed')
    setEditingUser(null)
    setFormError('')
  }

  async function handleSave() {
    setFormSaving(true)
    setFormError('')
    try {
      if (formMode === 'create') {
        const body: any = { name: formName.trim(), role: formRole }
        if (formRole === 'child') {
          if (!/^\d{4}$/.test(formPin)) throw new Error('PIN moet 4 cijfers zijn')
          body.pin = formPin
        } else {
          if (!formEmail.trim()) throw new Error('E-mail is verplicht')
          if (!formPassword || formPassword.length < 6) throw new Error('Wachtwoord minimaal 6 tekens')
          body.email = formEmail.trim()
          body.password = formPassword
        }
        await api.post('/api/users', body)
      } else if (formMode === 'edit' && editingUser) {
        const body: any = {}
        if (formName.trim() !== editingUser.name) body.name = formName.trim()
        if ((formEmail.trim() || null) !== editingUser.email) body.email = formEmail.trim() || null
        if (Object.keys(body).length === 0) throw new Error('Geen wijzigingen')
        await api.put(`/api/users/${editingUser.id}`, body)
      }
      closeForm()
      await fetchUsers()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormSaving(false)
    }
  }

  async function toggleActive(user: UserRecord) {
    try {
      await api.put(`/api/users/${user.id}`, { isActive: !user.isActive })
      await fetchUsers()
    } catch {}
  }

  async function handleResetSubmit() {
    if (!resetUserId || !resetType) return
    setResetSaving(true)
    try {
      if (resetType === 'password') {
        if (!resetValue || resetValue.length < 6) throw new Error('Minimaal 6 tekens')
        await api.put(`/api/users/${resetUserId}/password`, { password: resetValue })
      } else {
        if (!/^\d{4}$/.test(resetValue)) throw new Error('PIN moet 4 cijfers zijn')
        await api.put(`/api/users/${resetUserId}/pin`, { pin: resetValue })
      }
      setResetDone(true)
      setTimeout(() => {
        setResetUserId(null)
        setResetType(null)
        setResetValue('')
        setResetDone(false)
      }, 1500)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setResetSaving(false)
    }
  }

  function openReset(userId: string, type: 'password' | 'pin') {
    setResetUserId(userId)
    setResetType(type)
    setResetValue('')
    setResetDone(false)
    setFormError('')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Gebruikersbeheer</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Alle accounts bekijken en beheren
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nieuw account
        </button>
      </div>

      {/* Create / Edit form */}
      <AnimatePresence>
        {formMode !== 'closed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-accent/30 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-ink text-lg">
                {formMode === 'create' ? 'Nieuw account aanmaken' : `${editingUser?.name} bewerken`}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Naam */}
                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1.5">Naam</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Volledige naam"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                {/* Rol (alleen bij aanmaken) */}
                {formMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-1.5">Rol</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors"
                    >
                      <option value="parent">Ouder</option>
                      <option value="admin">Admin</option>
                      <option value="child">Kind</option>
                      <option value="caregiver">Hulpverlener</option>
                    </select>
                  </div>
                )}

                {/* Email (niet voor kind) */}
                {(formMode === 'edit' || formRole !== 'child') && (
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-1.5">E-mail</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="email@voorbeeld.be"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Wachtwoord (alleen bij aanmaken, niet voor kind) */}
                {formMode === 'create' && formRole !== 'child' && (
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-1.5">Wachtwoord</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Minimaal 6 tekens"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* PIN (alleen bij aanmaken kind) */}
                {formMode === 'create' && formRole === 'child' && (
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-1.5">PIN (4 cijfers)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="0000"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors font-mono text-xl tracking-widest"
                    />
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl">
                  {formError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeForm}
                  className="flex-1 py-3 rounded-xl border border-border text-ink-muted hover:bg-surface transition-colors font-medium"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSave}
                  disabled={formSaving}
                  className="flex-1 py-3 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {formSaving ? 'Opslaan...' : formMode === 'create' ? 'Account aanmaken' : 'Opslaan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <p className="font-semibold text-ink text-lg">Geen gebruikers gevonden</p>
          <p className="text-ink-muted text-sm mt-1">Maak het eerste account aan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Tabel-header (desktop) */}
          <div className="hidden sm:grid grid-cols-[1fr_160px_80px_100px_120px] gap-3 px-5 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">
            <span>Naam</span>
            <span>E-mail</span>
            <span>Rol</span>
            <span>Status</span>
            <span className="text-right">Acties</span>
          </div>

          <AnimatePresence mode="popLayout">
            {users.map((user) => (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div
                  className={`bg-card rounded-2xl border p-4 sm:p-5 transition-colors ${
                    user.isActive ? 'border-border' : 'border-border opacity-60'
                  }`}
                >
                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            background: ROLE_COLORS[user.role]?.bg ?? '#f0f0f0',
                            color: ROLE_COLORS[user.role]?.text ?? '#666',
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{user.name}</p>
                          <p className="text-xs text-ink-muted">{user.email ?? 'Geen e-mail'}</p>
                        </div>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <span>Aangemaakt {formatDate(user.createdAt)}</span>
                      <span className={user.isActive ? 'text-accent-success font-medium' : 'text-ink-muted'}>
                        {user.isActive ? 'Actief' : 'Inactief'}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(user)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-ink-muted hover:border-accent hover:text-accent transition-colors"
                      >
                        Bewerken
                      </button>
                      {user.role === 'child' ? (
                        <button
                          onClick={() => openReset(user.id, 'pin')}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-ink-muted hover:border-accent hover:text-accent transition-colors"
                        >
                          PIN resetten
                        </button>
                      ) : (
                        <button
                          onClick={() => openReset(user.id, 'password')}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-ink-muted hover:border-accent hover:text-accent transition-colors"
                        >
                          Wachtwoord
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(user)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          user.isActive
                            ? 'border-border text-ink-muted hover:border-amber-400 hover:text-amber-600'
                            : 'border-accent-success/30 text-accent-success hover:bg-accent-success/5'
                        }`}
                      >
                        {user.isActive ? 'Deactiveren' : 'Activeren'}
                      </button>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:grid grid-cols-[1fr_160px_80px_100px_120px] gap-3 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: ROLE_COLORS[user.role]?.bg ?? '#f0f0f0',
                          color: ROLE_COLORS[user.role]?.text ?? '#666',
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{user.name}</p>
                        <p className="text-xs text-ink-muted">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-ink-muted truncate">{user.email ?? '—'}</p>
                    <RoleBadge role={user.role} />
                    <span
                      className={`text-xs font-medium ${
                        user.isActive ? 'text-accent-success' : 'text-ink-muted'
                      }`}
                    >
                      {user.isActive ? 'Actief' : 'Inactief'}
                    </span>
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors"
                        title="Bewerken"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {user.role === 'child' ? (
                        <button
                          onClick={() => openReset(user.id, 'pin')}
                          className="p-2 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors"
                          title="PIN resetten"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            <circle cx="12" cy="16" r="1" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => openReset(user.id, 'password')}
                          className="p-2 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors"
                          title="Wachtwoord resetten"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(user)}
                        className={`p-2 rounded-lg border transition-colors ${
                          user.isActive
                            ? 'border-border text-ink-muted hover:border-amber-400 hover:text-amber-600'
                            : 'border-accent-success/30 text-accent-success hover:bg-accent-success/5'
                        }`}
                        title={user.isActive ? 'Deactiveren' : 'Activeren'}
                      >
                        {user.isActive ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`${user.name} permanent verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return
                          await api.delete(`/api/users/${user.id}`)
                          fetchUsers()
                        }}
                        className="p-2 rounded-lg border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors"
                        title="Permanent verwijderen"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline reset form */}
                <AnimatePresence>
                  {resetUserId === user.id && resetType && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-1 mb-1 p-4 border border-accent/20 rounded-xl bg-surface">
                        <p className="text-sm font-semibold text-ink mb-3">
                          {resetType === 'password'
                            ? `Nieuw wachtwoord voor ${user.name}`
                            : `Nieuwe PIN voor ${user.name}`}
                        </p>
                        {resetDone ? (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-accent-success font-medium"
                          >
                            ✅ {resetType === 'password' ? 'Wachtwoord' : 'PIN'} gewijzigd!
                          </motion.p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type={resetType === 'pin' ? 'text' : 'password'}
                              inputMode={resetType === 'pin' ? 'numeric' : undefined}
                              maxLength={resetType === 'pin' ? 4 : undefined}
                              value={resetValue}
                              onChange={(e) =>
                                setResetValue(
                                  resetType === 'pin'
                                    ? e.target.value.replace(/\D/g, '').slice(0, 4)
                                    : e.target.value
                                )
                              }
                              placeholder={resetType === 'pin' ? '4 cijfers' : 'Nieuw wachtwoord (min. 6)'}
                              className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none transition-colors ${
                                resetType === 'pin' ? 'font-mono text-lg tracking-widest' : ''
                              }`}
                            />
                            <button
                              onClick={handleResetSubmit}
                              disabled={resetSaving}
                              className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              {resetSaving ? '...' : 'Opslaan'}
                            </button>
                            <button
                              onClick={() => {
                                setResetUserId(null)
                                setResetType(null)
                              }}
                              className="px-3 py-2.5 rounded-xl border border-border text-sm text-ink-muted"
                            >
                              Annuleer
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && users.length > 0 && (
        <p className="text-center text-xs text-ink-muted">
          {users.length} {users.length === 1 ? 'account' : 'accounts'} totaal
        </p>
      )}
    </div>
  )
}

export default UserManagementPage
