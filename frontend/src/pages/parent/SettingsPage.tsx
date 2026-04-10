/**
 * Instellingen — Gestructureerd in categorieën
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useMyChildren, useTokenBalance, useRewards, useAllSchedules, useTasks } from '../../lib/queries'
import { useHaStatus, useHaTest } from '../../lib/queries'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { AvatarDisplay } from '../../components/AvatarDisplay'
import { useQuery } from '@tanstack/react-query'
import { useAccessibilityStore, ADULT_THEMES, type AdultTheme } from '../../stores/accessibilityStore'

// ── Kind-selector (sticky bovenaan) ──────────────────────────
function ChildSelector({ children, childId, onChange }: {
  children: { id: string; name: string; avatarId?: string | null }[]
  childId: string
  onChange: (id: string) => void
}) {
  if (children.length <= 1) return null
  return (
    <div className="flex gap-2 flex-wrap mb-5">
      {children.map(child => (
        <button
          key={child.id}
          onClick={() => onChange(child.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm ${
            childId === child.id
              ? 'border-accent bg-accent/5 font-semibold text-ink'
              : 'border-border text-ink-muted hover:border-accent/40'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-surface overflow-hidden flex-shrink-0">
            <AvatarDisplay avatarId={child.avatarId} name={child.name} size={28} />
          </div>
          {child.name}
        </button>
      ))}
    </div>
  )
}

// ── Navigatie-item in een categorie ──────────────────────────
function NavItem({ icon, label, sub, route, color }: {
  icon: string; label: string; sub: string; route: string; color: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(route)}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-surface transition-colors"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="text-xl w-8 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm">{label}</p>
        <p className="text-xs text-ink-muted truncate">{sub}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}

// ── Categorie-kaart ──────────────────────────────────────────
function Category({ title, icon, children, defaultOpen = false }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/50 transition-colors"
      >
        <span className="text-xl">{icon}</span>
        <span className="font-display font-bold text-ink text-base flex-1">{title}</span>
        <motion.svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          animate={{ rotate: open ? 180 : 0 }}
          className="text-ink-muted"
        >
          <polyline points="6 9 12 15 18 9"/>
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Push notificaties (compact) ──────────────────────────────
function PushRow() {
  const { state, subscribe, unsubscribe } = usePushNotifications()
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔔</span>
        <div>
          <p className="font-semibold text-ink text-sm">Push notificaties</p>
          <p className="text-xs text-ink-muted">
            {state === 'subscribed' ? 'Ingeschakeld' : state === 'denied' ? 'Geblokkeerd' : 'Uitgeschakeld'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${state === 'subscribed' ? 'bg-accent-success' : 'bg-border'}`} />
        {state === 'unsubscribed' && (
          <button onClick={subscribe} className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium">Aan</button>
        )}
        {state === 'subscribed' && (
          <button onClick={unsubscribe} className="px-3 py-1 rounded-lg border border-border text-xs text-ink-muted">Uit</button>
        )}
      </div>
    </div>
  )
}

// ── Home Assistant (compact) ─────────────────────────────────
function HaRow() {
  const { data: ha } = useHaStatus()
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/dashboard/system')}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-surface text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🏠</span>
        <div>
          <p className="font-semibold text-ink text-sm">Home Assistant</p>
          <p className="text-xs text-ink-muted">{ha?.configured ? 'Verbonden' : 'Niet geconfigureerd'}</p>
        </div>
      </div>
      <span className={`w-2 h-2 rounded-full ${ha?.configured ? 'bg-accent-success' : 'bg-border'}`} />
    </button>
  )
}

// ── Thema-keuze (ouder) ──────────────────────────────────────
function ThemeRow() {
  const { adultTheme, setAdultTheme } = useAccessibilityStore()
  return (
    <div className="p-3 rounded-xl bg-surface space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xl">🎨</span>
        <div>
          <p className="font-semibold text-ink text-sm">Thema</p>
          <p className="text-xs text-ink-muted">Kies je weergave</p>
        </div>
      </div>
      <div className="flex gap-2 ml-9">
        {ADULT_THEMES.map(t => (
          <button
            key={t.key}
            onClick={() => setAdultTheme(t.key as AdultTheme)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              adultTheme === t.key
                ? 'bg-accent text-white border-2 border-accent'
                : 'bg-card border-2 border-border text-ink-muted'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Domeinen (compact) ───────────────────────────────────────
function DomainsRow() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/dashboard/system')}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface text-left"
    >
      <span className="text-xl">🌐</span>
      <div>
        <p className="font-semibold text-ink text-sm">Domeinen & CORS</p>
        <p className="text-xs text-ink-muted">Beheer in Systeembeheer</p>
      </div>
    </button>
  )
}

// ── Hoofdpagina ──────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()
  const { data: childrenData } = useMyChildren()
  const children = childrenData?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState('')

  const childId = selectedChildId || children[0]?.id || ''
  const selectedChild = children.find(c => c.id === childId)

  // Data voor stats
  const { data: tokenData } = useTokenBalance(childId || undefined)
  const { data: rewardsData } = useRewards(childId || undefined)
  const { data: scheduleData } = useAllSchedules(childId || undefined)
  const { data: apptData } = useQuery({
    queryKey: ['appointments', childId],
    queryFn: () => api.get<{ appointments: any[] }>(`/api/appointments/${childId}`),
    enabled: !!childId,
  })

  const balance = tokenData?.balance ?? 0
  const streak = tokenData?.streak ?? 0
  const rewards = rewardsData?.rewards ?? []
  const schedules = scheduleData?.schedules ?? []
  const appointments = apptData?.appointments ?? []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display font-bold text-ink text-2xl">Instellingen</h1>
        <p className="font-body text-ink-muted text-sm mt-0.5">
          Alles beheren vanuit één plek
        </p>
      </div>

      {/* Kind selector */}
      <ChildSelector children={children} childId={childId} onChange={setSelectedChildId} />

      {/* Kind samenvatting */}
      {selectedChild && (
        <div className="card p-4 flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-surface border-2 border-accent/20 flex items-center justify-center overflow-hidden">
            <AvatarDisplay avatarId={selectedChild.avatarId} name={selectedChild.name} size={50} />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-ink text-lg">{selectedChild.name}</p>
            <div className="flex gap-3 text-xs text-ink-muted mt-0.5">
              <span>⭐ {balance} tokens</span>
              <span>🔥 {streak}d streak</span>
              <span>{rewards.length} beloningen</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* ── Dagelijks ─────────────────────────────────── */}
        <Category title="Dagelijks" icon="📅" defaultOpen={true}>
          <NavItem icon="📅" label="Schema's" sub={`${schedules.length} dagen ingesteld`} route="/dashboard/schedule" color="#7BAFA3" />
          <NavItem icon="✅" label="Taken" sub="Taken beheren" route="/dashboard/tasks" color="#5B8C5A" />
          <NavItem icon="🗓️" label="Afspraken" sub={`${appointments.length} afspraken`} route="/dashboard/appointments" color="#9B7CC8" />
        </Category>

        {/* ── Beloningen & motivatie ────────────────────── */}
        <Category title="Beloningen & motivatie" icon="⭐">
          <NavItem icon="⭐" label="Tokens & beloningen" sub={`⭐ ${balance} · ${rewards.length} beloningen`} route="/dashboard/tokens" color="#D4973B" />
          <NavItem icon="🐷" label="Spaarpotje" sub="Virtueel geld beheren" route="/dashboard/money" color="#5B8C5A" />
        </Category>

        {/* ── Leren & oefenen ──────────────────────────── */}
        <Category title="Leren & oefenen" icon="📚">
          <NavItem icon="📚" label="Oefeningen" sub="Genereren, reviewen, statistieken" route="/dashboard/exercises/review" color="#E8734A" />
          <NavItem icon="💪" label="Vaardigheden" sub="Zelfstandigheidschecklist" route="/dashboard/vaardigheden" color="#5B8C5A" />
          <NavItem icon="💬" label="Sociale scripts" sub="Scenario-oefeningen" route="/dashboard/social-scripts" color="#7BAFA3" />
        </Category>

        {/* ── Communicatie & dossier ────────────────────── */}
        <Category title="Communicatie & dossier" icon="💬">
          <NavItem icon="💬" label="Berichten" sub="Communicatie met hulpverleners" route="/dashboard/communication" color="#7BAFA3" />
          <NavItem icon="📋" label="Dossier" sub="Verslagen, plannen, notities" route="/dashboard/dossier" color="#D4973B" />
          <NavItem icon="📁" label="Documenten" sub="Alle gedeelde bestanden" route="/dashboard/documents" color="#9B7CC8" />
          <NavItem icon="🤝" label="Hulpverleners" sub="Uitnodigingen en toegang" route="/dashboard/hulpverleners" color="#E8734A" />
        </Category>

        {/* ── Gezin ────────────────────────────────────── */}
        <Category title="Gezin" icon="👨‍👩‍👧">
          <NavItem icon="👧" label="Kinderen" sub="Profielen en PIN-codes" route="/dashboard/children" color="#7BAFA3" />
          <NavItem icon="📈" label="Voortgang" sub="Grafieken en rapporten" route="/dashboard/voortgang" color="#5B8C5A" />
        </Category>

        {/* ── App & systeem ────────────────────────────── */}
        <Category title="App & systeem" icon="⚙️">
          <ThemeRow />
          <PushRow />
          <HaRow />
          {isAdmin && <DomainsRow />}
          {isAdmin && <NavItem icon="🖥️" label="Systeembeheer" sub="Updates, backups, TRMNL" route="/dashboard/system" color="#D4973B" />}
          {isAdmin && <NavItem icon="📺" label="TRMNL Editor" sub="E-paper schermen ontwerpen" route="/dashboard/trmnl-editor" color="#9B7CC8" />}
          {isAdmin && <NavItem icon="👥" label="Gebruikers" sub="Accounts beheren" route="/dashboard/users" color="#E8734A" />}
          <NavItem icon="❓" label="Help & handleidingen" sub="FAQ, changelog, contact" route="/dashboard/help" color="#7BAFA3" />
        </Category>

        {/* Versie */}
        <div className="text-center text-xs text-ink-muted py-3">
          GRIP v1.4.0 — Groei, Routine, Inzicht, Planning
        </div>
      </div>
    </div>
  )
}
