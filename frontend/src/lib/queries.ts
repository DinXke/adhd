/**
 * React Query hooks voor alle API-data.
 * Centraal punt zodat caching consistent is.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { useAuthStore } from '../stores/authStore'

// ── Schedules ─────────────────────────────────────────────────

export interface ActivityStep {
  id: string
  title: string
  icon?: string | null
  sortOrder: number
  completedAt?: string | null
}

export interface Activity {
  id: string
  title: string
  icon: string
  startTime: string
  durationMinutes: number
  color: string
  notifyBefore: number[]
  sortOrder: number
  steps: ActivityStep[]
  isCurrent?: boolean
  isPast?: boolean
}

export interface Schedule {
  id: string
  userId: string
  dayOfWeek: number
  activities: Activity[]
}

export interface TodayScheduleResponse {
  schedule: Schedule | null
  activities: Activity[]
  dayOfWeek: number
  date: string
}

export function useTodaySchedule(childId?: string) {
  return useQuery({
    queryKey: ['schedule', 'today', childId],
    queryFn: () => api.get<TodayScheduleResponse>(`/api/schedules/today/${childId}`),
    enabled: !!childId,
    refetchInterval: 60_000, // elke minuut herladen
  })
}

export function useAllSchedules(childId?: string) {
  return useQuery({
    queryKey: ['schedules', childId],
    queryFn: () => api.get<{ schedules: Schedule[] }>(`/api/schedules/${childId}`),
    enabled: !!childId,
  })
}

export interface NewActivityInput {
  title: string
  icon: string
  startTime: string
  durationMinutes: number
  color?: string
  notifyBefore?: number[]
  steps?: { title: string; icon?: string }[]
}

export function useAddActivity(scheduleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NewActivityInput) =>
      api.post(`/api/schedules/${scheduleId}/activities`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (activityId: string) => api.delete(`/api/schedules/activities/${activityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Activity> & { id: string }) =>
      api.put(`/api/schedules/activities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

// ── Tasks ─────────────────────────────────────────────────────

export interface TaskStep {
  id: string
  title: string
  icon?: string | null
  sortOrder: number
  completedAt?: string | null
}

export interface Task {
  id: string
  childId: string
  title: string
  description?: string | null
  icon?: string | null
  durationMinutes?: number | null
  scheduledFor?: string | null
  completedAt?: string | null
  sortOrder: number
  steps: TaskStep[]
  createdBy: { id: string; name: string }
}

export function useTasks(childId?: string) {
  return useQuery({
    queryKey: ['tasks', childId],
    queryFn: () => api.get<{ tasks: Task[] }>(`/api/tasks/${childId}`),
    enabled: !!childId,
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.patch(`/api/tasks/${taskId}/complete`),
    onSuccess: (_, taskId) => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCompleteStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, stepId }: { taskId: string; stepId: string }) =>
      api.patch(`/api/tasks/${taskId}/steps/${stepId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      childId: string
      title: string
      description?: string
      icon?: string
      durationMinutes?: number
      scheduledFor?: string
      steps?: { title: string; icon?: string }[]
    }) => api.post<Task>('/api/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/api/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ── Tokens ────────────────────────────────────────────────────

export interface TokenData {
  balance: number
  todayEarned: number
  transactions: {
    id: string
    amount: number
    type: string
    sourceType: string
    note?: string | null
    createdAt: string
  }[]
}

export function useTokenBalance(childId?: string) {
  return useQuery({
    queryKey: ['tokens', childId],
    queryFn: async () => {
      const txns = await api.get<{ transactions: TokenData['transactions'] }>(
        `/api/tokens/${childId}`
      )
      const balance = txns.transactions.reduce(
        (sum, t) => (t.type === 'redeemed' ? sum - t.amount : sum + t.amount),
        0
      )
      const today = new Date().toDateString()
      const todayEarned = txns.transactions
        .filter((t) => t.type === 'earned' && new Date(t.createdAt).toDateString() === today)
        .reduce((sum, t) => sum + t.amount, 0)
      return { balance, todayEarned, transactions: txns.transactions }
    },
    enabled: !!childId,
  })
}
