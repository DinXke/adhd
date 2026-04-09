export type Role = 'child' | 'parent' | 'caregiver' | 'admin'

export interface User {
  id: string
  name: string
  role: Role
  avatarUrl?: string | null
  email?: string | null
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface TokenTransaction {
  id: string
  amount: number
  type: 'earned' | 'redeemed' | 'manual'
  sourceType: string
  note?: string
  createdAt: string
}

export interface Reward {
  id: string
  title: string
  description?: string
  imageUrl?: string
  costTokens: number
  isAvailable: boolean
  requiresApproval: boolean
  category?: string
  sortOrder: number
}

export interface Activity {
  id: string
  title: string
  icon: string
  startTime: string
  durationMinutes: number
  color: string
  steps: { id: string; title: string; icon?: string; sortOrder: number }[]
}

export type EmotionLevel = 'great' | 'good' | 'okay' | 'sad' | 'angry'
