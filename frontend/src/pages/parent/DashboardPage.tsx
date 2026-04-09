import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const cards = [
    { label: 'Taken vandaag', value: '3 / 7', sub: 'Nog 4 te gaan', accent: false },
    { label: 'Tokens verdiend', value: '⭐ 12', sub: 'Vandaag', accent: true },
    { label: 'Emotie check-in', value: '😊 Goed', sub: '14:30 uur', accent: false },
    { label: 'Oefensessies', value: '2', sub: 'Wiskunde', accent: false },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-ink" style={{ fontSize: 'var(--font-size-heading)' }}>
          Hallo {user?.name}
        </h1>
        <p className="text-ink-muted font-body text-sm mt-1">
          Hier is het overzicht van vandaag
        </p>
      </div>

      {/* Overzicht-kaarten */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card p-4"
          >
            <p className="font-body text-ink-muted text-xs mb-1">{card.label}</p>
            <p
              className="font-display font-bold text-ink text-xl mb-0.5"
              style={{ color: card.accent ? 'var(--accent-token)' : undefined }}
            >
              {card.value}
            </p>
            <p className="font-body text-ink-muted text-xs">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Activiteitslog placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card p-5"
      >
        <h2 className="font-display font-semibold text-ink text-base mb-4">Recente activiteit</h2>
        <div className="flex flex-col gap-3">
          {[
            { time: '15:45', text: 'Wiskunde-sessie afgerond — +1 ⭐', icon: '📚' },
            { time: '14:30', text: 'Emotie check-in: Goed — +1 ⭐', icon: '😊' },
            { time: '08:10', text: 'Ochtendroutine volledig klaar — +3 ⭐', icon: '☀️' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1">
                <p className="font-body text-ink text-sm">{item.text}</p>
                <p className="font-body text-ink-muted text-xs">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
