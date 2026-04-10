/**
 * Uitnodiging accepteren — publieke pagina voor nieuwe hulpverleners.
 * URL: /uitnodiging/:token
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

interface InviteInfo {
  email: string
  role: string
  modules: string[]
  childName: string
  invitedByName: string
  expiresAt: string
}

const MODULE_LABELS: Record<string, string> = {
  communication: '💬 Communicatie',
  dossier: '📋 Dossier',
  exercises: '📚 Oefeningen',
  progress: '📈 Voortgang',
}

export default function AcceptInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    api.get<InviteInfo>(`/api/invites/validate/${token}`)
      .then(setInfo)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) return setError('Wachtwoorden komen niet overeen')
    if (form.password.length < 8) return setError('Wachtwoord minimaal 8 tekens')
    if (!form.name.trim()) return setError('Vul je naam in')

    setSaving(true)
    setError('')
    try {
      await api.post(`/api/invites/accept/${token}`, { name: form.name.trim(), password: form.password })
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-8 shadow-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-ink">GRIP</h1>
          <p className="text-ink-muted text-sm mt-1">Hulpverlener-uitnodiging</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="font-bold text-xl text-ink">Account aangemaakt!</h2>
            <p className="text-ink-muted text-sm">
              Je kunt nu inloggen met je e-mailadres en het gekozen wachtwoord.
            </p>
            <button
              onClick={() => navigate('/login/adult')}
              className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:opacity-90"
            >
              Naar inlogpagina
            </button>
          </div>
        ) : error && !info ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">😕</div>
            <h2 className="font-bold text-xl text-ink">Uitnodiging niet geldig</h2>
            <p className="text-sm text-ink-muted">{error}</p>
            <button onClick={() => navigate('/login/adult')} className="text-accent text-sm underline">
              Terug naar inlogpagina
            </button>
          </div>
        ) : info ? (
          <div className="space-y-6">
            {/* Info blok */}
            <div className="bg-surface rounded-2xl p-4 border border-border">
              <p className="text-sm text-ink-muted mb-1">Je bent uitgenodigd door</p>
              <p className="font-semibold text-ink">{info.invitedByName}</p>
              <p className="text-sm text-ink-muted mt-2 mb-1">Voor het dossier van</p>
              <p className="font-semibold text-ink">{info.childName}</p>
              <p className="text-sm text-ink-muted mt-3 mb-2">Je krijgt toegang tot</p>
              <div className="flex flex-wrap gap-1.5">
                {info.modules.map(m => (
                  <span key={m} className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                    {MODULE_LABELS[m] ?? m}
                  </span>
                ))}
              </div>
            </div>

            {/* Formulier */}
            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">Jouw naam</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Bv. Nathalie De Backer"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">E-mail</label>
                <input
                  readOnly
                  value={info.email}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface/50 text-ink-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">Wachtwoord kiezen</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimaal 8 tekens"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">Wachtwoord bevestigen</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Herhaal wachtwoord"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink focus:border-accent focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

              <button type="submit" disabled={saving}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? 'Account aanmaken...' : 'Account aanmaken & inloggen'}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
