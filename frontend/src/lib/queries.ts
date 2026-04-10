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
  label?: string | null
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

// ── Users / Children ──────────────────────────────────────────

export interface ChildProfile {
  id: string
  name: string
  role?: string
  avatarUrl?: string | null
  avatarId?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  isActive?: boolean
  isPrimary?: boolean
}

/** Voor het PIN-inlogscherm — alle actieve kinderen */
export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: () => api.get<{ children: ChildProfile[] }>('/api/auth/children'),
  })
}

/** Voor ouder-dashboard — alleen gekoppelde kinderen */
export function useMyChildren() {
  return useQuery({
    queryKey: ['my-children'],
    queryFn: () => api.get<{ children: ChildProfile[] }>('/api/users/my-children'),
  })
}

export function useCreateChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      pin: string
      gender?: string
      dateOfBirth?: string
      avatarId?: string
    }) => api.post<ChildProfile>('/api/users/children', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] })
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useUpdateChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; pin?: string; gender?: string; dateOfBirth?: string; avatarId?: string; isActive?: boolean }) =>
      api.put<ChildProfile>(`/api/users/children/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] })
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useDeleteChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/children/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] })
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useUpdateAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { avatarId: string; gender?: string }) =>
      api.patch<{ id: string; avatarId: string; gender: string }>('/api/users/me/avatar', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// ── Tokens ────────────────────────────────────────────────────

export interface TokenTransaction {
  id: string
  amount: number
  type: string
  sourceType: string
  note?: string | null
  createdAt: string
  reward?: { id: string; title: string } | null
}

export interface TokenBalanceResponse {
  balance: number
  todayEarned: number
  streak: number
  transactions: TokenTransaction[]
}

export interface Reward {
  id: string
  childId: string
  title: string
  description?: string | null
  imageUrl?: string | null
  costTokens: number
  isAvailable: boolean
  requiresApproval: boolean
  category?: string | null
  expiresAt?: string | null
  sortOrder: number
}

export function useTokenBalance(childId?: string) {
  return useQuery({
    queryKey: ['tokens', childId],
    queryFn: () => api.get<TokenBalanceResponse>(`/api/tokens/${childId}`),
    enabled: !!childId,
    refetchInterval: 30_000,
  })
}

export function useRewards(childId?: string) {
  return useQuery({
    queryKey: ['rewards', childId],
    queryFn: () => api.get<{ rewards: Reward[] }>(`/api/tokens/${childId}/rewards`),
    enabled: !!childId,
  })
}

export function useRedeemReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, rewardId }: { childId: string; rewardId: string }) =>
      api.post<{ transaction: TokenTransaction; requiresApproval: boolean; rewardTitle: string }>(
        `/api/tokens/${childId}/redeem`,
        { rewardId }
      ),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: ['tokens', childId] })
    },
  })
}

export function useGrantTokens() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, amount, note }: { childId: string; amount: number; note?: string }) =>
      api.post(`/api/tokens/${childId}/grant`, { amount, note }),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: ['tokens', childId] })
    },
  })
}

export function useCreateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      childId,
      ...data
    }: {
      childId: string
      title: string
      description?: string
      costTokens: number
      requiresApproval?: boolean
      category?: string
    }) => api.post<Reward>(`/api/tokens/${childId}/rewards`, data),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: ['rewards', childId] })
    },
  })
}

export function useUpdateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Reward> & { id: string }) =>
      api.put(`/api/tokens/rewards/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export function useDeleteReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => api.delete(`/api/tokens/rewards/${rewardId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

// ── Communicatie ──────────────────────────────────────────────

export interface ChannelMember {
  id: string
  name: string
  role: string
  avatarUrl?: string | null
  avatarId?: string | null
}

export interface Channel {
  id: string
  name: string
  type: string
  childId: string
  unreadCount: number
  members: { user: ChannelMember }[]
  messages: Message[]
}

export interface Message {
  id: string
  channelId: string
  content: string
  isStructuredUpdate: boolean
  templateData?: any
  createdAt: string
  author: ChannelMember & { id: string }
  reads: { userId: string; readAt: string }[]
  attachments: Attachment[]
}

export interface Attachment {
  id: string
  filename: string
  mimeType: string
  storageKey: string
  sizeBytes: number
  uploadedAt: string
}

export function useChannels(childId?: string) {
  return useQuery({
    queryKey: ['channels', childId],
    queryFn: () =>
      api.get<{ channels: Channel[] }>(
        `/api/communication/channels${childId ? `?childId=${childId}` : ''}`
      ),
    refetchInterval: 30_000,
  })
}

export function useMessages(channelId?: string) {
  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => api.get<{ messages: Message[]; hasMore: boolean }>(`/api/communication/channels/${channelId}/messages`),
    enabled: !!channelId,
    refetchInterval: 15_000,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, content, isStructuredUpdate, templateData }: {
      channelId: string
      content: string
      isStructuredUpdate?: boolean
      templateData?: any
    }) => api.post<{ message: Message }>(`/api/communication/channels/${channelId}/messages`, {
      content, isStructuredUpdate, templateData,
    }),
    onSuccess: (_, { channelId }) => {
      qc.invalidateQueries({ queryKey: ['messages', channelId] })
      qc.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

export function useCreateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type?: string; childId: string; memberUserIds?: string[] }) =>
      api.post<{ channel: Channel }>('/api/communication/channels', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  })
}

export function useDeleteMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (msgId: string) => api.delete(`/api/communication/messages/${msgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  })
}

