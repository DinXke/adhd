import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useUpdateAvatar } from '../../lib/queries'
import { AvatarDisplay, AVATARS, AVATAR_CATEGORIES } from '../../components/AvatarDisplay'
import { useAccessibilityStore } from '../../stores/accessibilityStore'
import { useAuthStore } from '../../stores/authStore'

interface MyProfile {
  id: string
  name: string
  avatarId?: string | null
  gender?: string | null
  dateOfBirth?: string | null
}

// ── Avatar picker voor kinderen ────────────────────────────────
function AvatarPicker({ current, onSelect }: { current: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<string>('alle')
  const filtered = filter === 'alle' ? AVATARS : AVATARS.filter((a) => a.category === filter)

  return (
    <div className="space-y-4">
      {/* Filter knoppen */}
      <div className="flex gap-2 justify-center flex-wrap">
        {AVATAR_CATEGORIES.map((f) => ({
          key: f.key,
          label: f.emoji ? `${f.emoji} ${f.label}` : f.label,
        })).map((f) => (
          <motion.button
            key={f.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full font-display font-medium text-xs transition-all ${
              filter === f.key
                ? 'bg-[var(--accent-warm)] text-white shadow-lg'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--accent-calm)]/30'
            }`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Avatar grid — scrollable */}
      <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto rounded-xl p-1">
        {filtered.map((av) => (
          <motion.button
            key={av.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(av.id)}
            className={`relative p-1.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
              current === av.id
                ? 'border-[var(--accent-warm)] bg-[var(--accent-warm)]/10'
                : 'border-transparent bg-[var(--bg-surface)] hover:border-[var(--accent-calm)]'
            }`}
          >
            <AvatarDisplay avatarId={av.id} size={48} />
            {current === av.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--accent-warm)] flex items-center justify-center"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Toegankelijkheid toggle ────────────────────────────────────
function AccessibilityPanel() {
  const { dyslexicFont, largeText, highContrast, setDyslexicFont, setLargeText, setHighContrast } = useAccessibilityStore()

  const toggles = [
    {
      label: 'Dyslexie-lettertype',
      sub: 'Makkelijker leesbaar lettertype',
      value: dyslexicFont,
      set: setDyslexicFont,
      icon: '📖',
    },
    {
      label: 'Grote letters',
      sub: 'Tekst iets groter maken',
      value: largeText,
      set: setLargeText,
      icon: '🔡',
    },
    {
      label: 'Hoog contrast',
      sub: 'Sterkere kleuren en randen',
      value: highContrast,
      set: setHighContrast,
      icon: '🌗',
    },
  ]

  return (
    <div className="bg-[var(--bg-card)] rounded-3xl p-5 border-2 border-[var(--accent-calm)]/20 mb-6">
      <h2 className="font-display font-bold text-lg text-[var(--text-primary)] mb-4 text-center">
        Leesinstellingen
      </h2>
      <div className="space-y-3">
        {toggles.map(t => (
          <div key={t.label} className="flex items-center gap-3">
            <span className="text-2xl">{t.icon}</span>
            <div className="flex-1">
              <p className="font-display font-bold text-[var(--text-primary)] text-sm">{t.label}</p>
              <p className="font-body text-xs text-[var(--text-muted)]">{t.sub}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => t.set(!t.value)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${t.value ? 'bg-[var(--accent-warm)]' : 'bg-[var(--bg-surface)]'}`}
              style={{ border: '2px solid var(--accent-calm)' }}
            >
              <motion.div
                animate={{ x: t.value ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                style={{ left: 0 }}
              />
            </motion.button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Snelkoppelingen naar andere features ──────────────────────
function QuickLinks() {
  const navigate = useNavigate()
  const links = [
    { to: '/app/vaardigheden', label: 'Mijn vaardigheden', icon: '💪', sub: 'Afvinken wat je kunt!' },
    { to: '/app/social', label: 'Sociale situaties', icon: '💬', sub: 'Oefenen met keuzes' },
    { to: '/app/geld', label: 'Mijn spaarpotje', icon: '🐷', sub: 'Geld sparen voor een doel' },
    { to: '/app/lijstjes', label: 'Mijn lijstjes', icon: '📋', sub: 'Maak je eigen lijstjes' },
  ]
  return (
    <div className="space-y-3 mb-6">
      {links.map(link => (
        <motion.button
          key={link.to}
          onClick={() => navigate(link.to)}
          whileTap={{ scale: 0.97 }}
          className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 bg-[var(--bg-card)]"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span className="text-3xl">{link.icon}</span>
          <div>
            <p className="font-display font-bold text-[var(--text-primary)]">{link.label}</p>
            <p className="font-body text-sm text-[var(--text-muted)]">{link.sub}</p>
          </div>
          <svg className="ml-auto text-[var(--text-muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </motion.button>
      ))}
    </div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────
export function ChildSettingsPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<MyProfile>('/api/users/me'),
  })

  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const updateAvatar = useUpdateAvatar()
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const currentAvatar = selectedAvatar ?? profile?.avatarId ?? 'neutraal-1'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleSave() {
    if (!selectedAvatar) return
    const gender = AVATARS.find((a) => a.id === selectedAvatar)?.gender
    await updateAvatar.mutateAsync({ avatarId: selectedAvatar, gender })
    setSaved(true)
    setSelectedAvatar(null)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-[var(--accent-warm)]"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Mijn instellingen
        </h1>
        <p className="text-[var(--text-muted)] mt-1">Kies jouw avatar!</p>
      </div>

      {/* Huidige avatar groot */}
      <div className="flex justify-center mb-8">
        <motion.div
          key={currentAvatar}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 rounded-full bg-[var(--bg-surface)] border-4 border-[var(--accent-warm)]/40 flex items-center justify-center overflow-hidden shadow-lg"
        >
          <AvatarDisplay avatarId={currentAvatar} name={profile?.name} size={112} />
        </motion.div>
      </div>

      {profile?.name && (
        <p className="text-center font-display text-xl font-bold text-[var(--text-primary)] mb-6">
          Hallo, {profile.name}! 👋
        </p>
      )}

      {/* Snelkoppelingen */}
      <QuickLinks />

      {/* Leesinstellingen */}
      <AccessibilityPanel />

      {/* Avatar picker */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-5 border-2 border-[var(--accent-calm)]/20 mb-6">
        <h2 className="font-display font-bold text-lg text-[var(--text-primary)] mb-4 text-center">
          Kies jouw avatar
        </h2>
        <AvatarPicker
          current={currentAvatar}
          onSelect={(id) => setSelectedAvatar(id)}
        />
      </div>

      {/* Opslaan knop */}
      <AnimatePresence>
        {selectedAvatar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button
              onClick={handleSave}
              disabled={updateAvatar.isPending}
              className="w-full py-4 rounded-2xl bg-[var(--accent-warm)] text-white font-display font-bold text-xl shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {updateAvatar.isPending ? 'Opslaan...' : '⭐ Avatar opslaan!'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Succes bericht */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center mt-6 p-4 rounded-2xl bg-[var(--accent-forest)]/10 border border-[var(--accent-forest)]/30"
          >
            <p className="font-display font-bold text-[var(--accent-forest)] text-lg">
              🎉 Super! Jouw avatar is opgeslagen!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uitloggen */}
      <div className="mt-6 mb-8">
        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full py-3 rounded-2xl font-display font-bold text-base"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '2px solid var(--border-color)' }}
          >
            Uitloggen
          </button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl text-center"
              style={{ background: 'var(--bg-card)', border: '2px solid var(--accent-warm)' }}
            >
              <p className="font-display font-bold text-[var(--text-primary)] mb-3">
                Wil je echt uitloggen?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLogout(false)}
                  className="flex-1 py-2.5 rounded-xl font-display font-bold"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  Nee
                </button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-xl font-display font-bold text-white"
                  style={{ background: 'var(--accent-warm)' }}>
                  Ja, uitloggen
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
