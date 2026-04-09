/**
 * Email/wachtwoord login voor ouders en hulpverleners.
 * Warm professioneel design — DM Sans, amber accenten.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { IconBack } from '../../components/icons/NavIcons'

export default function AdultLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { loginWithEmail } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await loginWithEmail(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Inloggen mislukt. Probeer opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-surface"
      data-theme="adult"
    >
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => navigate('/login')}
          className="text-ink-muted p-2 rounded-lg"
          style={{ minHeight: 40 }}
          aria-label="Terug"
        >
          <IconBack size={20} />
        </button>
        <h1 className="font-display font-semibold text-ink text-lg">GRIP</h1>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[360px]"
        >
          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-ink mb-1">
              Welkom terug
            </h2>
            <p className="text-ink-muted font-body text-sm">
              Log in met je e-mailadres en wachtwoord
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm font-medium text-ink" htmlFor="email">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg font-body text-sm text-ink"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
                placeholder="bjorn@scheepers.one"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm font-medium text-ink" htmlFor="password">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg font-body text-sm text-ink"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)' }}
                placeholder="••••••••"
              />
            </div>

            {/* Foutmelding */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-body px-3 py-2 rounded-lg"
                style={{
                  color: 'var(--accent-danger)',
                  background: 'rgba(196, 93, 76, 0.08)',
                }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2 font-body"
              style={{
                background: 'var(--accent-primary)',
                borderRadius: 'var(--btn-radius)',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <span className="flex gap-2 items-center">
                  <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : 'Inloggen'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
