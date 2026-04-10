/**
 * Dashboard — Realtime overzicht van kind-voortgang met grafieken.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useMyChildren, useDashboardOverview, useGenerateWeekReport, useLatestWeekReport } from '../../lib/queries'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

// Kleuren voor grafieken — het warme palet
const CHART_COLORS = {
  primary: '#C17A3A',
  secondary: '#7BAFA3',
  success: '#5B8C5A',
  warning: '#D4973B',
  muted: '#E8E0D6',
}

const EMOTION_COLORS: Record<string, string> = {
  great: '#5B8C5A',
  good: '#7BAFA3',
  okay: '#D4973B',
  sad: '#A8C5D6',
  angry: '#C45D4C',
}

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4"
    >
      <p className="text-xs text-ink-muted font-medium mb-1">{label}</p>
      <p className="font-display font-bold text-2xl" style={{ color: accent ? 'var(--accent-token, #C17A3A)' : 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </motion.div>
  )
}

// ── Dagelijkse tip (Claude Haiku) ────────────────────────────
function DailyTipPanel({ childId }: { childId: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-tip', childId],
    queryFn: () => api.get<{ tip: { content: string; date: string } | null }>(`/api/tips/${childId}/today`),
    staleTime: 1000 * 60 * 60, // 1 uur
  })

  const regenerate = useMutation({
    mutationFn: () => api.post(`/api/tips/${childId}/regenerate`, {}),
    onSuccess: () => refetch(),
  })

  const tip = data?.tip

  if (!tip && !isLoading) return null

  return (
    <div className="bg-card rounded-2xl border border-border p-5 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-display font-semibold text-ink text-sm mb-1">Tip voor vandaag</p>
            {isLoading ? (
              <div className="h-4 w-48 rounded bg-surface animate-pulse" />
            ) : (
              <p className="font-body text-sm text-ink-muted leading-relaxed">{tip?.content}</p>
            )}
          </div>
        </div>
        <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending}
          className="flex-shrink-0 p-1.5 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          title="Nieuwe tip genereren">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={regenerate.isPending ? 'animate-spin' : ''}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function WeekReportPanel({ childId }: { childId: string }) {
  const { data: cached } = useLatestWeekReport(childId)
  const generate = useGenerateWeekReport()
  const [showReport, setShowReport] = useState(false)

  const hasReport = !!cached?.content

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-ink text-base">Weekrapport</h3>
          <p className="text-xs text-ink-muted">
            {cached?.generatedAt
              ? `Gegenereerd op ${format(new Date(cached.generatedAt), 'd MMM HH:mm', { locale: nl })}`
              : 'Nog geen rapport deze week'}
          </p>
        </div>
        <button
          onClick={() => generate.mutate({ childId }, {
            onSuccess: () => setShowReport(true),
          })}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: generate.isPending ? 'var(--bg-primary)' : 'var(--accent-primary)',
            color: generate.isPending ? 'var(--text-secondary)' : 'white',
            border: generate.isPending ? '1px solid var(--border-color)' : 'none',
          }}
        >
          {generate.isPending ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Genereren...
            </>
          ) : (
            <>✨ {hasReport ? 'Vernieuwen' : 'Genereren'}</>
          )}
        </button>
      </div>

      {generate.isError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3">
          {(generate.error as any)?.message ?? 'Generatie mislukt'}
        </p>
      )}

      {hasReport && (
        <>
          <button
            onClick={() => setShowReport(!showReport)}
            className="text-sm text-ink-muted hover:text-accent transition-colors flex items-center gap-1"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className={`transition-transform ${showReport ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {showReport ? 'Verberg rapport' : 'Toon rapport'}
          </button>
          {showReport && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{cached!.content}</p>
              <button
                onClick={() => window.print()}
                className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Afdrukken / PDF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data, isLoading, error } = useDashboardOverview(childId)

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display font-bold text-ink text-2xl">Hallo {user?.name}</h1>
          <p className="text-ink-muted text-sm mt-0.5">Overzicht laden...</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display font-bold text-ink text-2xl">Dashboard</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-ink">Nog geen data</p>
          <p className="text-sm text-ink-muted mt-1">
            {children.length === 0
              ? 'Voeg een kind toe via het Kinderen-menu om te beginnen.'
              : 'Er zijn nog geen activiteiten geregistreerd.'}
          </p>
        </div>
      </div>
    )
  }

  const { child, today, charts, feed } = data

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">
            Hallo {user?.name}
          </h1>
          <p className="text-ink-muted text-sm mt-0.5">
            Overzicht van {child.name}{child.age ? ` (${child.age} jaar)` : ''}
          </p>
        </div>
        {children.length > 1 && (
          <select
            value={childId}
            onChange={e => setSelectedChildId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Vandaag stat-kaarten */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Tokens verdiend vandaag"
          value={`⭐ ${today.tokensEarned}`}
          sub={`Totaal: ${today.tokenBalance} tokens`}
          accent
        />
        <StatCard
          label="Taken"
          value={`${today.tasksCompleted} / ${today.tasksTotal}`}
          sub={today.tasksTotal > 0
            ? today.tasksCompleted === today.tasksTotal ? '🎉 Alles klaar!' : `Nog ${today.tasksTotal - today.tasksCompleted} te gaan`
            : 'Geen taken gepland'}
        />
        <StatCard
          label="Emotie check-in"
          value={today.emotion ? `${today.emotion.icon} ${today.emotion.label}` : '—'}
          sub={today.emotion ? 'Vandaag' : 'Nog niet ingevuld'}
        />
        <StatCard
          label="Oefensessies"
          value={String(today.exerciseSessions)}
          sub={today.exerciseSessions === 0 ? 'Geen sessies vandaag' : `Nauwkeurigheid: ${charts.exerciseAccuracy.percentage ?? '—'}%`}
        />
      </div>

      {/* Grafieken */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token trend */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-display font-semibold text-ink text-base mb-4">Tokens — afgelopen 7 dagen</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={charts.tokenTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
                cursor={{ fill: 'var(--bg-primary)' }}
              />
              <Bar dataKey="tokens" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Emotie verdeling */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-display font-semibold text-ink text-base mb-4">Emoties — deze week</h3>
          {charts.emotions.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-ink-muted text-sm">
              Nog geen check-ins deze week
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={charts.emotions}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {charts.emotions.map((entry: any) => (
                    <Cell key={entry.level} fill={EMOTION_COLORS[entry.level] ?? CHART_COLORS.muted} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Oefennauwkeurigheid balk */}
      {charts.exerciseAccuracy.total > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink text-base">Oefennauwkeurigheid</h3>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>
              {charts.exerciseAccuracy.percentage}%
            </span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 bg-surface">
            <div
              className="transition-all duration-700"
              style={{
                width: `${charts.exerciseAccuracy.percentage}%`,
                background: 'var(--accent-success)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-ink-muted">
            <span>✓ {charts.exerciseAccuracy.correct} correct</span>
            <span>{charts.exerciseAccuracy.wrong} fouten</span>
          </div>
        </div>
      )}

      {/* Dagelijkse tip */}
      {childId && <DailyTipPanel childId={childId} />}

      {/* Weekrapport */}
      {childId && <WeekReportPanel childId={childId} />}

      {/* Activiteitsfeed */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-display font-semibold text-ink text-base mb-4">Recente activiteit</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">Nog geen activiteiten deze week</p>
        ) : (
          <div className="space-y-3">
            {feed.slice(0, 10).map((item: any) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">{item.text}</p>
                  <p className="text-xs text-ink-muted">
                    {format(new Date(item.time), 'EEEE d MMM, HH:mm', { locale: nl })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
