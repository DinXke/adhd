/**
 * Sociale scripts editor voor ouders — genereren via Claude of handmatig.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMyChildren, useSocialScripts, useGenerateSocialScript, useDeleteSocialScript } from '../../lib/queries'

const CATEGORIES = [
  { key: 'hulp_vragen', label: 'Om hulp vragen', icon: '🙋' },
  { key: 'conflict', label: 'Ruzie oplossen', icon: '🤝' },
  { key: 'vrienden', label: 'Vrienden maken', icon: '👫' },
  { key: 'regels', label: 'Regels begrijpen', icon: '📋' },
  { key: 'gevoelens', label: 'Gevoelens delen', icon: '💬' },
  { key: 'algemeen', label: 'Algemeen', icon: '🌟' },
]

export function SocialScriptsEditorPage() {
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('hulp_vragen')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState(1)

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data, refetch } = useSocialScripts(childId)
  const generate = useGenerateSocialScript()
  const deleteScript = useDeleteSocialScript()

  const scripts = data?.scripts ?? []

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    await generate.mutateAsync({ childId, category: selectedCategory, difficulty, topic: topic.trim() || undefined })
    setShowForm(false)
    setTopic('')
    refetch()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sociale scripts</h1>
          <p className="text-sm text-ink-muted mt-0.5">Claude genereert interactieve situatie-oefeningen</p>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:border-accent focus:outline-none">
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:opacity-90">
            ✨ Genereren
          </button>
        </div>
      </div>

      {/* Genereer-formulier */}
      <AnimatePresence>
        {showForm && childId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-card border border-accent/30 rounded-2xl p-6">
              <h2 className="font-semibold text-ink text-lg mb-5">Nieuw script via Claude</h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Categorie */}
                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-2">Categorie</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.key} type="button" onClick={() => setSelectedCategory(c.key)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                        style={{
                          borderColor: selectedCategory === c.key ? 'var(--accent-primary)' : 'var(--border-color)',
                          background: selectedCategory === c.key ? 'var(--accent-primary)11' : 'var(--bg-card)',
                          color: selectedCategory === c.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {c.icon} {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specifiek onderwerp (optioneel) */}
                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1.5">Specifiek onderwerp (optioneel)</label>
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Bv. iemand vragen om mee te spelen, ruzie over een speeltje"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Moeilijkheid */}
                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-2">Moeilijkheid</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(d => (
                      <button key={d} type="button" onClick={() => setDifficulty(d)}
                        className="flex-1 py-2 rounded-xl border text-sm font-medium transition-all"
                        style={{
                          borderColor: difficulty === d ? 'var(--accent-primary)' : 'var(--border-color)',
                          background: difficulty === d ? 'var(--accent-primary)11' : 'var(--bg-card)',
                          color: difficulty === d ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {'⭐'.repeat(d)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-ink-muted font-medium text-sm">
                    Annuleren
                  </button>
                  <button type="submit" disabled={generate.isPending}
                    className="flex-1 py-3 rounded-xl bg-accent text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {generate.isPending ? (
                      <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Genereren...</>
                    ) : '✨ Genereer script'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scripts lijst */}
      {scripts.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-semibold text-ink">Nog geen scripts</p>
          <p className="text-ink-muted text-sm mt-1">Klik op "Genereren" om een sociaal oefenscenario te maken via Claude.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script: any) => {
            const cat = CATEGORIES.find(c => c.key === script.category)
            return (
              <div key={script.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="text-2xl flex-shrink-0">{cat?.icon ?? '🌟'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{script.title}</p>
                  <p className="text-xs text-ink-muted truncate">{script.scenario.slice(0, 70)}...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                      {cat?.label}
                    </span>
                    {'⭐'.repeat(script.difficulty)}
                    {script.isAiGenerated && <span className="text-[10px] text-ink-muted">✨ AI</span>}
                    {script.playCount > 0 && <span className="text-[10px] text-ink-muted">{script.playCount}× gespeeld</span>}
                  </div>
                </div>
                <button
                  onClick={async () => { await deleteScript.mutateAsync(script.id); refetch() }}
                  className="p-2 rounded-xl border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SocialScriptsEditorPage
