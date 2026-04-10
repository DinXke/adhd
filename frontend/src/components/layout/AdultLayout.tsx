import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconHome, IconExercise, IconTokens, IconCommunication, IconDossier, IconSettings
} from '../icons/NavIcons'

// Vaardigheden-icoon — vinkjeslijst
function IconSkills({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M6 8L8 10L11 7" stroke="currentColor" />
      <path d="M15 9H26" stroke="currentColor" />
      <path d="M6 16L8 18L11 15" stroke="currentColor" />
      <path d="M15 17H26" stroke="currentColor" />
      <path d="M6 24L8 26L11 23" stroke="currentColor" />
      <path d="M15 25H22" stroke="currentColor" />
    </svg>
  )
}

// Sociale scripts-icoon — gespreksbubbels
function IconSocial({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M5 7C5 5.9 5.9 5 7 5H20C21.1 5 22 5.9 22 7V14C22 15.1 21.1 16 20 16H14L9 20V16H7C5.9 16 5 15.1 5 14V7Z" stroke="currentColor" />
      <path d="M22 12H25C26.1 12 27 12.9 27 14V20C27 21.1 26.1 22 25 22H23V25L19 22H15C13.9 22 13 21.1 13 20V18" stroke="currentColor" />
    </svg>
  )
}

// Voortgang-icoon — grafiek omhoog
function IconProgress({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M4 24L12 14L18 19L26 8" stroke="currentColor" />
      <path d="M23 8H27V12" stroke="currentColor" />
    </svg>
  )
}

// Hulpverleners-icoon (persoon met sleutel/koppeling)
function IconCaregivers({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <circle cx="12" cy="9" r="4" stroke="currentColor" />
      <path d="M4 26C4 21.6 7.6 18 12 18" stroke="currentColor" />
      <circle cx="23" cy="19" r="3" stroke="currentColor" />
      <path d="M23 22V28" stroke="currentColor" />
      <path d="M20 25H26" stroke="currentColor" />
    </svg>
  )
}
import { useAuthStore } from '../../stores/authStore'
import { motion } from 'framer-motion'

