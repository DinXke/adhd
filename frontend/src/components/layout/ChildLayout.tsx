import { NavLink, Outlet } from 'react-router-dom'
import { IconHome, IconExercise, IconTokens, IconEmotion } from '../icons/NavIcons'
import { motion } from 'framer-motion'

const tabs = [
  { to: '/app/day', label: 'Mijn Dag', Icon: IconHome },
  { to: '/app/exercises', label: 'Oefenen', Icon: IconExercise },
  { to: '/app/tokens', label: 'Tokens', Icon: IconTokens },
  { to: '/app/feelings', label: 'Hoe gaat het?', Icon: IconEmotion },
]

export function ChildLayout() {
  return (
    <div className="flex flex-col h-[100dvh] bg-surface">
      {/* Hoofd-content */}
      <main className="flex-1 overflow-y-auto overscroll-none pb-[72px]">
        <Outlet />
      </main>

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
