import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ChildLayout } from './components/layout/ChildLayout'
import { AdultLayout } from './components/layout/AdultLayout'

// Auth
import SelectProfile from './pages/auth/SelectProfile'
import PinLogin from './pages/auth/PinLogin'
import AdultLogin from './pages/auth/AdultLogin'

// Kind
const DayPage = lazy(() => import('./pages/child/DayPage'))
const NuDoenPage = lazy(() => import('./pages/child/NuDoenPage'))
const ExercisesPage = lazy(() => import('./pages/child/ExercisesPage'))
const TokensPage = lazy(() => import('./pages/child/TokensPage'))
const FeelingsPage = lazy(() => import('./pages/child/FeelingsPage'))

// Ouder/admin
const DashboardPage = lazy(() => import('./pages/parent/DashboardPage'))
const TasksPage = lazy(() => import('./pages/parent/TasksPage'))
const ScheduleEditorPage = lazy(() => import('./pages/parent/ScheduleEditorPage'))
const RewardsPage = lazy(() => import('./pages/parent/RewardsPage'))
const SettingsPage = lazy(() => import('./pages/parent/SettingsPage'))

function PageLoading() {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-surface">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  // Luister naar logout-event van de API client
  useEffect(() => {
    const handler = () => { window.location.href = '/login' }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Root → redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<SelectProfile />} />
        <Route path="/login/pin/:childId" element={<PinLogin />} />
        <Route path="/login/adult" element={<AdultLogin />} />

        {/* Kind-modus */}
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['child']}>
              <ChildLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="day" replace />} />
          <Route path="day" element={<DayPage />} />
          <Route path="nu-doen/:activityId" element={<NuDoenPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="feelings" element={<FeelingsPage />} />
        </Route>

        {/* Ouder / hulpverlener / admin */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['parent', 'caregiver', 'admin']}>
              <AdultLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="schedule" element={<ScheduleEditorPage />} />
          <Route path="tokens" element={<RewardsPage />} />
          <Route path="communication" element={<div className="font-body text-ink-muted p-4">Communicatie — Fase 6</div>} />
          <Route path="dossier" element={<div className="font-body text-ink-muted p-4">Dossier — Fase 6</div>} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
