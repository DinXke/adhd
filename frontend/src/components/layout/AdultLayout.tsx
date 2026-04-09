import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconHome, IconExercise, IconTokens, IconCommunication, IconDossier, IconSettings
} from '../icons/NavIcons'
import { useAuthStore } from '../../stores/authStore'
import { motion } from 'framer-motion'

const sidebarLinks = [
  { to: '/dashboard', label: 'Overzicht', Icon: IconHome },
  { to: '/dashboard/tasks', label: 'Taken', Icon: IconExercise },
  { to: '/dashboard/schedule', label: 'Schema\'s', Icon: IconTokens },
  { to: '/dashboard/tokens', label: 'Tokens', Icon: IconTokens },
  { to: '/dashboard/communication', label: 'Communicatie', Icon: IconCommunication },
  { to: '/dashboard/dossier', label: 'Dossier', Icon: IconDossier },
  { to: '/dashboard/settings', label: 'Instellingen', Icon: IconSettings },
]

export function AdultLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-[100dvh] bg-surface">
      {/* Sidebar */}
      <aside
        className="sidebar hidden md:flex flex-col py-6 px-3 gap-1 border-r"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        aria-label="Zijbalk"
      >
        {/* Logo */}
        <div className="px-3 mb-6">
          <h1 className="font-display font-bold text-white text-xl">GRIP</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {user?.name ?? 'Dashboard'}
          </p>
        </div>

        {/* Navigatielinks */}
        <nav className="flex-1 flex flex-col gap-0.5">
          {sidebarLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} strokeWidth={2.5} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Uitloggen */}
        <button
          onClick={handleLogout}
          className="sidebar-link flex items-center gap-3 text-sm mt-2 border-none bg-transparent w-full text-left"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16H28M28 16L23 11M28 16L23 21" stroke="currentColor" />
            <path d="M20 8V6C20 4.9 19.1 4 18 4H6C4.9 4 4 4.9 4 6V26C4 27.1 4.9 28 6 28H18C19.1 28 20 27.1 20 26V24" stroke="currentColor" />
          </svg>
          Uitloggen
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6 max-w-5xl mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