// Kalender-icoon voor schema's
function IconCalendar({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <rect x="4" y="6" width="24" height="22" rx="3" stroke="currentColor" />
      <path d="M4 12H28" stroke="currentColor" />
      <path d="M10 4V8M22 4V8" stroke="currentColor" />
      <circle cx="11" cy="19" r="1.5" fill="currentColor" />
      <circle cx="16" cy="19" r="1.5" fill="currentColor" />
      <circle cx="21" cy="19" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Lijst met vinkjes — taken
function IconTasks({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M12 8H26M12 16H26M12 24H22" stroke="currentColor" />
      <path d="M6 8L7.5 9.5L10 7" stroke="currentColor" />
      <path d="M6 16L7.5 17.5L10 15" stroke="currentColor" />
      <circle cx="7.5" cy="24" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Kinderen-icoon
function IconChildren({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <circle cx="10" cy="10" r="4" stroke="currentColor" />
      <circle cx="22" cy="10" r="4" stroke="currentColor" />
      <path d="M4 28C4 23 6.7 20 10 20" stroke="currentColor" />
      <path d="M28 28C28 23 25.3 20 22 20" stroke="currentColor" />
      <path d="M13 28C13 24 14.3 22 16 22C17.7 22 19 24 19 28" stroke="currentColor" />
    </svg>
  )
}

// Oefeningen review icoon — vinkje met vergrootglas
function IconReview({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M6 8L8 10L11 7M15 9H26M6 16L8 18L11 15M15 17H22" stroke="currentColor" />
      <circle cx="22" cy="24" r="4" stroke="currentColor" />
      <path d="M25 27L28 30" stroke="currentColor" />
    </svg>
  )
}

// Systeem icoon — server/terminal
function IconSystem({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <rect x="3" y="5" width="26" height="18" rx="3" stroke="currentColor" />
      <path d="M8 27H24" stroke="currentColor" />
      <path d="M16 23V27" stroke="currentColor" />
      <path d="M9 12L12 15L9 18" stroke="currentColor" />
      <path d="M15 18H22" stroke="currentColor" />
    </svg>
  )
}

// Geld-icoon — spaarpotje
function IconMoney({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <circle cx="16" cy="18" r="10" stroke="currentColor" />
      <path d="M16 8V6M13 6h6" stroke="currentColor" />
      <path d="M13 18c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3" stroke="currentColor" />
      <path d="M16 21v1" stroke="currentColor" />
      <path d="M16 14v1" stroke="currentColor" />
    </svg>
  )
}

// Recept-icoon — kookpot
function IconRecipe({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M6 14h20l-2 12H8L6 14z" stroke="currentColor" />
      <path d="M4 14h24" stroke="currentColor" />
      <path d="M11 10V7M16 10V6M21 10V8" stroke="currentColor" />
    </svg>
  )
}

// Gebruikers-icoon — personen groep
function IconUsers({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <circle cx="12" cy="10" r="4" stroke="currentColor" />
      <path d="M4 26C4 21.6 7.6 18 12 18C16.4 18 20 21.6 20 26" stroke="currentColor" />
      <circle cx="22" cy="12" r="3" stroke="currentColor" />
      <path d="M22 18C25.3 18 28 20.7 28 24" stroke="currentColor" />
    </svg>
  )
}

// Help-icoon — vraagteken in cirkel
function IconHelp({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <circle cx="16" cy="16" r="12" stroke="currentColor" />
      <path d="M12.5 12.5C12.5 10.6 14.1 9 16 9C17.9 9 19.5 10.6 19.5 12.5C19.5 14.4 17.9 16 16 16V18" stroke="currentColor" />
      <circle cx="16" cy="22" r="1" fill="currentColor" />
    </svg>
  )
}

// Documenten-icoon — map met bestanden
function IconDocuments({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M4 8C4 6.9 4.9 6 6 6H13L16 10H26C27.1 10 28 10.9 28 12V24C28 25.1 27.1 26 26 26H6C4.9 26 4 25.1 4 24V8Z" stroke="currentColor" />
      <path d="M12 18H20" stroke="currentColor" />
      <path d="M12 22H17" stroke="currentColor" />
    </svg>
  )
}

// Afspraken-icoon — kalender met ster
function IconAppointments({ size = 28, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} aria-hidden="true">
      <rect x="4" y="6" width="24" height="22" rx="3" stroke="currentColor" />
      <path d="M4 12H28" stroke="currentColor" />
      <path d="M10 4V8M22 4V8" stroke="currentColor" />
      <path d="M16 19l1.5 3 3.5.5-2.5 2.5.5 3.5L16 27l-3 1.5.5-3.5L11 22.5l3.5-.5z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

const PARENT_LINKS = [
  { to: '/dashboard', label: 'Overzicht', Icon: IconHome, roles: ['parent', 'admin'] },
  { to: '/dashboard/children', label: 'Kinderen', Icon: IconChildren, roles: ['parent', 'admin'] },
  { to: '/dashboard/tasks', label: 'Taken', Icon: IconTasks, roles: ['parent', 'admin'] },
  { to: '/dashboard/schedule', label: "Schema's", Icon: IconCalendar, roles: ['parent', 'admin'] },
  { to: '/dashboard/appointments', label: 'Afspraken', Icon: IconAppointments, roles: ['parent', 'admin'] },
  { to: '/dashboard/tokens', label: 'Beloningen', Icon: IconTokens, roles: ['parent', 'admin'] },
  { to: '/dashboard/voortgang', label: 'Voortgang', Icon: IconProgress, roles: ['caregiver'] },
  { to: '/dashboard/communication', label: 'Communicatie', Icon: IconCommunication, roles: ['parent', 'admin', 'caregiver'] },
  { to: '/dashboard/dossier', label: 'Dossier', Icon: IconDossier, roles: ['parent', 'admin', 'caregiver'] },
  { to: '/dashboard/documents', label: 'Documenten', Icon: IconDocuments, roles: ['parent', 'admin', 'caregiver'] },
  { to: '/dashboard/hulpverleners', label: 'Hulpverleners', Icon: IconCaregivers, roles: ['parent', 'admin'] },
  { to: '/dashboard/vaardigheden', label: 'Vaardigheden', Icon: IconSkills, roles: ['parent', 'admin'] },
  { to: '/dashboard/social-scripts', label: 'Sociale scripts', Icon: IconSocial, roles: ['parent', 'admin'] },
  { to: '/dashboard/exercises/review', label: 'Oef. review', Icon: IconReview, roles: ['parent', 'admin'] },
  { to: '/dashboard/money', label: 'Spaarpotje', Icon: IconMoney, roles: ['parent', 'admin'] },
  { to: '/dashboard/recipes', label: 'Recepten', Icon: IconRecipe, roles: ['parent', 'admin'] },
  { to: '/dashboard/system', label: 'Systeem', Icon: IconSystem, roles: ['admin'] },
  { to: '/dashboard/users', label: 'Gebruikers', Icon: IconUsers, roles: ['admin'] },
  { to: '/dashboard/help', label: 'Help', Icon: IconHelp, roles: ['parent', 'admin', 'caregiver'] },
  { to: '/dashboard/settings', label: 'Instellingen', Icon: IconSettings, roles: ['parent', 'admin'] },
]

export function AdultLayout() {
  const { user, logout } = useAuthStore()
  const sidebarLinks = PARENT_LINKS.filter(l => l.roles.includes(user?.role ?? ''))
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
