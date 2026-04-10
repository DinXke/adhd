/**
 * Systeembeheer — Admin-only
 * Upgrade, rollback, backup, versie-info
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useMyChildren } from '../../lib/queries'

interface VersionInfo { version: string; uptime: number }
interface UpdateCheck {
  update_available: boolean
  current?: string
  current_sha?: string
  latest?: string
  latest_sha?: string
  changes?: string[]
  error?: string
}
interface UpdateStatus {
  status: 'running' | 'success' | 'failed'
  version?: string
  error?: string
  timestamp?: string
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} dag${d !== 1 ? 'en' : ''} ${h}u`
  if (h > 0) return `${h}u ${m}m`
  return `${m} minuten`
}

// ── TRMNL Configuratiepanel ─────────────────────────────────────
function TrmnlPanel() {
  const { data: childrenData } = useMyChildren()
  const children = childrenData?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState('')
  const childId = selectedChildId || children[0]?.id || ''
  const childName = children.find(c => c.id === childId)?.name ?? 'Kind'

  const [apiKey, setApiKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [userUuid, setUserUuid] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkDone, setLinkDone] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const appUrl = window.location.origin

  // Generate API key
  async function generateApiKey() {
    setGenerating(true)
    try {
      const res = await api.post<{ token: string }>('/api/trmnl/generate-token', { childId })
      setApiKey(res.token)
    } catch {}
    setGenerating(false)
  }

  // Link TRMNL device
  async function linkDevice() {
    if (!userUuid.trim()) return
    setLinking(true)
    try {
      await api.post('/api/trmnl/link', { childId, userUuid: userUuid.trim() })
      setLinkDone(true)
      setTimeout(() => setLinkDone(false), 3000)
    } catch {}
    setLinking(false)
  }

  // Copy to clipboard
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // Download ZIP
  async function downloadZip() {
    try {
      const response = await fetch(`/api/trmnl/plugin.zip?_=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = blobUrl
      a.download = 'grip-trmnl-plugin.zip'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }, 5000)
    } catch {
      window.open(`/api/trmnl/plugin.zip?_=${Date.now()}`, '_blank')
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-ink font-mono focus:border-accent focus:outline-none"
  const copyBtnCls = "px-2 py-1.5 rounded-lg border border-border text-xs font-medium text-ink-muted hover:border-accent hover:text-accent transition-colors flex-shrink-0"

  return (
    <div className="card p-5 space-y-5">
      <div>
        <h2 className="font-semibold text-ink text-lg mb-1">TRMNL E-Paper Display</h2>
        <p className="text-sm text-ink-muted">
          Toon de dagplanning en token-voortgang op een TRMNL e-ink scherm.
        </p>
      </div>

      {/* Stap 1: ZIP downloaden */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0">1</span>
          <p className="font-semibold text-ink text-sm">Plugin downloaden en importeren</p>
        </div>
        <p className="text-xs text-ink-muted ml-8">
          Download de ZIP → ga naar <strong>usetrmnl.com</strong> → Plugins → Private → Import → upload de ZIP.
        </p>
        <div className="ml-8">
          <button onClick={downloadZip}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Plugin ZIP downloaden
          </button>
        </div>
      </div>

      {/* Stap 2: Kind kiezen */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0">2</span>
          <p className="font-semibold text-ink text-sm">Kind kiezen voor het scherm</p>
        </div>
        <div className="ml-8 space-y-2">
          {children.length > 1 && (
            <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-ink">
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <p className="text-xs text-ink-muted">
            Vul het <strong>Kind ID</strong> in bij TRMNL, of gebruik <code className="px-1 py-0.5 rounded bg-card border border-border font-mono text-[10px]">all</code> om te alterneren.
          </p>
          <div className="space-y-1">
            {children.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-ink">{c.name}:</span>
                <code className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px] text-ink-muted select-all">{c.id}</code>
                <button onClick={() => copyToClipboard(c.id, `child-${c.id}`)} className={copyBtnCls}>
                  {copied === `child-${c.id}` ? '✓' : 'Kopieer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stap 3: Waardes voor TRMNL instellingen */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0">3</span>
          <p className="font-semibold text-ink text-sm">Waardes invullen in TRMNL plugin-instellingen</p>
        </div>

        <div className="ml-8 space-y-3">
          {/* GRIP Server URL */}
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">GRIP Server URL</label>
            <div className="flex gap-2">
              <input value={appUrl} readOnly className={inputCls} />
              <button onClick={() => copyToClipboard(appUrl, 'url')} className={copyBtnCls}>
                {copied === 'url' ? '✓' : 'Kopieer'}
              </button>
            </div>
          </div>

          {/* TRMNL User UUID */}
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">TRMNL User UUID</label>
            <p className="text-xs text-ink-muted mb-1">
              Vind je op <strong>usetrmnl.com</strong> → Account → API. Of laat leeg (wordt automatisch meegegeven door TRMNL).
            </p>
            <div className="flex gap-2">
              <input
                value={userUuid}
                onChange={e => setUserUuid(e.target.value)}
                placeholder="bv. abc123-def456-..."
                className={inputCls}
              />
              <button onClick={linkDevice} disabled={!userUuid.trim() || linking}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-50 flex-shrink-0">
                {linkDone ? '✓ Gekoppeld' : linking ? '...' : 'Koppel'}
              </button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">API Key</label>
            <p className="text-xs text-ink-muted mb-1">
              Beveiligingstoken zodat alleen jouw TRMNL het scherm kan ophalen.
            </p>
            {apiKey ? (
              <div className="flex gap-2">
                <input value={apiKey} readOnly className={inputCls} />
                <button onClick={() => copyToClipboard(apiKey, 'key')} className={copyBtnCls}>
                  {copied === 'key' ? '✓' : 'Kopieer'}
                </button>
              </div>
            ) : (
              <button onClick={generateApiKey} disabled={generating || !childId}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50">
                {generating ? 'Genereren...' : 'API Key genereren'}
              </button>
            )}
            {apiKey && (
              <p className="text-[10px] text-ink-muted mt-1">
                Bewaar deze key — kopieer hem naar het "API Key" veld in de TRMNL plugin-instellingen. Bij een nieuwe generatie wordt de oude ongeldig.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stap 4: Schermvoorbeelden */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0">4</span>
          <p className="font-semibold text-ink text-sm">Scherm toewijzen en testen</p>
        </div>
        <p className="text-xs text-ink-muted ml-8">
          Wijs de plugin toe aan je apparaat in TRMNL. Klik "Forceer verversen" om te testen.
        </p>
        <div className="ml-8 flex gap-2">
          <a href="/api/trmnl/markup" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-ink hover:bg-card">
            Preview bekijken
          </a>
        </div>
        <div className="ml-8 grid grid-cols-3 gap-2 text-xs text-ink-muted">
          {[
            { label: 'Full', desc: 'Dagplanning + tokens' },
            { label: 'Half', desc: 'Voortgang + streak' },
            { label: 'Quadrant', desc: 'Huidige activiteit' },
          ].map(({ label, desc }) => (
            <div key={label} className="text-center p-2 bg-card rounded-lg border border-border">
              <p className="font-medium text-ink mb-0.5">{label}</p>
              <p className="text-[10px] leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tijdzone instelling ─────────────────────────────────────
function TimezonePanel() {
  const [tz, setTz] = useState('Europe/Brussels')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<{ settings: { timezone?: string } }>('/api/admin/settings')
      .then(r => { if (r.settings.timezone) setTz(r.settings.timezone) })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/admin/settings', { timezone: tz })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const timezones = [
    'Europe/Brussels', 'Europe/Amsterdam', 'Europe/Paris', 'Europe/Berlin',
    'Europe/London', 'Europe/Zurich', 'Europe/Vienna', 'Europe/Rome',
    'Europe/Madrid', 'Europe/Lisbon', 'Europe/Stockholm', 'Europe/Warsaw',
    'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'Asia/Tokyo', 'Australia/Sydney',
  ]

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-ink mb-1">Tijdzone</h2>
      <p className="text-sm text-ink-muted mb-3">
        Bepaalt wanneer activiteiten als "nu" of "afgerond" getoond worden.
      </p>
      <div className="flex gap-2">
        <select value={tz} onChange={e => setTz(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none">
          {timezones.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50">
          {saved ? '✓' : saving ? '...' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}

export function SystemPage() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [upgradeState, setUpgradeState] = useState<'idle' | 'applying' | 'success' | 'failed'>('idle')
  const [upgradeResult, setUpgradeResult] = useState<UpdateStatus | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupDone, setBackupDone] = useState(false)
  const [confirmUpgrade, setConfirmUpgrade] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get<VersionInfo>('/api/admin/system/version').then(setVersionInfo).catch(() => {})
  }, [])

  async function checkUpdate() {
    setCheckLoading(true)
    setUpdateCheck(null)
    try {
      const result = await api.get<UpdateCheck>('/api/admin/system/update-check')
      setUpdateCheck(result)
    } catch {
      setUpdateCheck({ update_available: false, error: 'Kon GitHub niet bereiken' })
    } finally {
      setCheckLoading(false)
    }
  }

  async function applyUpdate() {
    setConfirmUpgrade(false)
    setUpgradeState('applying')
    setUpgradeResult(null)

    await api.post('/api/admin/system/update-apply', {})

    // Poll elke 5 seconden voor resultaat
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.get<UpdateStatus>('/api/admin/system/update-status')
        if (status.status !== 'running') {
          clearInterval(pollRef.current!)
          setUpgradeState(status.status === 'success' ? 'success' : 'failed')
          setUpgradeResult(status)
        }
      } catch {}
    }, 5000)
  }

  async function doRollback() {
    setUpgradeState('applying')
    await api.post('/api/admin/system/rollback', {})
    setTimeout(() => window.location.reload(), 8000)
  }

  async function doBackup() {
    setBackupLoading(true)
    try {
      await api.post('/api/admin/system/backup', {})
      setBackupDone(true)
      setTimeout(() => setBackupDone(false), 4000)
    } finally {
      setBackupLoading(false)
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Backup list ─────────────────────────────────────────────
  const [backups, setBackups] = useState<{name: string; sizeBytes: number; date: string}[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)

  async function loadBackups() {
    setBackupsLoading(true)
    try {
      const res = await api.get<{ backups: any[] }>('/api/admin/system/backups')
      setBackups(res.backups ?? [])
    } catch {}
    setBackupsLoading(false)
  }

  useEffect(() => { loadBackups() }, [])

  const UPGRADE_STEPS = [
    'Pre-upgrade backup maken',
    'Nieuwe code ophalen van GitHub',
    'Docker containers rebuilden',
    'Database migraties uitvoeren',
    'Containers herstarten',
    'Health check uitvoeren',
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Systeembeheer</h1>
        <p className="text-sm text-ink-muted mt-0.5">Updates, backups en versie-informatie</p>
      </div>

      {/* Tijdzone */}
      <TimezonePanel />

      {/* Versie & uptime */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink mb-3">Huidige versie</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Versie', value: versionInfo?.version ?? '—' },
            { label: 'Uptime', value: versionInfo ? formatUptime(versionInfo.uptime) : '—' },
            { label: 'Stack', value: 'React · Fastify · PostgreSQL' },
            { label: 'Hosting', value: 'Proxmox · Docker Compose' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-xs text-ink-muted mb-0.5">{label}</p>
              <p className="text-sm font-medium text-ink font-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Update check & apply */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">Software-update</h2>
          <button onClick={checkUpdate} disabled={checkLoading}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-ink disabled:opacity-50 flex items-center gap-2">
            {checkLoading ? (
              <><span className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin" /> Controleren...</>
            ) : '🔍 Controleer updates'}
          </button>
        </div>

        <AnimatePresence>
          {updateCheck && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {updateCheck.error ? (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{updateCheck.error}</div>
              ) : !updateCheck.update_available ? (
                <div className="p-3 rounded-xl bg-accent-success/10 border border-accent-success/30 text-sm text-accent-success font-medium">
                  ✅ Je draait de nieuwste versie ({updateCheck.current_sha})
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-800">Update beschikbaar: {updateCheck.latest}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {updateCheck.current_sha} → {updateCheck.latest_sha}
                      </p>
                    </div>
                    <button onClick={() => setConfirmUpgrade(true)}
                      className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90">
                      Installeren
                    </button>
                  </div>
                  {updateCheck.changes && updateCheck.changes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-700 mb-1.5">Wijzigingen:</p>
                      <ul className="space-y-0.5">
                        {updateCheck.changes.slice(0, 8).map((c, i) => (
                          <li key={i} className="text-xs text-amber-700 font-mono">• {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bevestiging dialog */}
        <AnimatePresence>
          {confirmUpgrade && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-3 p-4 rounded-xl border-2 border-accent bg-card space-y-3"
            >
              <p className="font-semibold text-ink">Weet je het zeker?</p>
              <p className="text-sm text-ink-muted">
                De app herstart tijdelijk. Er wordt automatisch een backup gemaakt vóór de update.
                Bij problemen volgt een automatische rollback.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmUpgrade(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-sm text-ink-muted">
                  Annuleren
                </button>
                <button onClick={applyUpdate}
                  className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium">
                  ✅ Bevestig update
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upgrade voortgang */}
        <AnimatePresence>
          {upgradeState === 'applying' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <p className="font-medium text-ink text-sm">Update bezig...</p>
              </div>
              <div className="space-y-2">
                {UPGRADE_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[10px]">{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-muted mt-3">Dit duurt 2–5 minuten. De app herstart automatisch.</p>
            </motion.div>
          )}

          {upgradeState === 'success' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-4 rounded-xl bg-accent-success/10 border border-accent-success/30">
              <p className="font-semibold text-accent-success">✅ Update succesvol!</p>
              {upgradeResult?.version && (
                <p className="text-sm text-accent-success/80 mt-1">Versie: {upgradeResult.version}</p>
              )}
              <div className="flex gap-3 mt-3">
                <button onClick={() => window.location.reload()}
                  className="flex-1 py-2 rounded-xl bg-accent-success text-white text-sm font-medium">
                  🔄 Pagina herladen
                </button>
                <button onClick={doRollback}
                  className="flex-1 py-2 rounded-xl border border-border text-sm text-ink-muted">
                  ⏪ Rollback
                </button>
              </div>
            </motion.div>
          )}

          {upgradeState === 'failed' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="font-semibold text-red-700">❌ Update mislukt — automatische rollback uitgevoerd</p>
              {upgradeResult?.error && (
                <p className="text-sm text-red-600 mt-1">{upgradeResult.error}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backup */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink mb-3">Database backup</h2>
        <p className="text-sm text-ink-muted mb-4">
          Backups worden dagelijks automatisch gemaakt om 03:00 en opgeslagen op de NAS (30 dagen retentie, GPG-versleuteld).
        </p>
        <button onClick={doBackup} disabled={backupLoading}
          className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-ink disabled:opacity-50 flex items-center gap-2">
          {backupLoading ? (
            <><span className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin" /> Backup maken...</>
          ) : backupDone ? '✅ Backup gemaakt!' : '📦 Nu backup maken'}
        </button>
      </div>

      {/* Rollback */}
      <div className="card p-5 border-red-200">
        <h2 className="font-semibold text-ink mb-1">Noodherstel</h2>
        <p className="text-sm text-ink-muted mb-4">
          Keer terug naar de vorige versie. Gebruik dit alleen als de app niet werkt na een update.
        </p>
        <button onClick={doRollback}
          className="px-4 py-2.5 rounded-xl border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          ⏪ Rollback naar vorige versie
        </button>
      </div>

      {/* TRMNL E-Paper Plugin */}
      <TrmnlPanel />

      {/* App versie info */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink mb-3">Over GRIP v1.0</h2>
        <p className="text-sm text-ink-muted mb-3">
          GRIP staat voor <strong>G</strong>roei, <strong>R</strong>outine, <strong>I</strong>nzicht, <strong>P</strong>lanning —
          een app specifiek gebouwd voor kinderen met ADHD op basis van de Barkley-methode.
        </p>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Versie', value: 'v1.3.0' },
            { label: 'Licentie', value: 'Privégebruik (familie Scheepers)' },
            { label: 'Methodologie', value: 'Barkley External Executive Function' },
            { label: 'GitHub', value: 'dinxke/adhd' },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-4">
              <span className="text-ink-muted w-28 flex-shrink-0">{label}</span>
              <span className="text-ink font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SystemPage
