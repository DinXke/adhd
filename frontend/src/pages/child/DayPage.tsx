import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useTodaySchedule, Activity } from '../../lib/queries'
import { api } from '../../lib/api'

interface Appointment {
  id: string
  title: string
  icon: string
  color: string
  startTime: string
  durationMinutes: number
  location?: string | null
}

// Unified timeline item — either an activity or an appointment
interface TimelineItem {
  kind: 'activity' | 'appointment'
  id: string
  title: string
  icon: string
  startTime: string
  durationMinutes: number
  color: string
  // Activity-only
  isCurrent?: boolean
  isPast?: boolean
  steps?: { id: string; title: string }[]
  activity?: Activity
  // Appointment-only
  location?: string | null
}

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// ── Activity card (schema-items) ──────────────────────────────
function ActivityCard({ act, onPress }: { act: Activity; onPress: () => void }) {
  const isDone = act.isPast && !act.isCurrent

  return (
    <motion.button
      onClick={onPress}
      className="w-full text-left card flex items-center gap-4 px-4 py-3"
      style={{
        opacity: isDone ? 0.55 : 1,
        borderLeft: act.isCurrent ? '4px solid var(--accent-primary)' : '4px solid transparent',
        background: act.isCurrent ? 'var(--bg-surface)' : undefined,
      }}
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: isDone ? 0.55 : 1, x: 0 }}
    >
      <span className="text-2xl w-8 text-center flex-shrink-0" aria-hidden="true">
        {act.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-body font-semibold text-ink leading-tight"
          style={{ textDecoration: isDone ? 'line-through' : undefined, fontSize: '1.05rem' }}
        >
          {act.title}
        </p>
        <p className="text-ink-muted font-body text-sm mt-0.5">
          {act.startTime}
          {act.durationMinutes < 600 && ` · ${act.durationMinutes} min`}
          {act.steps.length > 0 && ` · ${act.steps.length} stappen`}
        </p>
      </div>
      {act.isCurrent && (
        <span
          className="text-xs font-display font-bold px-3 py-1 rounded-pill flex-shrink-0"
          style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: '0.75rem' }}
        >
          NU
        </span>
      )}
      {isDone && (
        <span className="text-xl flex-shrink-0" aria-label="Klaar">✅</span>
      )}
      {!isDone && !act.isCurrent && act.steps.length > 0 && (
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted flex-shrink-0">
          <path d="M12 8L20 16L12 24" stroke="currentColor" />
        </svg>
      )}
    </motion.button>
  )
}

// ── Appointment card (afspraken — speciale achtergrond) ────────
function AppointmentCard({ item }: { item: TimelineItem }) {
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const startMins = timeToMinutes(item.startTime)
  const endMins = startMins + item.durationMinutes
  const isCurrent = nowMins >= startMins && nowMins < endMins
  const isPast = nowMins >= endMins

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: isPast ? 0.5 : 1, x: 0 }}
      className="w-full card flex items-center gap-4 px-4 py-3 relative overflow-hidden"
      style={{
        borderLeft: `4px solid ${item.color}`,
        background: isCurrent
          ? `linear-gradient(135deg, ${item.color}18, ${item.color}08)`
          : `repeating-linear-gradient(135deg, transparent, transparent 8px, ${item.color}06 8px, ${item.color}06 16px)`,
      }}
    >
      {/* Subtiel afspraak-badge */}
      <div
        className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold tracking-wide uppercase"
        style={{ background: `${item.color}20`, color: item.color }}
      >
        afspraak
      </div>

      <span className="text-2xl w-8 text-center flex-shrink-0" aria-hidden="true">
        {item.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-body font-semibold leading-tight"
          style={{
            color: isCurrent ? item.color : 'var(--text-primary)',
            textDecoration: isPast ? 'line-through' : undefined,
            fontSize: '1.05rem',
          }}
        >
          {item.title}
        </p>
        <p className="text-ink-muted font-body text-sm mt-0.5">
          {item.startTime} · {item.durationMinutes} min
          {item.location && ` · ${item.location}`}
        </p>
      </div>
      {isCurrent && (
        <span
          className="text-xs font-display font-bold px-3 py-1 rounded-pill flex-shrink-0"
          style={{ background: item.color, color: '#fff', fontSize: '0.75rem' }}
        >
          NU
        </span>
      )}
      {isPast && (
        <span className="text-xl flex-shrink-0">✅</span>
      )}
    </motion.div>
  )
}

