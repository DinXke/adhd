/**
 * Profielselectie — eerste scherm.
 * Kind tikt op eigen avatar → PIN-scherm.
 * Ouder/hulpverlener klikt op "Inloggen als volwassene" → email-login.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'

interface ChildProfile {
  id: string
  name: string
  avatarUrl?: string | null
}

export default function SelectProfile() {
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [brokenAvatars, setBrokenAvatars] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    api.get<{ children: ChildProfile[] }>('/api/auth/children')
      .then((d) => setChildren(d.children))
      .catch(() => {})
  }, [])

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

      {/* Kind-avatars */}
      <div className="flex flex-wrap justify-center gap-6 mb-10 max-w-sm">
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
          >
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'var(--bg-surface)' }}
            >
              {child.avatarUrl && !brokenAvatars.has(child.id) ? (
                <img
                  src={child.avatarUrl}
                  alt={child.name}
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setBrokenAvatars((s) => new Set([...s, child.id]))}
                />
              ) : (
                <span>🧒</span>
              )}
            </div>
            <span className="font-display font-bold text-ink text-lg leading-tight">
              {child.name}
            </span>
          </motion.button>
        ))}
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
