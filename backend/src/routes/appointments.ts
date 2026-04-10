/**
 * Afspraken — terugkerende en eenmalige afspraken per kind
 * Worden getoond in de dagplanning van het kind
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
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
}