// ── Dossier ───────────────────────────────────────────────────

export interface DossierEntry {
  id: string
  childId: string
  category: 'report' | 'plan' | 'medication' | 'note' | 'progress'
  title: string
  content: string
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  attachments: Attachment[]
}

export function useDossier(childId?: string, category?: string) {
  return useQuery({
    queryKey: ['dossier', childId, category],
    queryFn: () =>
      api.get<{ entries: DossierEntry[] }>(
        `/api/dossier/${childId}${category ? `?category=${category}` : ''}`
      ),
    enabled: !!childId,
  })
}

export function useCreateDossierEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, ...data }: { childId: string; category: string; title: string; content: string; visibleToIds?: string[] }) =>
      api.post<{ entry: DossierEntry }>(`/api/dossier/${childId}`, data),
    onSuccess: (_, { childId }) => qc.invalidateQueries({ queryKey: ['dossier', childId] }),
  })
}

export function useUpdateDossierEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, id, ...data }: { childId: string; id: string; title?: string; content?: string }) =>
      api.put<{ entry: DossierEntry }>(`/api/dossier/${childId}/${id}`, data),
    onSuccess: (_, { childId }) => qc.invalidateQueries({ queryKey: ['dossier', childId] }),
  })
}

export function useDeleteDossierEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, id }: { childId: string; id: string }) =>
      api.delete(`/api/dossier/${childId}/${id}`),
    onSuccess: (_, { childId }) => qc.invalidateQueries({ queryKey: ['dossier', childId] }),
  })
}

// ── Invites ───────────────────────────────────────────────────

export interface CaregiverInvite {
  id: string
  email: string
  role: string
  modules: string[]
  childId: string
  expiresAt: string
  usedAt?: string | null
  invitedUser?: { id: string; name: string; email: string } | null
}

export function useInvites(childId?: string) {
  return useQuery({
    queryKey: ['invites', childId],
    queryFn: () =>
      api.get<{ invites: CaregiverInvite[] }>(
        `/api/invites${childId ? `?childId=${childId}` : ''}`
      ),
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; childId: string; modules?: string[]; role?: string }) =>
      api.post<{ inviteId: string; inviteUrl: string; expiresAt: string }>('/api/invites', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  })
}

export function useDeleteInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  })
}

export function useCaregivers(childId?: string) {
  return useQuery({
    queryKey: ['caregivers', childId],
    queryFn: () => api.get<{ caregivers: any[] }>(`/api/invites/caregivers/${childId}`),
    enabled: !!childId,
  })
}

// ── Dashboard ─────────────────────────────────────────────────

export interface DashboardOverview {
  child: { id: string; name: string; avatarId: string | null; age: number | null }
  today: {
    tokensEarned: number
    tokenBalance: number
    emotion: { level: string; icon: string; label: string } | null
    exerciseSessions: number
    tasksCompleted: number
    tasksTotal: number
  }
  charts: {
    tokenTrend: { date: string; label: string; tokens: number }[]
    emotions: { level: string; label: string; icon: string; count: number }[]
    exerciseAccuracy: { correct: number; wrong: number; total: number; percentage: number | null }
  }
  feed: { id: string; type: string; icon: string; text: string; time: string }[]
}