// ── Hoofd-component ───────────────────────────────────────────
export default function DayPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data, isLoading, error } = useTodaySchedule(user?.id)
  const { data: apptData } = useQuery({
    queryKey: ['appointments-today', user?.id],
    queryFn: () => api.get<{ appointments: Appointment[] }>(`/api/appointments/${user?.id}/today`),
    enabled: !!user?.id,
  })

  const now = new Date()
  const dayName = DAY_NAMES[now.getDay()]
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]}`
  const isVacation = (data as any)?.isVacation ?? false
  const vacationTitle = (data as any)?.vacationTitle ?? null

  // Merge activities + appointments into sorted timeline
  const activities = data?.activities ?? []
  const appointments = apptData?.appointments ?? []

  const timeline: TimelineItem[] = [
    ...activities.map(act => ({
      kind: 'activity' as const,
      id: act.id,
      title: act.title,
      icon: act.icon,
      startTime: act.startTime,
      durationMinutes: act.durationMinutes,
      color: act.color,
      isCurrent: act.isCurrent,
      isPast: act.isPast,
      steps: act.steps,
      activity: act,
    })),
    ...appointments.map(ap => ({
      kind: 'appointment' as const,
      id: `appt-${ap.id}`,
      title: ap.title,
      icon: ap.icon,
      startTime: ap.startTime,
      durationMinutes: ap.durationMinutes,
      color: ap.color,
      location: ap.location,
    })),
  ].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const currentActivity = activities.find((a) => a.isCurrent)
  const nextItem = currentActivity
    ? timeline[timeline.findIndex(t => t.kind === 'activity' && t.activity === currentActivity) + 1]
    : timeline.find(t => {
        if (t.kind === 'activity') return !t.isPast
        const mins = timeToMinutes(t.startTime)
        return now.getHours() * 60 + now.getMinutes() < mins + t.durationMinutes
      })

  const handleActivityPress = (act: Activity) => {
    if (act.steps.length > 0) {
      navigate(`/app/nu-doen/${act.id}`, { state: { activity: act } })
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'var(--bg-primary)' }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <p className="text-ink-muted font-body text-sm">{dayName} {dateStr}</p>
            {isVacation && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(155,124,200,0.15)', color: '#9B7CC8' }}>
                🏖️ {vacationTitle ?? 'Vakantie'}
              </span>
            )}
          </div>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: 'var(--font-size-heading)' }}>
            Hallo {user?.name}! {now.getHours() < 12 ? '🌅' : now.getHours() < 17 ? '☀️' : '🌙'}
          </h1>
        </motion.div>

        {/* Nu bezig-kaart */}
        <AnimatePresence>
          {currentActivity && (
            <motion.button
              key="current"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={() => handleActivityPress(currentActivity)}
              className="w-full mt-3 rounded-[20px] p-4 text-left"
              style={{ background: 'var(--accent-primary)' }}
              whileTap={{ scale: 0.97 }}
            >
              <p className="font-body text-white/80 text-sm font-medium mb-0.5">Nu bezig</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentActivity.icon}</span>
                <div className="flex-1">
                  <p className="font-display font-bold text-white text-xl leading-tight">
                    {currentActivity.title}
                  </p>
                  {nextItem && (
                    <p className="text-white/70 font-body text-sm mt-0.5">
                      Daarna: {nextItem.icon} {nextItem.title}
                    </p>
                  )}
                </div>
                {currentActivity.steps.length > 0 && (
                  <span
                    className="font-display font-bold text-sm px-3 py-1.5 rounded-pill"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    Start
                  </span>
                )}
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tijdlijn */}
      <div className="px-5 pb-6">
        {isLoading && (
          <div className="flex flex-col gap-3 mt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-16 animate-pulse" style={{ background: 'var(--bg-surface)' }} />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">😕</span>
            <p className="font-body text-ink-muted">Kon het schema niet laden. Probeer opnieuw.</p>
          </div>
        )}

        {!isLoading && !error && timeline.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">🌟</span>
            <p className="font-display font-bold text-ink text-xl mb-2">Geen activiteiten!</p>
            <p className="font-body text-ink-muted text-base">
              Vraag mama of papa om jouw dag in te vullen.
            </p>
          </div>
        )}

        {!isLoading && !error && timeline.length > 0 && (
          <div className="flex flex-col gap-2.5 mt-2">
            {timeline.map((item, i) => (
              <motion.div key={item.id} transition={{ delay: i * 0.04 }}>
                {item.kind === 'activity' && item.activity ? (
                  <ActivityCard act={item.activity} onPress={() => handleActivityPress(item.activity!)} />
                ) : (
                  <AppointmentCard item={item} />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
