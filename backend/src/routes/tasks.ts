import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function taskRoutes(fastify: FastifyInstance) {
  // ── GET /api/tasks/:childId — Taken voor een kind ─────────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { date } = request.query as { date?: string }
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    const tasks = await prisma.task.findMany({
      where: {
        childId,
        OR: [
          { scheduledFor: { gte: startOfDay, lte: endOfDay } },
          { scheduledFor: null },
        ],
      },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledFor: 'asc' }, { sortOrder: 'asc' }],
    })

    return { tasks }
  })

  // ── POST /api/tasks — Taak aanmaken ───────────────────────
  fastify.post('/', { preHandler: requireParent }, async (request, reply) => {
    const body = request.body as {
      childId: string
      title: string
      description?: string
      icon?: string
      durationMinutes?: number
      scheduledFor?: string
      steps?: { title: string; icon?: string }[]
    }

    const task = await prisma.task.create({
      data: {
        childId: body.childId,
        createdById: request.user.sub,
        title: body.title,
        description: body.description,
        icon: body.icon,
        durationMinutes: body.durationMinutes,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        steps: body.steps?.length
          ? { create: body.steps.map((s, i) => ({ title: s.title, icon: s.icon, sortOrder: i })) }
          : undefined,
      },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: { userId: request.user.sub, action: 'task.create', entityType: 'task', entityId: task.id },
    })

    return reply.status(201).send(task)
  })

  // ── PATCH /api/tasks/:taskId/complete — Taak voltooien ───
  fastify.patch('/:taskId/complete', { preHandler: requireAuth }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { childId: true, completedAt: true },
    })

    if (!task) return reply.status(404).send({ error: 'Taak niet gevonden' })

    const user = request.user
    if (user.role === 'child' && user.sub !== task.childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { completedAt: task.completedAt ? null : new Date() }, // toggle
      include: { steps: true },
    })

    // Token-toekenning bij voltooiing
    if (updated.completedAt) {
      const config = await prisma.tokenConfig.findFirst({
        where: { childId: task.childId, sourceType: 'task', sourceId: taskId, enabled: true },
      })
      if (config) {
        await prisma.tokenTransaction.create({
          data: {
            childId: task.childId,
            amount: config.tokensPerCompletion + (config.bonusTokens ?? 0),
            type: 'earned',
            sourceType: 'task',
            sourceId: taskId,
          },
        })
      }
    }

    return updated
  })

  // ── PATCH /api/tasks/:taskId/steps/:stepId/complete ───────
  fastify.patch('/:taskId/steps/:stepId/complete', { preHandler: requireAuth }, async (request, reply) => {
    const { taskId, stepId } = request.params as { taskId: string; stepId: string }

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { childId: true } })
    if (!task) return reply.status(404).send({ error: 'Taak niet gevonden' })

    const user = request.user
    if (user.role === 'child' && user.sub !== task.childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const step = await prisma.taskStep.findUnique({ where: { id: stepId } })
    if (!step) return reply.status(404).send({ error: 'Stap niet gevonden' })

    const updated = await prisma.taskStep.update({
      where: { id: stepId },
      data: { completedAt: step.completedAt ? null : new Date() },
    })

    // Token-toekenning per stap (indien geconfigureerd)
    if (updated.completedAt) {
      const config = await prisma.tokenConfig.findFirst({
        where: { childId: task.childId, sourceType: 'task_step', sourceId: taskId, enabled: true },
      })
      if (config) {
        await prisma.tokenTransaction.create({
          data: {
            childId: task.childId,
            amount: config.tokensPerCompletion,
            type: 'earned',
            sourceType: 'task_step',
            sourceId: stepId,
          },
        })
      }
    }

    return updated
  })

  // ── PUT /api/tasks/:taskId — Taak updaten ────────────────
  fastify.put('/:taskId', { preHandler: requireParent }, async (request) => {
    const { taskId } = request.params as { taskId: string }
    const body = request.body as {
      title?: string
      description?: string
      icon?: string
      durationMinutes?: number
      scheduledFor?: string | null
    }

    return prisma.task.update({
      where: { id: taskId },
      data: {
        ...body,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : body.scheduledFor,
      },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    })
  })

  // ── DELETE /api/tasks/:taskId ─────────────────────────────
  fastify.delete('/:taskId', { preHandler: requireParent }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string }
    await prisma.task.delete({ where: { id: taskId } })
    return reply.status(204).send()
  })
}
