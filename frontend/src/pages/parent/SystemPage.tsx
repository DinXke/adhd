/**
 * Systeembeheer — Admin-only
 * Upgrade, rollback, backup, versie-info
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'

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
      <div className="card p-5">
        <h2 className="font-semibold text-ink mb-1">TRMNL E-Paper Display</h2>
        <p className="text-sm text-ink-muted mb-4">
          Toon de dagplanning en token-voortgang van je kind op een TRMNL e-ink scherm in de keuken.
        </p>
        <div className="space-y-3 mb-4">
          {[
            { step: '1', text: 'Download de Plugin ZIP hieronder' },
            { step: '2', text: 'Ga naar usetrmnl.com → Plugins → Private → Import → upload de ZIP' },
            { step: '3', text: 'Vul je GRIP Server URL in bij de plugin-instellingen' },
            { step: '4', text: 'Wijs de plugin toe aan je TRMNL apparaat' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </span>
              <span className="text-ink-muted">{text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={async () => {
              try {
                // Bypass service worker via cache: 'no-store'
                const response = await fetch('/api/trmnl/plugin.zip', { cache: 'no-store' })
                if (!response.ok) throw new Error('Download mislukt')
                const blob = await response.blob()
                const blobUrl = URL.createObjectURL(blob)
                // Use a temporary link with download attribute
                const a = document.createElement('a')
                a.style.display = 'none'
                a.href = blobUrl
                a.download = 'grip-trmnl-plugin.zip'
                a.setAttribute('type', 'application/zip')
                document.body.appendChild(a)
                a.click()
                // Cleanup after delay (Android needs time)
                setTimeout(() => {
                  document.body.removeChild(a)
                  URL.revokeObjectURL(blobUrl)
                }, 5000)
              } catch (e) {
                // Fallback: open in new tab (browser will download due to Content-Disposition)
                window.open('/api/trmnl/plugin.zip', '_blank')
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Plugin ZIP downloaden
          </button>
          <a
            href="/api/trmnl/markup"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-ink hover:bg-surface"
          >
            👁️ Preview bekijken
          </a>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-surface border border-border">
          <p className="text-xs font-medium text-ink mb-2">Schermen (monochroom e-ink):</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-ink-muted">
            {[
              { label: 'Full', desc: 'Dagplanning + tokens + emotie' },
              { label: 'Half', desc: 'Token-voortgang + streak' },
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
