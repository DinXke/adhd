/**
 * Vakantieperiodes — ouder kan periodes instellen met een alternatief schema
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function vacationRoutes(fastify: FastifyInstance) {

  // ── GET /api/vacations/:childId — Alle vakantieperiodes ──────
  fastify.get('/:childId', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const periods = await prisma.vacationPeriod.findMany({
      where: { childId, isActive: true },
      include: { schedule: { select: { id: true, dayOfWeek: true, label: true } } },
      orderBy: { startDate: 'asc' },
    })
    return { periods }
  })

  // ── GET /api/vacations/:childId/active — Is het vandaag vakantie? ─
  fastify.get('/:childId/active', { preHandler: requireAuth }, async (request) => {
    const { childId } = request.params as { childId: string }
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const active = await prisma.vacationPeriod.findFirst({
      where: {
        childId,
        isActive: true,
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      include: { schedule: { select: { id: true, dayOfWeek: true, label: true } } },
    })

    return { isVacation: !!active, period: active }
  })

  // ── POST /api/vacations/:childId — Nieuwe vakantieperiode ───
  fastify.post('/:childId', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { title, startDate, endDate, scheduleId } = request.body as {
      title: string
      startDate: string
      endDate: string
      scheduleId?: string
    }

    if (!title || !startDate || !endDate) {
      return reply.status(400).send({ error: 'title, startDate en endDate zijn verplicht' })
    }

    const period = await prisma.vacationPeriod.create({
      data: {
        childId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        scheduleId: scheduleId || null,
      },
    })

    return { period }
  })

  // ── PUT /api/vacations/:childId/:id — Bijwerken ─────────────
  fastify.put('/:childId/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any

    const period = await prisma.vacationPeriod.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
        ...(body.endDate ? { endDate: new Date(body.endDate) } : {}),
        ...(body.scheduleId !== undefined ? { scheduleId: body.scheduleId || null } : {}),
      },
    })

    return { period }
  })

  // ── DELETE /api/vacations/:childId/:id — Verwijderen ────────
  fastify.delete('/:childId/:id', { preHandler: requireParent }, async (request) => {
    const { id } = request.params as { id: string }
    await prisma.vacationPeriod.delete({ where: { id } })
    return { ok: true }
  })
}
