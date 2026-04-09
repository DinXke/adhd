/**
 * PIN-invoerscherm voor kinderen.
 * 4 cirkels die zich vullen bij invoer.
 * Geen zichtbare tekst, geen klavier-hint dat het cijfers zijn.
 * Bij fout: zachte schudanimatie, GEEN rood scherm.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { IconBack } from '../../components/icons/NavIcons'

interface ChildProfile {
  id: string
  name: string
  avatarUrl?: string | null
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←']

export default function PinLogin() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<ChildProfile | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const { loginWithPin } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    api.get<{ children: ChildProfile[] }>('/api/auth/children')
      .then((d) => {
        const found = d.children.find((c) => c.id === childId)
        setChild(found ?? null)
      })
      .catch(() => {})
  }, [childId])

  const handleDigit = useCallback(async (digit: string) => {
    if (digit === '←') {
      setPin((p) => p.slice(0, -1))
      setError('')
      return
    }
    if (pin.length >= 4) return

    const newPin = pin + digit
    setPin(newPin)
    setError('')

    if (newPin.length === 4) {
      try {
        await loginWithPin(childId!, newPin)
        navigate('/app/day', { replace: true })
      } catch (err: any) {
        setPin('')
        setError(err.message ?? 'Onjuiste PIN, probeer opnieuw')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        if (navigator.vibrate) navigator.vibrate([80, 40, 80])
      }
    }
  }, [pin, childId, loginWithPin, navigate])

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-surface"
      data-theme="child"
    >
      {/* Terug-knop */}
      <button
        onClick={() => navigate('/login')}
        className="absolute top-5 left-5 text-ink-muted p-2"
        aria-label="Terug"
      >
        <IconBack size={24} />
      </button>

      {/* Avatar + naam */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 mb-10"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ background: 'var(--bg-surface)' }}
        >
          {child?.avatarUrl ? (
            <img src={child.avatarUrl} alt={child.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>🧒</span>
          )}
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Hallo {child?.name ?? ''}!
        </h1>
        <p className="text-ink-muted font-body">Voer jouw geheime code in</p>
      </motion.div>

      {/* PIN-dots */}
      <motion.div
        className="flex gap-4 mb-8"
        animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-5 h-5 rounded-full border-2"
            style={{ borderColor: 'var(--accent-primary)' }}
            animate={{
              backgroundColor: i < pin.length ? 'var(--accent-primary)' : 'transparent',
              scale: i === pin.length - 1 ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.15 }}
          />
        ))}
      </motion.div>

      {/* Foutmelding — hint-blauw, niet rood */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-body text-sm mb-4 px-4 py-2 rounded-pill"
            style={{ color: 'var(--hint-color)', background: 'rgba(168, 197, 214, 0.15)' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {DIGITS.map((digit, i) => (
          digit === '' ? (
            <div key={i} />
          ) : (
            <motion.button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="aspect-square rounded-[20px] font-display text-2xl font-bold text-ink flex items-center justify-center"
              style={{
                background: 'var(--bg-card)',
                border: 'var(--card-border)',
                minHeight: 72,
              }}
              whileTap={{ scale: 0.92 }}
              whileHover={{ backgroundColor: 'var(--bg-surface)' }}
            >
              {digit === '←' ? (
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" strokeWidth={3} strokeLinecap="round">
                  <path d="M20 8L10 16L20 24M10 16H26" stroke="currentColor" />
                </svg>
              ) : digit}
            </motion.button>
          )
        ))}
      </div>
    </div>
  )
}
