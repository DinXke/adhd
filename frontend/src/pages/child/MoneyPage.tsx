/**
 * Geldmodule — Virtueel spaarpotje voor Julie
 * Route: /app/geld
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'

interface Transaction {
  id: string
  amount: number
  type: string
  note?: string
  createdAt: string
}

interface Goal {
  id: string
  title: string
  targetAmount: number
  icon: string
  isReached: boolean
}

interface BalanceData {
  balance: number
  earnedToday: number
  transactions: Transaction[]
  goals: Goal[]
}

function formatCents(cents: number): string {
  const euros = cents / 100
  return `€\u00A0${euros.toFixed(2).replace('.', ',')}`
}

function CoinIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#F2C94C" stroke="#D4973B" strokeWidth="2"/>
      <text x="20" y="26" textAnchor="middle" fontSize="18" fill="#8B6914" fontWeight="bold" fontFamily="serif">€</text>
    </svg>
  )
}

export function MoneyPage() {
  const { user } = useAuthStore()
  const childId = user?.id ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['money', childId],
    queryFn: () => api.get<BalanceData>(`/api/money/${childId}/balance`),
    enabled: !!childId,
    staleTime: 30_000,
  })

  const balance = data?.balance ?? 0
  const goals = data?.goals ?? []
  const transactions = data?.transactions ?? []
  const earnedToday = data?.earnedToday ?? 0

  const nextGoal = goals.find(g => !g.isReached && g.targetAmount > balance)
  const progressToNext = nextGoal ? Math.min(100, Math.round(balance / nextGoal.targetAmount * 100)) : 100

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ y: [0, -12, 0] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-[var(--accent-sunshine)]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Mijn spaarpotje 🐷
        </h1>
      </div>

      {/* Saldo kaart */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-3xl p-6 mb-5 text-center"
        style={{ background: 'linear-gradient(135deg, #F2C94C, #E8734A)', color: 'white' }}
      >
        <p className="font-body text-white/80 text-sm mb-1">Mijn saldo</p>
        <p className="font-display font-bold text-5xl mb-2">{formatCents(balance)}</p>
        {earnedToday > 0 && (
          <p className="font-body text-white/80 text-sm">+{formatCents(earnedToday)} vandaag verdiend 🎉</p>
        )}
      </motion.div>

      {/* Volgend spaardoel */}
      {nextGoal && (
        <div className="bg-[var(--bg-card)] rounded-3xl p-5 mb-5 border-2 border-[var(--accent-sunshine)]/30">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{nextGoal.icon}</span>
            <div className="flex-1">
              <p className="font-display font-bold text-[var(--text-primary)]">{nextGoal.title}</p>
              <p className="font-body text-sm text-[var(--text-muted)]">
                Nog {formatCents(nextGoal.targetAmount - balance)} nodig
              </p>
            </div>
            <p className="font-display font-bold text-[var(--accent-warm)]">{progressToNext}%</p>
          </div>
          {/* Progress balk */}
          <div className="h-4 rounded-full bg-[var(--bg-surface)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--accent-sunshine), var(--accent-warm))' }}
            />
          </div>
        </div>
      )}

      {/* Alle spaardoelen */}
      {goals.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-3xl p-5 mb-5 border-2 border-[var(--accent-calm)]/20">
          <h2 className="font-display font-bold text-[var(--text-primary)] mb-4">Mijn doelen</h2>
          <div className="space-y-3">
            {goals.map(goal => {
              const prog = Math.min(100, Math.round(balance / goal.targetAmount * 100))
              return (
                <div key={goal.id} className={`flex items-center gap-3 ${goal.isReached ? 'opacity-60' : ''}`}>
                  <span className="text-2xl">{goal.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-body text-sm font-medium text-[var(--text-primary)]">{goal.title}</span>
                      <span className="font-body text-xs text-[var(--text-muted)]">{formatCents(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-surface)]">
                      <div className="h-full rounded-full bg-[var(--accent-sunshine)] transition-all"
                        style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                  {goal.isReached && <span className="text-lg">✅</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recente transacties */}
      {transactions.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-3xl p-5 border-2 border-[var(--accent-calm)]/20">
          <h2 className="font-display font-bold text-[var(--text-primary)] mb-4">Mijn geschiedenis</h2>
          <div className="space-y-2">
            {transactions.slice(0, 8).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-[var(--bg-surface)] last:border-0">
                <CoinIcon size={32} />
                <div className="flex-1">
                  <p className="font-body text-sm text-[var(--text-primary)]">{tx.note ?? tx.type}</p>
                  <p className="font-body text-xs text-[var(--text-muted)]">
                    {new Date(tx.createdAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <p className={`font-display font-bold ${tx.amount >= 0 ? 'text-[var(--accent-forest)]' : 'text-[var(--accent-warm)]'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatCents(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && transactions.length === 0 && (
        <div className="text-center py-12 bg-[var(--bg-card)] rounded-3xl border-2 border-[var(--accent-calm)]/20">
          <div className="text-5xl mb-3">🐷</div>
          <p className="font-display font-bold text-[var(--text-primary)]">Nog leeg!</p>
          <p className="font-body text-sm text-[var(--text-muted)] mt-1">Vraag papa of mama om geld toe te voegen.</p>
        </div>
      )}
    </div>
  )
}

export default MoneyPage
