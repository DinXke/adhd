import { NavLink, Outlet } from 'react-router-dom'
import { IconHome, IconExercise, IconTokens, IconEmotion, IconList } from '../icons/NavIcons'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { PauzeOverlay } from '../PauzeOverlay'

// Instellingen-icoon (tandwieltje)
function IconSettings({ size = 28, strokeWidth = 2.5, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="4" stroke="currentColor" />
      <path d="M16 4v3M16 25v3M4 16H7M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M7.5 24.5l2.1-2.1M22.4 9.6l2.1-2.1" stroke="currentColor" />
    </svg>
  )
}

const tabs = [
  { to: '/app/day', label: 'Mijn Dag', Icon: IconHome },
  { to: '/app/exercises', label: 'Oefenen', Icon: IconExercise },
  { to: '/app/tokens', label: 'Tokens', Icon: IconTokens },
  { to: '/app/lijstjes', label: 'Lijstjes', Icon: IconList },
  { to: '/app/feelings', label: 'Hoe gaat het?', Icon: IconEmotion },
  { to: '/app/settings', label: 'Ik', Icon: IconSettings },
]

export function ChildLayout() {
  const [pauseOpen, setPauseOpen] = useState(false)

  return (
    <div className="flex flex-col h-[100dvh] bg-surface">
      {/* Hoofd-content */}
      <main className="flex-1 overflow-y-auto overscroll-none pb-[72px]">
        <Outlet />
      </main>

      {/* Floating pauze-knop — altijd zichtbaar */}
      <motion.button
        onClick={() => setPauseOpen(true)}
        className="fixed z-40 flex items-center justify-center"
        style={{
          right: 16,
          bottom: 84,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent-secondary)',
          boxShadow: '0 4px 16px rgba(123,175,163,0.45)',
          color: 'white',
          fontSize: 22,
          border: 'none',
          cursor: 'pointer',
        }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        aria-label="Pauze — kalmeerscherm openen"
        title="Pauze"
      >
        🤲
      </motion.button>

      {/* Pauze-overlay */}
      <AnimatePresence>
        {pauseOpen && <PauzeOverlay onClose={() => setPauseOpen(false)} />}
      </AnimatePresence>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        aria-label="Hoofdnavigatie"
      >
        <ul className="flex items-stretch h-[64px]">
          {tabs.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 h-full w-full transition-colors ${
                    isActive ? 'text-accent' : 'text-ink-muted'
                  }`
                }
                aria-label={label}
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      animate={{ scale: isActive ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Icon
                        size={26}
                        strokeWidth={isActive ? 3.5 : 2.5}
                        className={isActive ? 'text-accent' : 'text-ink-muted'}
                      />
                    </motion.span>
                    <span
                      className="text-[11px] font-body font-semibold leading-tight"
                      style={{ fontWeight: isActive ? 700 : 500 }}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
