/**
 * Afspraken — terugkerende en eenmalige afspraken per kind
 * Worden getoond in de dagplanning van het kind
 */
import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { requireAuth, requireParent } from '../middleware/auth'

export async function appointmentRoutes(fastify: FastifyInstance) {

  // ── GET /api/appointments/:childId — Alle afspraken ──────────
  fastify.get('/:childId', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }

    const appointments = await prisma.appointment.findMany({
      where: { childId, isActive: true },
      orderBy: [{ isRecurring: 'desc' }, { dayOfWeek: 'asc' }, { date: 'asc' }, { startTime: 'asc' }],
    })

    return { appointments }
  })

  // ── GET /api/appointments/:childId/today — Afspraken vandaag ─
  fastify.get('/:childId/today', { preHandler: requireAuth }, async (request) => {
    const { childId } = request.params as { childId: string }
    const now = new Date()
    const todayDow = now.getDay()

    // Start en einde van vandaag
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        childId,
        isActive: true,
        showInChildView: true,
        OR: [
          // Terugkerende op de dag van vandaag
          { isRecurring: true, dayOfWeek: todayDow },
          // Eenmalig vandaag
          { isRecurring: false, date: { gte: todayStart, lte: todayEnd } },
        ],
      },
      orderBy: { startTime: 'asc' },
    })

    return { appointments }
  })

  // ── POST /api/appointments/:childId — Aanmaken ───────────────
  fastify.post('/:childId', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const {
      title, icon, color, location, notes,
      startTime, durationMinutes,
      isRecurring, dayOfWeek, date,
      showInChildView,
    } = request.body as {
      title: string
      icon?: string
      color?: string
      location?: string
      notes?: string
      startTime: string
      durationMinutes?: number
      isRecurring?: boolean
      dayOfWeek?: number
      date?: string
      showInChildView?: boolean
    }

    if (!title || !startTime) {
      return reply.status(400).send({ error: 'title en startTime zijn verplicht' })
    }

    if (isRecurring && dayOfWeek === undefined) {
      return reply.status(400).send({ error: 'dayOfWeek is verplicht bij terugkerende afspraken' })
    }

    if (!isRecurring && !date) {
      return reply.status(400).send({ error: 'date is verplicht bij eenmalige afspraken' })
    }

    const appointment = await prisma.appointment.create({
      data: {
        childId,
        createdById: (request as any).user.sub,
        title,
        icon: icon ?? '📅',
        color: color ?? '#7BAFA3',
        location: location || null,
        notes: notes || null,
        startTime,
        durationMinutes: durationMinutes ?? 60,
        isRecurring: isRecurring ?? false,
        dayOfWeek: isRecurring ? dayOfWeek : null,
        date: !isRecurring && date ? new Date(date) : null,
        showInChildView: showInChildView ?? true,
      },
    })

    return { appointment }
  })

  // ── PUT /api/appointments/:childId/:id — Bijwerken ───────────
  fastify.put('/:childId/:id', { preHandler: requireParent }, async (request, reply) => {
    const { childId, id } = request.params as { childId: string; id: string }
    const body = request.body as any

    const existing = await prisma.appointment.findFirst({ where: { id, childId } })
    if (!existing) return reply.status(404).send({ error: 'Afspraak niet gevonden' })

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        icon: body.icon ?? existing.icon,
        color: body.color ?? existing.color,
        location: body.location !== undefined ? body.location : existing.location,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        startTime: body.startTime ?? existing.startTime,
        durationMinutes: body.durationMinutes ?? existing.durationMinutes,
        isRecurring: body.isRecurring !== undefined ? body.isRecurring : existing.isRecurring,
        dayOfWeek: body.dayOfWeek !== undefined ? body.dayOfWeek : existing.dayOfWeek,
        date: body.date !== undefined ? (body.date ? new Date(body.date) : null) : existing.date,
        showInChildView: body.showInChildView !== undefined ? body.showInChildView : existing.showInChildView,
      },
    })

    return { appointment }
  })

  // ── DELETE /api/appointments/:childId/:id — Verwijderen ──────
  fastify.delete('/:childId/:id', { preHandler: requireParent }, async (request, reply) => {
    const { childId, id } = request.params as { childId: string; id: string }

    const existing = await prisma.appointment.findFirst({ where: { id, childId } })
    if (!existing) return reply.status(404).send({ error: 'Afspraak niet gevonden' })

    await prisma.appointment.delete({ where: { id } })
    return { ok: true }
  })

  // ── POST /api/appointments/:childId/feed-token — Genereer ICS feed token ──
  fastify.post('/:childId/feed-token', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const token = crypto.randomBytes(32).toString('hex')
    await redis.set(`ics-feed:${childId}`, token)
    return { token }
  })

  // ── GET /api/appointments/:childId/feed.ics — Subscribable ICS calendar feed ──
  // Public endpoint authenticated by secret token query param (for calendar app subscriptions)
  fastify.get('/:childId/feed.ics', async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { token } = request.query as { token?: string }

    if (!token) {
      return reply.status(401).send({ error: 'Token vereist' })
    }

    const storedToken = await redis.get(`ics-feed:${childId}`)
    if (!storedToken || storedToken !== token) {
      return reply.status(403).send({ error: 'Ongeldig token' })
    }

    const child = await prisma.user.findUnique({ where: { id: childId }, select: { name: true } })
    if (!child) {
      return reply.status(404).send({ error: 'Kind niet gevonden' })
    }

    const appointments = await prisma.appointment.findMany({
      where: { childId, isActive: true },
      orderBy: [{ startTime: 'asc' }],
    })

    const DAY_MAP: Record<number, string> = {
      0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
    }

    const vevents = appointments.map((appt) => {
      const uid = `${appt.id}@grip`
      const [startH, startM] = appt.startTime.split(':').map(Number)
      const endTotalMin = startH * 60 + startM + appt.durationMinutes
      const endH = Math.floor(endTotalMin / 60)
      const endM = endTotalMin % 60
      const pad = (n: number) => String(n).padStart(2, '0')

      const summary = escapeIcalText(appt.title)
      const lines: string[] = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `SUMMARY:${summary}`,
        `DURATION:PT${appt.durationMinutes}M`,
      ]

      if (appt.location) {
        lines.push(`LOCATION:${escapeIcalText(appt.location)}`)
      }
      if (appt.notes) {
        lines.push(`DESCRIPTION:${escapeIcalText(appt.notes)}`)
      }

      if (appt.isRecurring && appt.dayOfWeek !== null) {
        // Recurring weekly event — use a fixed anchor date (a Monday in the past)
        // and RRULE for weekly recurrence on the specified day
        const anchor = getAnchorDateForDow(appt.dayOfWeek)
        const dtstart = `${formatIcalDate(anchor)}T${pad(startH)}${pad(startM)}00`
        const dtend = `${formatIcalDate(anchor)}T${pad(endH)}${pad(endM)}00`
        lines.push(`DTSTART:${dtstart}`)
        lines.push(`DTEND:${dtend}`)
        lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${DAY_MAP[appt.dayOfWeek]}`)
      } else if (appt.date) {
        // One-time event
        const d = new Date(appt.date)
        const dtstart = `${formatIcalDate(d)}T${pad(startH)}${pad(startM)}00`
        const dtend = `${formatIcalDate(d)}T${pad(endH)}${pad(endM)}00`
        lines.push(`DTSTART:${dtstart}`)
        lines.push(`DTEND:${dtend}`)
      }

      lines.push(
        `DTSTAMP:${formatIcalTimestamp(new Date())}`,
        `CREATED:${formatIcalTimestamp(appt.createdAt)}`,
        `LAST-MODIFIED:${formatIcalTimestamp(appt.updatedAt)}`,
        'END:VEVENT',
      )

      return lines.join('\r\n')
    })

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//GRIP//Afspraken ${child.name}//NL`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${child.name} — Afspraken`,
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n')

    reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .header('Content-Disposition', `inline; filename="${child.name}-afspraken.ics"`)
      .send(ical)
  })
}

// ── ICS helpers ──────────────────────────────────────────────────

function escapeIcalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function formatIcalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function formatIcalTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Return a recent date that falls on the given day-of-week (0=Sun..6=Sat) */
function getAnchorDateForDow(dow: number): Date {
  const d = new Date()
  const currentDow = d.getDay()
  const diff = dow - currentDow
  d.setDate(d.getDate() + diff - 7) // Go one week back to ensure it's in the past
  d.setHours(0, 0, 0, 0)
  return d
}
