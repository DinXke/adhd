/**
 * Sociale scripts voor kinderen — interactieve scenario's met keuzes.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useSocialScripts, usePlaySocialScript } from '../../lib/queries'
import { TtsButton } from '../../components/TtsButton'

function ScenarioPlayer({ script, onClose }: { script: any; onClose: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const play = usePlaySocialScript()

  const choices: any[] = script.choices ?? []
  const selected = chosen !== null ? choices[chosen] : null

  function handleChoice(index: number) {
    setChosen(index)
    play.mutate(script.id)
    if (navigator.vibrate) navigator.vibrate(30)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
      style={{ background: 'rgba(44,38,32,0.7)' }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl p-6 overflow-y-auto max-h-[90dvh]"
        style={{ background: 'var(--bg-card)' }}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Categorie + sluiten */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ background: 'var(--accent-primary)22', color: 'var(--accent-primary)' }}>
            {script.category.replace('_', ' ')}
          </span>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scenario */}
        <h2 className="font-display font-bold text-ink text-xl mb-3">{script.title}</h2>
        <div className="rounded-2xl p-4 mb-5 relative" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <p className="font-body text-ink leading-relaxed pr-10" style={{ fontSize: 17 }}>
            {script.scenario}
          </p>
          <TtsButton text={script.scenario} className="absolute top-3 right-3" />
        </div>

        {/* Keuzes */}
        {chosen === null ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-ink-muted font-medium mb-2">Wat doe jij?</p>
            {choices.map((choice, i) => (
              <motion.button
                key={i}
                onClick={() => handleChoice(i)}
                whileTap={{ scale: 0.97 }}
                className="w-full text-left px-4 py-3.5 rounded-2xl border-2 font-body font-medium transition-all"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  minHeight: 52,
                }}
              >
                <span className="mr-2 text-ink-muted">{['A', 'B', 'C', 'D'][i]}.</span>
                {choice.text}
              </motion.button>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              key="outcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Gekozen optie */}
              <div className="px-4 py-3 rounded-2xl border-2"
                style={{
                  borderColor: selected?.isPositive ? 'var(--accent-success)' : 'var(--accent-warning)',
                  background: selected?.isPositive ? '#5B8C5A18' : '#D4973B18',
                }}>
                <p className="text-xs font-semibold mb-1"
                  style={{ color: selected?.isPositive ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                  {selected?.isPositive ? '✨ Goed gedaan!' : '💡 Goed geprobeerd!'}
                </p>
                <p className="font-body text-ink leading-relaxed">{selected?.outcome}</p>
              </div>

              {/* Tip */}
              {selected?.tip && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--accent-secondary)18', border: '1px solid var(--accent-secondary)44' }}>
                  <span className="text-xl flex-shrink-0">💡</span>
                  <p className="font-body text-sm text-ink">{selected.tip}</p>
                </div>
              )}

              {/* Alle opties tonen */}
              <div>
                <p className="text-xs text-ink-muted font-medium mb-2">Wat hadden de andere keuzes opgeleverd?</p>
                <div className="space-y-2">
                  {choices.map((c, i) => i !== chosen && (
                    <div key={i} className="px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                      <p className="text-xs font-semibold text-ink-muted mb-0.5">{['A', 'B', 'C', 'D'][i]}. {c.text}</p>
                      <p className="text-xs text-ink-muted">{c.outcome}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opnieuw / sluiten */}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setChosen(null)}
                  className="flex-1 py-3 rounded-xl border border-border font-body font-medium text-ink-muted text-sm">
                  Opnieuw
                </button>
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-body font-medium text-sm text-white"
                  style={{ background: 'var(--accent-primary)' }}>
                  Klaar!
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  )
}

export function SocialScriptsPage() {
  const { user } = useAuthStore()
  const childId = user?.id ?? ''
  const [playing, setPlaying] = useState<any | null>(null)

  const { data, isLoading } = useSocialScripts(childId)
  const scripts = data?.scripts ?? []

  const CATEGORY_ICONS: Record<string, string> = {
    hulp_vragen: '🙋', conflict: '🤝', vrienden: '👫',
    regels: '📋', gevoelens: '💬', algemeen: '🌟',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-4 h-4 rounded-full animate-bounce"
              style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (scripts.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <div className="text-6xl mb-4">💬</div>
        <p className="font-display font-bold text-ink text-xl mb-2">Nog geen oefeningen</p>
        <p className="font-body text-ink-muted text-sm">Vraag papa of mama om sociale oefeningen toe te voegen.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-ink text-2xl">Sociale situaties</h1>
        <p className="font-body text-ink-muted text-sm mt-0.5">Oefen wat je kunt doen in moeilijke situaties</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {scripts.map((script: any) => (
          <motion.button
            key={script.id}
            onClick={() => setPlaying(script)}
            whileTap={{ scale: 0.97 }}
            className="w-full text-left bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'var(--accent-primary)18', border: '1px solid var(--accent-primary)33' }}>
              {CATEGORY_ICONS[script.category] ?? '🌟'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-ink">{script.title}</p>
              <p className="font-body text-xs text-ink-muted truncate mt-0.5">{script.scenario.slice(0, 60)}...</p>
              {script.playCount > 0 && (
                <p className="font-body text-xs text-accent mt-1">{script.playCount}× gespeeld</p>
              )}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-muted flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {playing && <ScenarioPlayer script={playing} onClose={() => setPlaying(null)} />}
      </AnimatePresence>
    </div>
  )
}

export default SocialScriptsPage
