/**
 * Geldmodule beheer — ouder beheert saldo en spaardoelen
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMyChildren } from '../../lib/queries'
import { api } from '../../lib/api'

function formatCents(cents: number) {
  return `€\u00A0${(cents / 100).toFixed(2).replace('.', ',')}`
}

const GOAL_ICONS = ['🎯', '🎮', '🚲', '🧸', '📚', '🍦', '🎠', '🎪', '⚽', '🎨', '🐾', '🌟']

export function MoneyEditorPage() {
  const qc = useQueryClient()
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositNote, setDepositNote] = useState('')
  const [spendAmount, setSpendAmount] = useState('')
  const [spendNote, setSpendNote] = useState('')
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [goalIcon, setGoalIcon] = useState('🎯')

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data } = useQuery({
    queryKey: ['money', childId],
    queryFn: () => api.get<any>(`/api/money/${childId}/balance`),
    enabled: !!childId,
  })

  const balance = data?.balance ?? 0
  const goals = data?.goals ?? []
  const transactions = data?.transactions ?? []

  const refetch = () => qc.invalidateQueries({ queryKey: ['money', childId] })

  const deposit = useMutation({
    mutationFn: () => api.post(`/api/money/${childId}/deposit`, {
      amount: Math.round(parseFloat(depositAmount.replace(',', '.')) * 100),
      note: depositNote || 'Zakgeld',
      type: 'allowance',
    }),
    onSuccess: () => { setDepositAmount(''); setDepositNote(''); refetch() },
  })

  const spend = useMutation({
    mutationFn: () => api.post(`/api/money/${childId}/spend`, {
      amount: Math.round(parseFloat(spendAmount.replace(',', '.')) * 100),
      note: spendNote || 'Uitgave',
    }),
    onSuccess: () => { setSpendAmount(''); setSpendNote(''); refetch() },
  })

  const addGoal = useMutation({
    mutationFn: () => api.post(`/api/money/${childId}/goals`, {
      title: goalTitle,
      targetAmount: Math.round(parseFloat(goalAmount.replace(',', '.')) * 100),
      icon: goalIcon,
    }),
    onSuccess: () => { setShowGoalForm(false); setGoalTitle(''); setGoalAmount(''); setGoalIcon('🎯'); refetch() },
  })

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) => api.delete(`/api/money/${childId}/goals/${goalId}`),
    onSuccess: refetch,
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Spaarpotje beheer</h1>
          <p className="text-sm text-ink-muted mt-0.5">Saldo, stortingen en spaardoelen</p>
        </div>
        {children.length > 1 && (
          <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm">
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Saldo */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-muted">Huidig saldo</p>
            <p className="font-display text-3xl font-bold text-ink mt-1">{formatCents(balance)}</p>
          </div>
          <span className="text-5xl">🐷</span>
        </div>
      </div>

      {/* Storting */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-ink mb-4">Geld toevoegen</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Bedrag (€)</label>
            <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
              placeholder="5,00" inputMode="decimal"
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Reden</label>
            <input value={depositNote} onChange={e => setDepositNote(e.target.value)}
              placeholder="Zakgeld"
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
          </div>
        </div>
        <button onClick={() => deposit.mutate()} disabled={!depositAmount || deposit.isPending}
          className="w-full py-2.5 rounded-xl bg-accent-success text-white text-sm font-medium disabled:opacity-50">
          {deposit.isPending ? 'Toevoegen...' : '+ Geld toevoegen'}
        </button>
      </div>

      {/* Uitgave */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-ink mb-4">Geld afschrijven</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Bedrag (€)</label>
            <input value={spendAmount} onChange={e => setSpendAmount(e.target.value)}
              placeholder="2,50" inputMode="decimal"
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Reden</label>
            <input value={spendNote} onChange={e => setSpendNote(e.target.value)}
              placeholder="Snoep"
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none" />
          </div>
        </div>
        <button onClick={() => spend.mutate()} disabled={!spendAmount || spend.isPending || balance <= 0}
          className="w-full py-2.5 rounded-xl border border-border text-ink-muted text-sm font-medium disabled:opacity-50 hover:border-red-400 hover:text-red-500 transition-colors">
          {spend.isPending ? 'Afschrijven...' : '− Geld afschrijven'}
        </button>
      </div>

      {/* Spaardoelen */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">Spaardoelen</h2>
          <button onClick={() => setShowGoalForm(!showGoalForm)}
            className="px-3 py-1.5 rounded-xl bg-accent text-white text-sm font-medium">
            + Doel
          </button>
        </div>

        <AnimatePresence>
          {showGoalForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                {/* Icon picker */}
                <div className="flex gap-2 flex-wrap">
                  {GOAL_ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setGoalIcon(ic)}
                      className={`text-xl w-10 h-10 rounded-xl transition-all ${goalIcon === ic ? 'bg-accent/20 border-2 border-accent' : 'bg-card border border-border'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
                <input value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
                  placeholder="Naam van het doel (bv. Nieuwe fiets)"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none" />
                <div className="flex gap-3">
                  <input value={goalAmount} onChange={e => setGoalAmount(e.target.value)}
                    placeholder="Doelbedrag (€)" inputMode="decimal"
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none" />
                  <button onClick={() => addGoal.mutate()} disabled={!goalTitle || !goalAmount || addGoal.isPending}
                    className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50">
                    Opslaan
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {goals.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-4">Nog geen spaardoelen. Voeg er een toe!</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g: any) => {
              const prog = Math.min(100, Math.round(balance / g.targetAmount * 100))
              return (
                <div key={g.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border ${g.isReached ? 'opacity-60 bg-accent-success/5' : 'bg-card'}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="font-medium text-ink text-sm">{g.title}</span>
                      <span className="text-xs text-ink-muted">{formatCents(g.targetAmount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface mt-1.5">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                  {g.isReached ? (
                    <span className="text-lg">✅</span>
                  ) : (
                    <button onClick={() => deleteGoal.mutate(g.id)}
                      className="p-1.5 rounded-lg border border-border text-ink-muted hover:text-red-500 hover:border-red-300 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transacties */}
      {transactions.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-ink mb-4">Recente transacties</h2>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-surface last:border-0">
                <span className="text-lg">{tx.amount >= 0 ? '💰' : '💸'}</span>
                <div className="flex-1">
                  <p className="text-sm text-ink">{tx.note ?? tx.type}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(tx.createdAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span className={`font-medium text-sm ${tx.amount >= 0 ? 'text-accent-success' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatCents(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MoneyEditorPage
