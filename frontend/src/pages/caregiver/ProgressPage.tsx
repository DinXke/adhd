/**
 * Voortgangsscherm voor hulpverleners — readonly overzicht van kind-data.
 */
import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardOverview } from '../../lib/queries'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const EMOTION_ICON: Record<string, string> = {
  great: '😄', good: '😊', okay: '😐', sad: '😢', angry: '😤',
}

export function ProgressPage() {
  const { user } = useAuthStore()
  // Hulpverlener ziet altijd het eerste (en typisch enige) kind waartoe ze toegang hebben.
  // In de toekomst kan dit worden uitgebreid met een kindkiezer.
  const [childId] = useState<string | undefined>(undefined)

  const { data, isLoading } = useDashboardOverview(childId)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-ink mb-6">Voortgang</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-surface animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-ink mb-6">Voortgang</h1>
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-ink">Geen data beschikbaar</p>
          <p className="text-sm text-ink-muted mt-1">Je hebt mogelijk geen toegang tot de voortgangsmodule voor dit kind.</p>
        </div>
      </div>
    )
  }

  const { child, today, charts, feed } = data

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Voortgang</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {child.name}{child.age ? ` · ${child.age} jaar` : ''} — readonly overzicht
        </p>
      </div>

      {/* Vandaag */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Tokens vandaag', value: `⭐ ${today.tokensEarned}`, sub: `Totaal: ${today.tokenBalance}` },
          { label: 'Taken', value: `${today.tasksCompleted}/${today.tasksTotal}`, sub: today.tasksCompleted === today.tasksTotal && today.tasksTotal > 0 ? '🎉 Alles klaar!' : undefined },
          { label: 'Emotie', value: today.emotion ? `${today.emotion.icon} ${today.emotion.label}` : '—', sub: 'Vandaag' },
          { label: 'Oefensessies', value: String(today.exerciseSessions), sub: `Nauwkeurigheid: ${charts.exerciseAccuracy.percentage ?? '—'}%` },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-ink-muted mb-1">{card.label}</p>
            <p className="font-display font-bold text-xl text-ink">{card.value}</p>
            {card.sub && <p className="text-xs text-ink-muted mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Token trend */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-ink mb-4">Tokens — afgelopen 7 dagen</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={charts.tokenTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, fontSize: 12 }}
              cursor={{ fill: 'var(--bg-primary)' }}
            />
            <Bar dataKey="tokens" fill="#7BAFA3" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Emotie verdeling */}
      {charts.emotions.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-ink mb-3">Emoties deze week</h3>
          <div className="flex flex-wrap gap-2">
            {charts.emotions.map((e: any) => (
              <div key={e.level} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border">
                <span className="text-lg">{EMOTION_ICON[e.level]}</span>
                <span className="text-sm text-ink font-medium">{e.label}</span>
                <span className="text-xs text-ink-muted">× {e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Oefennauwkeurigheid */}
      {charts.exerciseAccuracy.total > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink">Oefennauwkeurigheid</h3>
            <span className="text-sm font-bold text-green-700">{charts.exerciseAccuracy.percentage}%</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-2.5 bg-surface">
            <div
              className="transition-all duration-700 rounded-full"
              style={{ width: `${charts.exerciseAccuracy.percentage}%`, background: '#5B8C5A' }}
            />
          </div>
          <p className="text-xs text-ink-muted mt-2">{charts.exerciseAccuracy.correct} correct · {charts.exerciseAccuracy.wrong} fouten · {charts.exerciseAccuracy.total} totaal</p>
        </div>
      )}

      {/* Feed */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-ink mb-4">Activiteitsfeed</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-4">Geen activiteiten deze week</p>
        ) : (
          <div className="space-y-3">
            {feed.slice(0, 15).map((item: any) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
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

export default ProgressPage
