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

// Kind
const ChildSettingsPage = lazy(() => import('./pages/child/ChildSettingsPage').then(m => ({ default: m.ChildSettingsPage })))
const IndependencePage = lazy(() => import('./pages/child/IndependencePage').then(m => ({ default: m.IndependencePage })))
const SocialScriptsPage = lazy(() => import('./pages/child/SocialScriptsPage').then(m => ({ default: m.SocialScriptsPage })))
const ListsPage = lazy(() => import('./pages/child/ListsPage').then(m => ({ default: m.ListsPage })))
const LanguageGamesPage = lazy(() => import('./pages/child/games/LanguageGamesPage').then(m => ({ default: m.LanguageGamesPage })))
const MathGamesPage = lazy(() => import('./pages/child/games/MathGamesPage').then(m => ({ default: m.MathGamesPage })))
const LateralGamesPage = lazy(() => import('./pages/child/games/LateralGamesPage').then(m => ({ default: m.LateralGamesPage })))
const BrainGamesPage = lazy(() => import('./pages/child/games/BrainGamesPage').then(m => ({ default: m.BrainGamesPage })))

// Ouder/admin
const DashboardPage = lazy(() => import('./pages/parent/DashboardPage'))
const TasksPage = lazy(() => import('./pages/parent/TasksPage'))
const ScheduleEditorPage = lazy(() => import('./pages/parent/ScheduleEditorPage'))
const RewardsPage = lazy(() => import('./pages/parent/RewardsPage'))
const SettingsPage = lazy(() => import('./pages/parent/SettingsPage'))
const ChildrenPage = lazy(() => import('./pages/parent/ChildrenPage').then(m => ({ default: m.ChildrenPage })))
const CommunicationPage = lazy(() => import('./pages/parent/CommunicationPage').then(m => ({ default: m.CommunicationPage })))
const DossierPage = lazy(() => import('./pages/parent/DossierPage').then(m => ({ default: m.DossierPage })))
const InvitesPage = lazy(() => import('./pages/parent/InvitesPage').then(m => ({ default: m.InvitesPage })))
const ProgressPage = lazy(() => import('./pages/caregiver/ProgressPage').then(m => ({ default: m.ProgressPage })))
const IndependenceEditorPage = lazy(() => import('./pages/parent/IndependenceEditorPage').then(m => ({ default: m.IndependenceEditorPage })))
const SocialScriptsEditorPage = lazy(() => import('./pages/parent/SocialScriptsEditorPage').then(m => ({ default: m.SocialScriptsEditorPage })))
const ExercisesReviewPage = lazy(() => import('./pages/parent/ExercisesReviewPage').then(m => ({ default: m.ExercisesReviewPage })))
const SystemPage = lazy(() => import('./pages/parent/SystemPage').then(m => ({ default: m.SystemPage })))
const UserManagementPage = lazy(() => import('./pages/parent/UserManagementPage').then(m => ({ default: m.UserManagementPage })))
const HelpPage = lazy(() => import('./pages/parent/HelpPage').then(m => ({ default: m.HelpPage })))
const MoneyEditorPage = lazy(() => import('./pages/parent/MoneyEditorPage').then(m => ({ default: m.MoneyEditorPage })))
const RecipeEditorPage = lazy(() => import('./pages/parent/RecipeEditorPage').then(m => ({ default: m.RecipeEditorPage })))
const AppointmentsPage = lazy(() => import('./pages/parent/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })))
const MoneyPage = lazy(() => import('./pages/child/MoneyPage').then(m => ({ default: m.MoneyPage })))
const RecipePage = lazy(() => import('./pages/child/RecipePage').then(m => ({ default: m.RecipePage })))
const DocumentsPage = lazy(() => import('./pages/parent/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const TrmnlEditorPage = lazy(() => import('./pages/parent/TrmnlEditorPage').then(m => ({ default: m.TrmnlEditorPage })))

// Publiek
const AcceptInvitePage = lazy(() => import('./pages/auth/AcceptInvitePage'))

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
        <Route path="/uitnodiging/:token" element={<AcceptInvitePage />} />

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
          <Route path="vaardigheden" element={<IndependencePage />} />
          <Route path="social" element={<SocialScriptsPage />} />
          <Route path="geld" element={<MoneyPage />} />
          <Route path="lijstjes" element={<ListsPage />} />
          <Route path="taalspelletjes" element={<LanguageGamesPage />} />
          <Route path="rekenspelletjes" element={<MathGamesPage />} />
          <Route path="lateralisatie" element={<LateralGamesPage />} />
          <Route path="breinspelletjes" element={<BrainGamesPage />} />
          <Route path="settings" element={<ChildSettingsPage />} />
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
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="tokens" element={<RewardsPage />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="dossier" element={<DossierPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="hulpverleners" element={<InvitesPage />} />
          <Route path="voortgang" element={<ProgressPage />} />
          <Route path="vaardigheden" element={<IndependenceEditorPage />} />
          <Route path="social-scripts" element={<SocialScriptsEditorPage />} />
          <Route path="exercises/review" element={<ExercisesReviewPage />} />
          <Route path="money" element={<MoneyEditorPage />} />
          <Route path="recipes" element={<RecipeEditorPage />} />
          <Route path="system" element={<SystemPage />} />
          <Route path="trmnl-editor" element={<TrmnlEditorPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
