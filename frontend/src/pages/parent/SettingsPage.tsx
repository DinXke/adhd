/**
 * Instellingen — Admin-only
 * Domeinbeheer (CORS), app-configuratie
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'

interface SettingsData {
  settings: { extraAllowedOrigins: string[]; appName: string }
  envOrigins: string[]
  allOrigins: string[]
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

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

  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    width: '100%',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-ink text-2xl">Instellingen</h1>
        <p className="font-body text-ink-muted text-sm mt-0.5">App-configuratie en domeinbeheer</p>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl px-4 py-3 mb-4 font-body text-sm font-medium"
            style={{ background: 'rgba(91,140,90,0.12)', color: 'var(--accent-success)', border: '1px solid rgba(91,140,90,0.3)' }}
          >
            ✓ {success}
          </motion.div>
        )}
      </AnimatePresence>

      {!isAdmin && (
        <div className="card p-6 text-center">
          <p className="font-body text-ink-muted">Alleen admins hebben toegang tot instellingen.</p>
        </div>
      )}

      {isAdmin && loading && (
        <div className="flex gap-2 justify-center py-12">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}

      {isAdmin && !loading && data && (
        <div className="flex flex-col gap-6">

          {/* Domeinbeheer */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-ink text-lg mb-1">
              Toegestane domeinen
            </h2>
            <p className="font-body text-ink-muted text-sm mb-5">
              De app is bereikbaar via deze domeinen. Voeg nieuwe toe als je via een ander adres toegang wil.
            </p>

            {/* Huidige domeinen */}
            <div className="flex flex-col gap-2 mb-5">
              {data.envOrigins.map((origin) => (
                <div
                  key={origin}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex-shrink-0 w-2 h-2 rounded-full"
                      style={{ background: 'var(--accent-success)' }}
                    />
                    <span className="font-body text-sm text-ink truncate">{origin}</span>
                  </div>
                  <span
                    className="font-body text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--bg-surface, #F5E6D3)', color: 'var(--text-secondary)' }}
                  >
                    vast
                  </span>
                </div>
              ))}

              {data.settings.extraAllowedOrigins.map((origin) => (
                <div
                  key={origin}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex-shrink-0 w-2 h-2 rounded-full"
                      style={{ background: 'var(--accent-secondary)' }}
                    />
                    <span className="font-body text-sm text-ink truncate">{origin}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={removingOrigin === origin}
                    className="font-body text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: 'rgba(196,93,76,0.1)',
                      color: 'var(--accent-danger, #C45D4C)',
                      border: '1px solid rgba(196,93,76,0.2)',
                      opacity: removingOrigin === origin ? 0.5 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    {removingOrigin === origin ? '...' : 'Verwijder'}
                  </button>
                </div>
              ))}

              {data.settings.extraAllowedOrigins.length === 0 && (
                <p className="font-body text-ink-muted text-sm italic py-1">
                  Geen extra domeinen toegevoegd
                </p>
              )}
            </div>

            {/* Nieuw domein toevoegen */}
            <form onSubmit={handleAddOrigin} className="flex flex-col gap-2">
              <label className="font-body text-sm font-medium text-ink">Nieuw domein toevoegen</label>
              <div className="flex gap-2">
                <input
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  placeholder="https://jouwdomein.be"
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
                />
                <button
                  type="submit"
                  disabled={saving || !newOrigin.trim()}
                  className="font-body font-semibold text-sm px-4 py-2 rounded-lg flex-shrink-0"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    opacity: saving || !newOrigin.trim() ? 0.6 : 1,
                    cursor: saving || !newOrigin.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {saving ? '...' : 'Toevoegen'}
                </button>
              </div>
              {addError && (
                <p className="font-body text-xs" style={{ color: 'var(--accent-danger, #C45D4C)' }}>
                  {addError}
                </p>
              )}
              <p className="font-body text-xs text-ink-muted">
                Verwijder de trailing slash. Voorbeeld: <code>https://grip.jouwdomein.be</code>
              </p>
            </form>
          </div>

          {/* Versie-info */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-ink text-lg mb-3">Over GRIP</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Naam', value: 'GRIP — Groei, Routine, Inzicht, Planning' },
                { label: 'Versie', value: '1.0.0 (Fase 4)' },
                { label: 'Stack', value: 'React • Fastify • PostgreSQL • Docker' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="font-body text-sm text-ink-muted w-20 flex-shrink-0">{label}</span>
                  <span className="font-body text-sm text-ink">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
