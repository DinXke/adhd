import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function scheduleRoutes(fastify: FastifyInstance) {
  // ── GET /api/schedules/today/:childId — Dagschema van vandaag ─
  fastify.get('/today/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    // Kind mag alleen eigen schema zien; ouder/admin alles
    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const today = new Date()
    const dayOfWeek = today.getDay() // 0=zondag

    const schedule = await prisma.schedule.findFirst({
      where: { userId: childId, dayOfWeek, isActive: true },
      include: {
        activities: {
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { startTime: 'asc' },
        },
      },
    })

    // Voeg "huidige activiteit" info toe
    const nowStr = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`

    const activities = (schedule?.activities ?? []).map((act, i, arr) => {
      const nextStart = arr[i + 1]?.startTime
      const isCurrent = act.startTime <= nowStr && (!nextStart || nextStart > nowStr)
      const isPast = nextStart ? nextStart <= nowStr : act.startTime < nowStr
      return { ...act, isCurrent, isPast }
    })

    return { schedule, activities, dayOfWeek, date: today.toISOString() }
  })

  // ── GET /api/schedules/:childId — Alle schema's van een kind ─
  fastify.get('/:childId', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const schedules = await prisma.schedule.findMany({
      where: { userId: childId },
      include: {
        activities: {
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    })
    return { schedules }
  })

  // ── POST /api/schedules — Nieuw schema aanmaken ───────────
  fastify.post('/', { preHandler: requireParent }, async (request, reply) => {
    const body = request.body as { childId: string; dayOfWeek: number }

    const schedule = await prisma.schedule.upsert({
      where: { userId_dayOfWeek: { userId: body.childId, dayOfWeek: body.dayOfWeek } },
      update: { isActive: true },
      create: { userId: body.childId, dayOfWeek: body.dayOfWeek },
      include: { activities: { include: { steps: true } } },
    })

    await prisma.auditLog.create({
      data: { userId: request.user.sub, action: 'schedule.upsert', entityType: 'schedule', entityId: schedule.id },
    })

    return reply.status(201).send(schedule)
  })

  // ── POST /api/schedules/:scheduleId/activities — Activiteit toevoegen ─
  fastify.post('/:scheduleId/activities', { preHandler: requireParent }, async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string }
    const body = request.body as {
      title: string
      icon: string
      startTime: string
      durationMinutes: number
      color?: string
      notifyBefore?: number[]
      steps?: { title: string; icon?: string }[]
    }

    const activity = await prisma.activity.create({
      data: {
        scheduleId,
        title: body.title,
        icon: body.icon,
        startTime: body.startTime,
        durationMinutes: body.durationMinutes,
        color: body.color ?? '#7BAFA3',
        notifyBefore: body.notifyBefore ?? [5, 1],
        steps: body.steps?.length
          ? { create: body.steps.map((s, i) => ({ title: s.title, icon: s.icon, sortOrder: i })) }
          : undefined,
      },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    })

    return reply.status(201).send(activity)
  })

  // ── PUT /api/schedules/activities/:activityId — Activiteit updaten ─
  fastify.put('/activities/:activityId', { preHandler: requireParent }, async (request) => {
    const { activityId } = request.params as { activityId: string }
    const body = request.body as {
      title?: string
      icon?: string
      startTime?: string
      durationMinutes?: number
      color?: string
      notifyBefore?: number[]
    }

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: body,
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    })

    return activity
  })

  // ── DELETE /api/schedules/activities/:activityId ──────────
  fastify.delete('/activities/:activityId', { preHandler: requireParent }, async (request, reply) => {
    const { activityId } = request.params as { activityId: string }
    await prisma.activity.delete({ where: { id: activityId } })
    return reply.status(204).send()
  })

  // ── POST /api/schedules/activities/:activityId/steps — Stap toevoegen ─
  fastify.post('/activities/:activityId/steps', { preHandler: requireParent }, async (request, reply) => {
    const { activityId } = request.params as { activityId: string }
    const { title, icon } = request.body as { title: string; icon?: string }

    const count = await prisma.activityStep.count({ where: { activityId } })
    const step = await prisma.activityStep.create({
      data: { activityId, title, icon, sortOrder: count },
    })
    return reply.status(201).send(step)
  })

  // ── DELETE /api/schedules/activities/steps/:stepId ────────
  fastify.delete('/activities/steps/:stepId', { preHandler: requireParent }, async (request, reply) => {
    const { stepId } = request.params as { stepId: string }
    await prisma.activityStep.delete({ where: { id: stepId } })
    return reply.status(204).send()
  })
}
