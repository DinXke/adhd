/**
 * Profielselectie — eerste scherm.
 * Kind tikt op eigen avatar → PIN-scherm.
 * Ouder/hulpverlener klikt op "Inloggen als volwassene" → email-login.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'

interface ChildProfile {
  id: string
  name: string
  avatarUrl?: string | null
}

type LoadState = 'loading' | 'error' | 'empty' | 'ready'

export default function SelectProfile() {
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [brokenAvatars, setBrokenAvatars] = useState<Set<string>>(new Set())
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const navigate = useNavigate()

  const fetchChildren = useCallback(() => {
    setLoadState('loading')
    api.get<{ children: ChildProfile[] }>('/api/auth/children')
      .then((d) => {
        setChildren(d.children)
        setLoadState(d.children.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setLoadState('error'))
  }, [])

  useEffect(() => { fetchChildren() }, [fetchChildren])

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-surface"
      data-theme="child"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <h1 className="font-display text-4xl font-bold text-ink mb-2">
          Hallo! 👋
        </h1>
        <p className="text-ink-muted font-body text-lg">
          Wie ben jij?
        </p>
      </motion.div>

      {/* Content area */}
      <div className="flex flex-wrap justify-center gap-6 mb-10 max-w-sm min-h-[160px]">
        <AnimatePresence mode="wait">
          {loadState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap justify-center gap-6"
              aria-label="Profielen laden…"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-3 p-4 rounded-[24px] border-2 min-w-[120px] animate-pulse"
                  style={{ borderColor: 'var(--border-color)', minHeight: '140px', background: 'var(--bg-card)' }}
                >
                  <div
                    className="w-16 h-16 rounded-full"
                    style={{ background: 'var(--bg-surface)' }}
                  />
                  <div
                    className="h-4 w-16 rounded-full"
                    style={{ background: 'var(--bg-surface)' }}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {loadState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
              role="alert"
              aria-live="assertive"
            >
              <span className="text-5xl">😕</span>
              <p
                className="font-body text-base px-4 py-3 rounded-2xl"
                style={{
                  color: 'var(--accent-danger)',
                  background: 'rgba(196, 93, 76, 0.08)',
                }}
              >
                Kon de profielen niet laden. Probeer opnieuw.
              </p>
              <button
                onClick={fetchChildren}
                className="btn-primary font-body text-sm px-6"
              >
                Opnieuw proberen
              </button>
            </motion.div>
          )}

          {loadState === 'empty' && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="text-5xl">🧒</span>
              <p className="font-body text-ink-muted text-base max-w-[220px]">
                Er zijn nog geen kindprofielen. Vraag een ouder om je aan te melden.
              </p>
            </motion.div>
          )}

          {loadState === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap justify-center gap-6"
            >
              {children.map((child, i) => (
                <motion.button
                  key={child.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => navigate(`/login/pin/${child.id}`)}
                  className="flex flex-col items-center gap-3 bg-card p-4 rounded-[24px] border-2 min-w-[120px]"
                  style={{ borderColor: 'var(--border-color)', minHeight: '140px' }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.04 }}
                  aria-label={`Inloggen als ${child.name}`}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    {child.avatarUrl && !brokenAvatars.has(child.id) ? (
                      <img
                        src={child.avatarUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                        onError={() => setBrokenAvatars((s) => new Set([...s, child.id]))}
                      />
                    ) : (
                      <span aria-hidden>🧒</span>
                    )}
                  </div>
                  <span className="font-display font-bold text-ink text-lg leading-tight">
                    {child.name}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scheidingslijn */}
      <div className="flex items-center gap-4 w-full max-w-xs mb-6">
        <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
        <span className="text-ink-muted text-sm font-body">of</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
      </div>

      {/* Ouder / hulpverlener login */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate('/login/adult')}
        className="btn-secondary font-body text-base px-8"
      >
        Inloggen als ouder of hulpverlener
      </motion.button>
    </div>
  )
}