export function useDashboardOverview(childId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'overview', childId],
    queryFn: () => api.get<DashboardOverview>(
      `/api/dashboard/overview${childId ? `?childId=${childId}` : ''}`
    ),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
}

// ── Weekrapporten ─────────────────────────────────────────────

export interface WeekReport {
  content: string | null
  generatedAt: string | null
  weekStart: string | null
}

export function useLatestWeekReport(childId?: string) {
  return useQuery({
    queryKey: ['reports', 'weekly', childId],
    queryFn: () => api.get<WeekReport>(`/api/reports/weekly${childId ? `?childId=${childId}` : ''}`),
    enabled: !!childId,
    staleTime: 5 * 60_000,
  })
}

export function useGenerateWeekReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId }: { childId: string }) =>
      api.post<WeekReport>('/api/reports/weekly', { childId }),
    onSuccess: (data, { childId }) => {
      qc.setQueryData(['reports', 'weekly', childId], data)
    },
  })
}

// ── Home Assistant ─────────────────────────────────────────────

export interface HaStatus {
  configured: boolean
  haUrl: string | null
  triggers: { key: string; label: string; description: string; webhookId: string }[]
}

export function useHaStatus() {
  return useQuery({
    queryKey: ['ha', 'status'],
    queryFn: () => api.get<HaStatus>('/api/ha/status'),
    staleTime: 30_000,
  })
}

export function useHaTest() {
  return useMutation({
    mutationFn: (trigger: string) => api.post<{ success: boolean; message: string; webhookId: string }>('/api/ha/test', { trigger }),
  })
}

// ── Zelfstandigheidschecklist ─────────────────────────────────

export function useIndependenceTasks(childId?: string) {
  return useQuery({
    queryKey: ['independence', childId],
    queryFn: () => api.get<{ tasks: any[] }>(`/api/independence/${childId}`),
    enabled: !!childId,
    staleTime: 30_000,
  })
}

export function useCompleteIndependenceTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string }) =>
      api.post(`/api/independence/tasks/${taskId}/complete`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['independence'] }),
  })
}

export function useCreateIndependenceTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { childId: string; title: string; icon?: string; category?: string; frequency?: string; description?: string }) =>
      api.post(`/api/independence/${data.childId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['independence'] }),
  })
}

export function useSeedIndependenceTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ childId, age }: { childId: string; age?: number }) =>
      api.post(`/api/independence/${childId}/seed`, { age }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['independence'] }),
  })
}

export function useToggleIndependenceTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, isActive }: { taskId: string; isActive: boolean }) =>
      api.put(`/api/independence/tasks/${taskId}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['independence'] }),
  })
}

// ── Sociale Scripts ───────────────────────────────────────────

export function useSocialScripts(childId?: string) {
  return useQuery({
    queryKey: ['social', childId],
    queryFn: () => api.get<{ scripts: any[] }>(`/api/social/${childId}`),
    enabled: !!childId,
    staleTime: 60_000,
  })
}

export function useGenerateSocialScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { childId: string; category?: string; difficulty?: number; topic?: string }) =>
      api.post<{ script: any }>(`/api/social/${data.childId}/generate`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social'] }),
  })
}

export function useDeleteSocialScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/social/scripts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social'] }),
  })
}

export function usePlaySocialScript() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/social/scripts/${id}/play`, {}),
  })
}

// ── Push notificaties ─────────────────────────────────────────

export function useVapidPublicKey() {
  return useQuery({
    queryKey: ['vapid-public-key'],
    queryFn: () => api.get<{ publicKey: string }>('/api/push/vapid-public-key'),
    staleTime: Infinity,
  })
}

// ── Oefeningen review ─────────────────────────────────────────

export function usePendingExercises() {
  return useQuery({
    queryKey: ['exercises', 'pending'],
    queryFn: () => api.get<{ exercises: any[] }>('/api/exercises/pending'),
    staleTime: 30_000,
  })
}

export function useApproveExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      api.patch(`/api/exercises/${id}/approve`, { isApproved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises', 'pending'] }),
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/exercises/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises', 'pending'] }),
  })
}
