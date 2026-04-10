/**
 * Beloningsbeheer voor ouders
 * Beloningen aanmaken/bewerken/verwijderen, tokens handmatig toekennen, transacties inzien
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import {
  useMyChildren,
  useTokenBalance,
  useRewards,
  useCreateReward,
  useUpdateReward,
  useDeleteReward,
  useGrantTokens,
  type Reward,
} from '../../lib/queries'
import { IconPlus } from '../../components/icons/NavIcons'

// ── Formulier: Beloning aanmaken / bewerken ─────────────────────
function RewardForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Partial<Reward>
  onSave: (data: { title: string; description?: string; costTokens: number; requiresApproval: boolean; category?: string }) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [cost, setCost] = useState(initial?.costTokens ?? 10)
  const [requiresApproval, setRequiresApproval] = useState(initial?.requiresApproval ?? true)
  const [category, setCategory] = useState(initial?.category ?? '')

  // Spaarpot-beloning: extract money amount from description if present
  const initialIsSpaarpot = initial?.category === 'spaarpot' && (initial?.description ?? '').startsWith('MONEY:')
  const initialMoneyAmount = initialIsSpaarpot ? parseInt((initial?.description ?? '').replace('MONEY:', ''), 10) || 0 : 0
  const [isSpaarpot, setIsSpaarpot] = useState(initialIsSpaarpot)
  const [moneyAmountCents, setMoneyAmountCents] = useState(initialMoneyAmount)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || cost < 1) return
    const finalCategory = isSpaarpot ? 'spaarpot' : (category.trim() || undefined)
    const finalDescription = isSpaarpot
      ? `MONEY:${moneyAmountCents}`
      : (description.trim() || undefined)
    onSave({ title: title.trim(), description: finalDescription, costTokens: cost, requiresApproval, category: finalCategory })
  }

  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 15,
    color: 'var(--text-primary)',
    width: '100%',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="font-body text-sm font-medium text-ink mb-1 block">Naam beloning *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Bijv. 15 min extra schermtijd"
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
        />
      </div>

      <div>
        <label className="font-body text-sm font-medium text-ink mb-1 block">
          Kosten (tokens) *
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCost(Math.max(1, cost - 5))}
            className="w-10 h-10 rounded-full font-display font-bold text-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            −
          </button>
          <div
            className="flex-1 text-center font-display font-bold text-2xl"
            style={{ color: 'var(--accent-token)' }}
          >
            ⭐ {cost}
          </div>
          <button
            type="button"
            onClick={() => setCost(cost + 5)}
            className="w-10 h-10 rounded-full font-display font-bold text-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            +
          </button>
        </div>
      </div>

      {!isSpaarpot && (
        <div>
          <label className="font-body text-sm font-medium text-ink mb-1 block">Categorie</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="bijv. schermtijd, activiteit, cadeau"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
          />
        </div>
      )}

      {/* Spaarpot-beloning toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsSpaarpot(!isSpaarpot)}
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: isSpaarpot ? 'var(--accent-primary)' : 'var(--bg-primary)',
            border: `2px solid ${isSpaarpot ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          }}
        >
          {isSpaarpot && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
        </button>
        <span className="font-body text-sm text-ink">
          Spaarpot-beloning (geld toevoegen bij inwisselen)
        </span>
      </div>

      {isSpaarpot && (
        <div>
          <label className="font-body text-sm font-medium text-ink mb-1 block">
            Bedrag (EUR)
          </label>
          <div className="flex items-center gap-2">
            <span className="font-body text-ink font-medium" style={{ fontSize: 15 }}>€</span>
            <input
              type="number"
              min={1}
              step={1}
              value={moneyAmountCents}
              onChange={(e) => setMoneyAmountCents(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="150"
              style={{ ...inputStyle, width: 120 }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
            />
            <span className="font-body text-ink-muted text-sm">
              cent = €{(moneyAmountCents / 100).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {!isSpaarpot && (
        <div>
          <label className="font-body text-sm font-medium text-ink mb-1 block">Omschrijving</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionele toelichting"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRequiresApproval(!requiresApproval)}
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: requiresApproval ? 'var(--accent-success)' : 'var(--bg-primary)',
            border: `2px solid ${requiresApproval ? 'var(--accent-success)' : 'var(--border-color)'}`,
          }}
        >
          {requiresApproval && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
        </button>
        <span className="font-body text-sm text-ink">
          Ouder moet inwisselen bevestigen
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 font-body py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          Annuleer
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'var(--accent-primary)',
            borderRadius: 12,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  )
}

// ── Manuele tokens geven ───────────────────────────────────────
function GrantTokensPanel({ childId, onDone }: { childId: string; onDone: () => void }) {
  const [amount, setAmount] = useState(5)
  const [note, setNote] = useState('')
  const grantMutation = useGrantTokens()

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    await grantMutation.mutateAsync({ childId, amount, note: note.trim() || undefined })
    setNote('')
    onDone()
  }

  return (
    <form onSubmit={handleGrant} className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setAmount(Math.max(1, amount - 1))}
          className="w-10 h-10 rounded-full font-display font-bold text-xl flex items-center justify-center"
          style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
        >
          −
        </button>
        <span className="font-display font-bold text-3xl" style={{ color: 'var(--accent-token)', minWidth: 80, textAlign: 'center' }}>
          ⭐ {amount}
        </span>
        <button
          type="button"
          onClick={() => setAmount(Math.min(100, amount + 1))}
          className="w-10 h-10 rounded-full font-display font-bold text-xl flex items-center justify-center"
          style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
        >
          +
        </button>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reden (optioneel) — bijv. goed geholpen"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 15,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          outline: 'none',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
      />
      <button
        type="submit"
        disabled={grantMutation.isPending}
        className="btn-primary w-full font-body"
        style={{
          background: 'var(--accent-token)',
          color: '#3D3229',
          borderRadius: 'var(--radius-card)',
          padding: '12px',
          fontWeight: 700,
          opacity: grantMutation.isPending ? 0.7 : 1,
        }}
      >
        {grantMutation.isPending ? 'Even geduld...' : '⭐ Tokens geven'}
      </button>
    </form>
  )
}

export default function RewardsPage() {
  const { user } = useAuthStore()
  const { data: childrenData } = useMyChildren()
  const children = childrenData?.children ?? []

  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const childId = selectedChildId || children[0]?.id || ''

  const { data: tokenData } = useTokenBalance(childId || undefined)
  const { data: rewardsData } = useRewards(childId || undefined)
  const createReward = useCreateReward()
  const updateReward = useUpdateReward()
  const deleteReward = useDeleteReward()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showGrant, setShowGrant] = useState(false)
  const [grantDone, setGrantDone] = useState(false)
  const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards')

  const balance = tokenData?.balance ?? 0
  const streak = tokenData?.streak ?? 0
  const todayEarned = tokenData?.todayEarned ?? 0
  const rewards = (rewardsData?.rewards ?? []).sort((a, b) => a.costTokens - b.costTokens)
  const transactions = tokenData?.transactions ?? []

  const handleCreate = async (data: {
    title: string
    description?: string
    costTokens: number
    requiresApproval: boolean
    category?: string
  }) => {
    if (!childId) return
    await createReward.mutateAsync({ childId, ...data })
    setShowCreateForm(false)
  }

  const handleUpdate = async (data: {
    title: string
    description?: string
    costTokens: number
    requiresApproval: boolean
    category?: string
  }) => {
    if (!editingReward) return
    await updateReward.mutateAsync({ id: editingReward.id, ...data })
    setEditingReward(null)
  }

  const handleDelete = async (rewardId: string) => {
    setDeletingId(rewardId)
    try {
      await deleteReward.mutateAsync(rewardId)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleAvailable = async (reward: Reward) => {
    await updateReward.mutateAsync({ id: reward.id, isAvailable: !reward.isAvailable })
  }

  if (!childId && children.length === 0) {
    return (
      <div className="p-6">
        <h1 className="font-display font-bold text-ink text-2xl mb-4">Beloningen</h1>
        <div className="card p-6 text-center">
          <p className="font-body text-ink-muted">
            Maak eerst een kind-profiel aan om beloningen te beheren.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">Beloningen</h1>
          <p className="font-body text-ink-muted text-sm mt-0.5">
            Beheer beloningen en token-toekenningen
          </p>
        </div>
        <button
          onClick={() => { setShowGrant(true); setGrantDone(false) }}
          className="flex items-center gap-2 font-body font-medium text-sm px-4 py-2.5"
          style={{
            background: 'var(--accent-token)',
            color: '#3D3229',
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          ⭐ Tokens geven
        </button>
      </div>

      {/* Kind-selector (alleen tonen als meerdere kinderen) */}
      {children.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className="font-body text-sm px-4 py-2 rounded-full"
              style={{
                background: childId === child.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: childId === child.id ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${childId === child.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              }}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {/* Saldo-overzicht */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Huidig saldo', value: `⭐ ${balance}` },
          { label: 'Vandaag verdiend', value: `+${todayEarned} ⭐` },
          { label: 'Streak', value: `🔥 ${streak} d` },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-3 text-center"
          >
            <p className="font-body text-ink-muted text-xs mb-1">{stat.label}</p>
            <p className="font-display font-bold text-ink text-lg">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Manuele token-toekenning */}
      <AnimatePresence>
        {showGrant && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card p-5 mb-6"
          >
            <h2 className="font-display font-semibold text-ink text-base mb-4">
              Tokens handmatig toekennen
            </h2>
            {grantDone ? (
              <div className="text-center py-2">
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-body text-ink">Tokens toegekend!</p>
                <button
                  onClick={() => setShowGrant(false)}
                  className="mt-3 font-body text-sm"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Sluiten
                </button>
              </div>
            ) : (
              <GrantTokensPanel
                childId={childId}
                onDone={() => setGrantDone(true)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs: Beloningen / Geschiedenis */}
      <div className="flex gap-0 mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        {(['rewards', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 font-body font-medium text-sm transition-colors"
            style={{
              background: activeTab === tab ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: activeTab === tab ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab === 'rewards' ? 'Beloningen' : 'Geschiedenis'}
          </button>
        ))}
      </div>

      {/* Tab: Beloningen */}
      {activeTab === 'rewards' && (
        <div>
          {/* Nieuwe beloning aanmaken */}
          <AnimatePresence>
            {showCreateForm && !editingReward && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="card p-5 mb-4"
              >
                <h3 className="font-display font-semibold text-ink text-base mb-4">
                  Nieuwe beloning
                </h3>
                <RewardForm
                  onSave={handleCreate as any}
                  onCancel={() => setShowCreateForm(false)}
                  isSaving={createReward.isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Knop om toe te voegen */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 font-body font-medium text-sm py-3 mb-4"
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
            >
              <IconPlus size={18} />
              Nieuwe beloning toevoegen
            </button>
          )}

          {/* Beloningenlijst */}
          {rewards.length === 0 && !showCreateForm && (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">🎁</p>
              <p className="font-body text-ink-muted">Nog geen beloningen. Voeg er een toe!</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {rewards.map((reward) => (
              <div key={reward.id}>
                <AnimatePresence>
                  {editingReward?.id === reward.id ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="card p-5"
                    >
                      <h3 className="font-display font-semibold text-ink text-base mb-4">
                        Beloning bewerken
                      </h3>
                      <RewardForm
                        initial={reward}
                        onSave={handleUpdate}
                        onCancel={() => setEditingReward(null)}
                        isSaving={updateReward.isPending}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      layout
                      className="card p-4"
                      style={{ opacity: reward.isAvailable ? 1 : 0.55 }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Token-kosten badge */}
                        <div
                          className="flex-shrink-0 rounded-xl flex items-center justify-center"
                          style={{
                            width: 52,
                            height: 52,
                            background: 'linear-gradient(135deg, var(--accent-token), #e6a820)',
                            color: '#3D3229',
                          }}
                        >
                          <span className="font-display font-bold text-sm">⭐{reward.costTokens}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display font-semibold text-ink text-base leading-tight">
                              {reward.title}
                            </p>
                            {!reward.isAvailable && (
                              <span
                                className="font-body text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--bg-surface, #F5E6D3)', color: 'var(--text-secondary)' }}
                              >
                                Verborgen
                              </span>
                            )}
                            {reward.category && (
                              <span
                                className="font-body text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--bg-surface, #F5E6D3)', color: 'var(--text-secondary)' }}
                              >
                                {reward.category}
                              </span>
                            )}
                          </div>
                          {reward.description && (
                            <p className="font-body text-ink-muted text-sm mt-0.5">{reward.description}</p>
                          )}
                          <p className="font-body text-ink-muted text-xs mt-1">
                            {reward.requiresApproval ? 'Bevestiging vereist' : 'Automatisch toegekend'}
                          </p>
                        </div>
                      </div>

                      {/* Acties */}
                      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <button
                          onClick={() => handleToggleAvailable(reward)}
                          className="font-body text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {reward.isAvailable ? 'Verbergen' : 'Tonen'}
                        </button>
                        <button
                          onClick={() => setEditingReward(reward)}
                          className="font-body text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => handleDelete(reward.id)}
                          disabled={deletingId === reward.id}
                          className="font-body text-xs px-3 py-1.5 rounded-lg ml-auto"
                          style={{
                            background: 'rgba(196,93,76,0.08)',
                            border: '1px solid rgba(196,93,76,0.2)',
                            color: 'var(--accent-danger, #C45D4C)',
                            opacity: deletingId === reward.id ? 0.6 : 1,
                          }}
                        >
                          {deletingId === reward.id ? '...' : 'Verwijder'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Geschiedenis */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-2">
          {transactions.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-body text-ink-muted">Nog geen transacties.</p>
            </div>
          ) : (
            transactions.map((t, i) => {
              const isRedeem = t.type === 'redeemed'
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="card p-3 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                    style={{
                      background: isRedeem
                        ? 'rgba(196,93,76,0.1)'
                        : 'rgba(242,201,76,0.15)',
                      color: isRedeem ? 'var(--accent-danger, #C45D4C)' : '#8a6d00',
                    }}
                  >
                    {isRedeem ? '−' : '+'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-ink text-sm leading-tight">
                      {t.note ?? (isRedeem && t.reward ? `Inwisselen: ${t.reward.title}` : labelForSource(t.sourceType))}
                    </p>
                    <p className="font-body text-ink-muted text-xs">
                      {new Date(t.createdAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className="font-display font-bold text-base flex-shrink-0"
                    style={{ color: isRedeem ? 'var(--accent-danger, #C45D4C)' : 'var(--accent-token)' }}
                  >
                    {isRedeem ? `−${t.amount}` : `+${t.amount}`} ⭐
                  </span>
                </motion.div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function labelForSource(sourceType: string): string {
  const labels: Record<string, string> = {
    manual: 'Manueel toegekend',
    task: 'Taak afgerond',
    task_step: 'Stap afgerond',
    exercise: 'Oefening goed',
    exercise_session: 'Oefensessie klaar',
    emotion_checkin: 'Emotie check-in',
    morning_routine: 'Ochtendroutine',
    bedtime_routine: 'Bedtijdroutine',
    streak: 'Streakbonus',
    activity: 'Activiteit afgerond',
  }
  return labels[sourceType] ?? sourceType
}
