import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Role } from '../../types'

interface Props {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, accessToken, refreshAuth } = useAuthStore()
  const location = useLocation()
  const [checking, setChecking] = useState(!user && !accessToken)

  useEffect(() => {
    if (!user && !accessToken) {
      // Probeer refresh via httpOnly cookie
      refreshAuth().finally(() => setChecking(false))
    }
  }, []) // eslint-disable-line

  if (checking) {
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Verkeerde rol → redirect naar eigen startpagina
    if (user.role === 'child') return <Navigate to="/app/day" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
