import { motion } from 'framer-motion'

// Placeholder — echte data via React Query in Fase 3
const MOCK_BALANCE = 12
const MOCK_NEXT_REWARD = { title: 'Samen een spelletje spelen', cost: 20 }
const MOCK_TODAY_EARNED = [
  { label: 'Ochtendroutine', amount: 3 },
  { label: 'Wiskunde sessie', amount: 1 },
  { label: 'Emotie check-in', amount: 1 },
]

export default function TokensPage() {
  const toNext = MOCK_NEXT_REWARD.cost - MOCK_BALANCE
  const pct = (MOCK_BALANCE / MOCK_NEXT_REWARD.cost) * 100

  return (
    <div className="p-5">
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display font-bold text-ink mb-6"
        style={{ fontSize: 'var(--font-size-heading)' }}
      >
        Jouw tokens ⭐
      </motion.h1>

      {/* Saldo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="card p-6 mb-4 text-center"
      >
        <p className="font-body text-ink-muted text-base mb-1">Jouw saldo</p>
        <p
          className="font-display font-bold text-token"
          style={{ fontSize: 'var(--font-size-big)', lineHeight: 1 }}
        >
          ⭐ {MOCK_BALANCE}
        </p>
      </motion.div>

      {/* Spaarbalk + volgend doel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-5 mb-4"
      >
        <p className="font-body font-semibold text-ink text-base mb-3">
          Volgend doel: {MOCK_NEXT_REWARD.title}
        </p>
        <div className="progress-bar mb-2">
          <motion.div
            className="progress-bar__fill"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-ink-muted font-body text-sm">
          Nog <strong style={{ color: 'var(--accent-primary)' }}>{toNext} tokens</strong> om dit te bereiken
        </p>
      </motion.div>

      {/* Vandaag verdiend */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card p-5"
      >
        <p className="font-display font-bold text-ink text-lg mb-3">Vandaag verdiend</p>
        <div className="flex flex-col gap-2">
          {MOCK_TODAY_EARNED.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="font-body text-ink text-base">{item.label}</span>
              <span className="font-display font-bold text-token">+{item.amount} ⭐</span>
            </div>
          ))}
          <div
            className="flex items-center justify-between pt-2 mt-1"
            style={{ borderTop: '2px solid var(--border-color)' }}
          >
            <span className="font-body font-semibold text-ink">Totaal vandaag</span>
            <span className="font-display font-bold text-token text-lg">
              +{MOCK_TODAY_EARNED.reduce((s, i) => s + i.amount, 0)} ⭐
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
