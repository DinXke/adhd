import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '../types'
import { api, setAccessToken } from '../lib/api'

interface AuthStore {
  user: User | null
  accessToken: string | null
  isLoading: boolean

  // Actions
  loginWithPin: (childId: string, pin: string) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<boolean>
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      loginWithPin: async (childId, pin) => {
        set({ isLoading: true })
        try {
          const data = await api.post<{ accessToken: string; user: User }>('/api/auth/login/pin', {
            childId,
            pin,
          })
          set({ user: data.user, accessToken: data.accessToken, isLoading: false })
          setAccessToken(data.accessToken)
          applyTheme(data.user.role)
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      loginWithEmail: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await api.post<{ accessToken: string; user: User }>('/api/auth/login', {
            email,
            password,
          })
          set({ user: data.user, accessToken: data.accessToken, isLoading: false })
          setAccessToken(data.accessToken)
          applyTheme(data.user.role)
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout')
        } catch {}
        set({ user: null, accessToken: null })
        setAccessToken(null)
        document.documentElement.removeAttribute('data-theme')
      },

      refreshAuth: async () => {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })
          if (!res.ok) {
            set({ user: null, accessToken: null })
            return false
          }
          const data = await res.json()
          set({ user: data.user, accessToken: data.accessToken })
          setAccessToken(data.accessToken)
          applyTheme(data.user.role)
          return true
        } catch {
          set({ user: null, accessToken: null })
          return false
        }
      },

      setUser: (user) => set({ user }),
      setAccessToken: (token) => {
        set({ accessToken: token })
        setAccessToken(token)
      },
    }),
    {
      name: 'julie-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken)
        }
        if (state?.user) {
          applyTheme(state.user.role)
        }
      },
    },
  ),
)

// Theme toepassen op basis van rol
function applyTheme(role: string) {
  const theme = role === 'child' ? 'child' : 'adult'
  document.documentElement.setAttribute('data-theme', theme)
}
