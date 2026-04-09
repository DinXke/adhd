import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useTodaySchedule, Activity } from '../../lib/queries'

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

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
      {/* Icoon */}
      <span className="text-2xl w-8 text-center flex-shrink-0" aria-hidden="true">
        {act.icon}
      </span>

      {/* Info */}
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

      {/* Status badge */}
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

export default function DayPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data, isLoading, error } = useTodaySchedule(user?.id)

  const now = new Date()
  const dayName = DAY_NAMES[now.getDay()]
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]}`

  const currentActivity = data?.activities.find((a) => a.isCurrent)
  const nextActivity = currentActivity
    ? data?.activities[data.activities.indexOf(currentActivity) + 1]
    : data?.activities.find((a) => !a.isPast)

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
          <p className="text-ink-muted font-body text-sm">{dayName} {dateStr}</p>
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
                  {nextActivity && (
                    <p className="text-white/70 font-body text-sm mt-0.5">
                      Daarna: {nextActivity.icon} {nextActivity.title}
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

        {!isLoading && !error && data?.activities.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">🌟</span>
            <p className="font-display font-bold text-ink text-xl mb-2">Geen activiteiten!</p>
            <p className="font-body text-ink-muted text-base">
              Vraag mama of papa om jouw dag in te vullen.
            </p>
          </div>
        )}

        {!isLoading && !error && data && data.activities.length > 0 && (
          <div className="flex flex-col gap-2.5 mt-2">
            {data.activities.map((act, i) => (
              <motion.div
                key={act.id}
                transition={{ delay: i * 0.04 }}
              >
                <ActivityCard act={act} onPress={() => handleActivityPress(act)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
