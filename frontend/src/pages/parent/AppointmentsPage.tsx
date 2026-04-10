/**
 * Afspraken & Kalender — ouder beheert terugkerende en eenmalige afspraken
 * Worden zichtbaar in de dagplanning van het kind
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMyChildren } from '../../lib/queries'
import { api } from '../../lib/api'

// ── Iconen per type afspraak ──────────────────────────────────
const APPOINTMENT_ICONS = [
  // Therapie & zorg
  { icon: '🗣️', label: 'Logo' },
  { icon: '🦺', label: 'Kine' },
  { icon: '🧠', label: 'Psy' },
  { icon: '🩺', label: 'Dokter' },
  { icon: '🦷', label: 'Tandarts' },
  { icon: '👁️', label: 'Oogarts' },
  { icon: '👂', label: 'Audioloog' },
  { icon: '💊', label: 'Apotheek' },
  { icon: '🏥', label: 'Ziekenhuis' },
  // Sport & vrije tijd
  { icon: '🏊', label: 'Zwemmen' },
  { icon: '💃', label: 'Dans' },
  { icon: '⚽', label: 'Voetbal' },
  { icon: '🎾', label: 'Tennis' },
  { icon: '🤸', label: 'Turnen' },
  { icon: '🎨', label: 'Tekenen' },
  { icon: '🎵', label: 'Muziek' },
  { icon: '🎸', label: 'Gitaar' },
  { icon: '🎹', label: 'Piano' },
  { icon: '🤼', label: 'Judo' },
  { icon: '🏄', label: 'Paardrijden' },
  // School & opvang
  { icon: '🏫', label: 'School' },
  { icon: '🏠', label: 'Opvang' },
  { icon: '📚', label: 'Bijles' },
  { icon: '🔬', label: 'Studie' },
  // Familie & sociaal
  { icon: '👨‍👩‍👧', label: 'Familie' },
  { icon: '🎂', label: 'Verjaardag' },
  { icon: '🛒', label: 'Winkelen' },
  { icon: '🌳', label: 'Buiten' },
  // Overig
  { icon: '✂️', label: 'Kapper' },
  { icon: '📅', label: 'Afspraak' },
  { icon: '🚗', label: 'Rijden' },
  { icon: '✈️', label: 'Reis' },
]

const APPOINTMENT_COLORS = [
  '#7BAFA3', '#E8734A', '#5B8C5A', '#9B7CC8',
  '#D4973B', '#4A9BC4', '#C45D4C', '#8CA06B',
]

// ── Google Calendar link builder ──────────────────────────────
function googleCalendarUrl(ap: Appointment): string {
  // For recurring: next occurrence; for one-time: the date
  let dateStr: string
  if (!ap.isRecurring && ap.date) {
    dateStr = ap.date.slice(0, 10)
  } else {
    // Find next occurrence of this weekday
    const now = new Date()
    const target = ap.dayOfWeek ?? 0
    let diff = target - now.getDay()
    if (diff <= 0) diff += 7
    const next = new Date(now)
    next.setDate(now.getDate() + diff)
    dateStr = next.toISOString().slice(0, 10)
  }
  const [h, m] = ap.startTime.split(':')
  const startDt = `${dateStr.replace(/-/g, '')}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`
  const endMinutes = (parseInt(h) * 60 + parseInt(m)) + ap.durationMinutes
  const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0')
  const endM = (endMinutes % 60).toString().padStart(2, '0')
  const endDt = `${dateStr.replace(/-/g, '')}T${endH}${endM}00`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ap.title,
    dates: `${startDt}/${endDt}`,
    ...(ap.location ? { location: ap.location } : {}),
    ...(ap.notes ? { details: ap.notes } : {}),
    ...(ap.isRecurring ? { recur: `RRULE:FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][ap.dayOfWeek ?? 0]}` } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadIcs(ap: Appointment) {
  let dateStr: string
  if (!ap.isRecurring && ap.date) {
    dateStr = ap.date.slice(0, 10)
  } else {
    const now = new Date()
    const target = ap.dayOfWeek ?? 0
    let diff = target - now.getDay()
    if (diff <= 0) diff += 7
    const next = new Date(now)
    next.setDate(now.getDate() + diff)
    dateStr = next.toISOString().slice(0, 10)
  }
  const [h, m] = ap.startTime.split(':')
  const startDt = `${dateStr.replace(/-/g, '')}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`
  const endMinutes = (parseInt(h) * 60 + parseInt(m)) + ap.durationMinutes
  const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0')
  const endM = (endMinutes % 60).toString().padStart(2, '0')
  const endDt = `${dateStr.replace(/-/g, '')}T${endH}${endM}00`
  const rrule = ap.isRecurring ? `\nRRULE:FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][ap.dayOfWeek ?? 0]}` : ''
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GRIP//Afspraken//NL',
    'BEGIN:VEVENT',
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:${ap.title}`,
    ap.location ? `LOCATION:${ap.location}` : '',
    ap.notes ? `DESCRIPTION:${ap.notes}` : '',
    rrule,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ap.title.replace(/\s+/g, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

const DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const DAYS_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

interface Appointment {
  id: string
  title: string
  icon: string
  color: string
  location?: string | null
  notes?: string | null
  startTime: string
  durationMinutes: number
  isRecurring: boolean
  dayOfWeek?: number | null
  date?: string | null
  showInChildView: boolean
  isActive: boolean
}

const defaultForm = () => ({
  title: '',
  icon: '📅',
  color: '#7BAFA3',
  location: '',
  notes: '',
  startTime: '14:00',
  durationMinutes: 60,
  isRecurring: true,
  dayOfWeek: 1,
  date: new Date().toISOString().slice(0, 10),
  showInChildView: true,
})

export function AppointmentsPage() {
  const qc = useQueryClient()
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm())
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data } = useQuery({
    queryKey: ['appointments', childId],
    queryFn: () => api.get<{ appointments: Appointment[] }>(`/api/appointments/${childId}`),
    enabled: !!childId,
  })

  const appointments = data?.appointments ?? []

  const createMutation = useMutation({
    mutationFn: () => api.post(`/api/appointments/${childId}`, {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      dayOfWeek: form.isRecurring ? Number(form.dayOfWeek) : undefined,
      date: form.isRecurring ? undefined : form.date,
      location: form.location || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', childId] })
      setShowForm(false)
      setForm(defaultForm())
    },
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/appointments/${childId}/${id}`, {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      dayOfWeek: form.isRecurring ? Number(form.dayOfWeek) : undefined,
      date: form.isRecurring ? undefined : form.date,
      location: form.location || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', childId] })
      setShowForm(false)
      setEditingId(null)
      setForm(defaultForm())
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/appointments/${childId}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', childId] }),
  })

  function startEdit(ap: Appointment) {
    setForm({
      title: ap.title,
      icon: ap.icon,
      color: ap.color,
      location: ap.location ?? '',
      notes: ap.notes ?? '',
      startTime: ap.startTime,
      durationMinutes: ap.durationMinutes,
      isRecurring: ap.isRecurring,
      dayOfWeek: ap.dayOfWeek ?? 1,
      date: ap.date ? ap.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      showInChildView: ap.showInChildView,
    })
    setEditingId(ap.id)
    setShowForm(true)
  }

  // Kalenderweergave voor huidige maand
  const { year, month } = selectedMonth
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  // Welke eenmalige afspraken vallen in deze maand?
  const oneTimeThisMonth = appointments.filter(ap => {
    if (ap.isRecurring || !ap.date) return false
    const d = new Date(ap.date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  // Kleur-mapping voor recurring per dag
  const recurringByDow: Record<number, Appointment[]> = {}
  appointments.filter(ap => ap.isRecurring && ap.dayOfWeek != null).forEach(ap => {
    const dow = ap.dayOfWeek!
    if (!recurringByDow[dow]) recurringByDow[dow] = []
    recurringByDow[dow].push(ap)
  })

  function getAppointmentsForDay(day: number): Appointment[] {
    const date = new Date(year, month, day)
    const dow = date.getDay()
    const dateStr = date.toISOString().slice(0, 10)
    return [
      ...(recurringByDow[dow] ?? []),
      ...oneTimeThisMonth.filter(ap => ap.date?.slice(0, 10) === dateStr),
    ]
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-border bg-card text-ink text-sm focus:border-accent focus:outline-none"

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Afspraken</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Kalender voor {children.find(c => c.id === childId)?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {children.length > 1 && (
            <select value={childId} onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm">
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            onClick={() => { setEditingId(null); setForm(defaultForm()); setShowForm(!showForm) }}
            className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium"
          >
            + Afspraak
          </button>
        </div>
      </div>

      {/* Formulier */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-ink">
                {editingId ? 'Afspraak wijzigen' : 'Nieuwe afspraak'}
              </h2>

              {/* Icoon + titel */}
              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Type afspraak</p>
                <div className="grid grid-cols-8 gap-1.5 mb-3">
                  {APPOINTMENT_ICONS.map(({ icon, label }) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      title={label}
                      className={`text-xl w-10 h-10 rounded-xl transition-all ${
                        form.icon === icon
                          ? 'border-2 border-accent bg-accent/10'
                          : 'border border-border bg-surface hover:bg-card'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Naam van de afspraak (bv. Logo bij juf An)"
                className={inputCls}
              />

              {/* Kleur */}
              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Kleur</p>
                <div className="flex gap-2">
                  {APPOINTMENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: form.color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: 2,
                        transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Terugkerend / Eenmalig */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isRecurring: true }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.isRecurring ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'
                  }`}
                >
                  🔄 Wekelijks
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isRecurring: false }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    !form.isRecurring ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'
                  }`}
                >
                  📆 Eenmalig
                </button>
              </div>

              {/* Dag of datum */}
              {form.isRecurring ? (
                <div>
                  <p className="text-xs font-medium text-ink-muted mb-2">Dag van de week</p>
                  <div className="flex gap-1.5">
                    {DAYS.map((day, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, dayOfWeek: i }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                          form.dayOfWeek === i ? 'bg-accent text-white' : 'bg-surface text-ink-muted border border-border'
                        }`}
                      >
                        {DAYS_SHORT[i]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-ink-muted mb-1">Datum</p>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Tijd + duur */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-ink-muted mb-1">Starttijd</p>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-muted mb-1">Duur (minuten)</p>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                    min={5} max={480} step={5}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Locatie + notities */}
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Locatie (optioneel, bv. CLB-centrum)"
                className={inputCls}
              />
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notitie (optioneel)"
                className={inputCls}
              />

              {/* Zichtbaar voor kind */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, showInChildView: !f.showInChildView }))}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${
                    form.showInChildView ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <motion.div
                    animate={{ x: form.showInChildView ? 16 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                    style={{ left: 0 }}
                  />
                </div>
                <span className="text-sm font-medium text-ink">Tonen in dagplanning kind</span>
              </label>

              {/* Knoppen */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm()) }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm text-ink-muted"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => editingId ? updateMutation.mutate(editingId) : createMutation.mutate()}
                  disabled={!form.title || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Opslaan...'
                    : editingId ? 'Wijzigen' : 'Opslaan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maandkalender */}
      <div className="card p-4 mb-6">
        {/* Maand navigatie */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedMonth(m => {
              const d = new Date(m.year, m.month - 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="font-display font-bold text-ink">
            {['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'][month]} {year}
          </h2>
          <button
            onClick={() => setSelectedMonth(m => {
              const d = new Date(m.year, m.month + 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Dag-headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-medium text-ink-muted py-1">{d}</div>
          ))}
        </div>

        {/* Kalender grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayApps = getAppointmentsForDay(day)
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
            return (
              <div
                key={day}
                className="relative rounded-lg p-1 min-h-[48px] flex flex-col items-center"
                style={{ background: isToday ? 'rgba(193,122,58,0.08)' : undefined }}
              >
                <span
                  className="text-xs font-medium mb-0.5"
                  style={{
                    color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {dayApps.slice(0, 3).map(ap => (
                    <span
                      key={ap.id}
                      title={`${ap.icon} ${ap.title} ${ap.startTime}`}
                      className="text-[10px] leading-none cursor-pointer"
                    >
                      {ap.icon}
                    </span>
                  ))}
                  {dayApps.length > 3 && (
                    <span className="text-[8px] text-ink-muted">+{dayApps.length - 3}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lijst: terugkerende afspraken */}
      {appointments.filter(ap => ap.isRecurring).length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-ink text-base mb-3">Wekelijks terugkerende afspraken</h2>
          <div className="space-y-2">
            {appointments
              .filter(ap => ap.isRecurring)
              .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0))
              .map(ap => (
              <AppointmentRow key={ap.id} ap={ap} onEdit={() => startEdit(ap)} onDelete={() => deleteMutation.mutate(ap.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Lijst: eenmalige afspraken */}
      {appointments.filter(ap => !ap.isRecurring).length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-ink text-base mb-3">Eenmalige afspraken</h2>
          <div className="space-y-2">
            {appointments
              .filter(ap => !ap.isRecurring)
              .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
              .map(ap => (
              <AppointmentRow key={ap.id} ap={ap} onEdit={() => startEdit(ap)} onDelete={() => deleteMutation.mutate(ap.id)} />
            ))}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <div className="text-5xl mb-3">📅</div>
          <p className="font-semibold text-ink">Nog geen afspraken</p>
          <p className="text-sm text-ink-muted mt-1">
            Voeg terugkerende afspraken toe (logo, kine, zwemmen...) of eenmalige afspraken (dokter, tandarts...).
          </p>
        </div>
      )}
    </div>
  )
}

function AppointmentRow({ ap, onEdit, onDelete }: {
  ap: Appointment
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: ap.color + '20', border: `1.5px solid ${ap.color}40` }}
      >
        {ap.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm">{ap.title}</p>
        <p className="text-xs text-ink-muted">
          {ap.isRecurring
            ? `Elke ${['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'][ap.dayOfWeek ?? 0]}`
            : ap.date ? new Date(ap.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          {' · '}{ap.startTime}
          {ap.durationMinutes && ` · ${ap.durationMinutes} min`}
          {ap.location && ` · ${ap.location}`}
        </p>
      </div>
      {!ap.showInChildView && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-ink-muted flex-shrink-0">verborgen</span>
      )}
      <div className="flex gap-1 flex-shrink-0">
        <a href={googleCalendarUrl(ap)} target="_blank" rel="noopener noreferrer"
          title="Toevoegen aan Google Calendar"
          className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-blue-400 hover:text-blue-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 2v4M16 2v4"/>
          </svg>
        </a>
        <button onClick={() => downloadIcs(ap)} title="Downloaden als .ics"
          className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button onClick={onEdit}
          className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default AppointmentsPage
