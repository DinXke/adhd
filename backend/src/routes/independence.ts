/**
 * Zelfstandigheidschecklist — leeftijdsgebonden vaardigheden per kind.
 */
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireParent } from '../middleware/auth'

const prisma = new PrismaClient()

// Standaard taken per categorie en leeftijdsgroep
const DEFAULT_TASKS = [
  // Thuis — jong (5-8)
  { title: 'Tanden poetsen', icon: '🦷', category: 'zelfredzaamheid', frequency: 'daily', minAge: 5, maxAge: 12 },
  { title: 'Handen wassen voor het eten', icon: '🧼', category: 'zelfredzaamheid', frequency: 'daily', minAge: 5, maxAge: 10 },
  { title: 'Slaapkamer opruimen', icon: '🛏️', category: 'thuis', frequency: 'daily', minAge: 6, maxAge: 14 },
  { title: 'Schooltas inpakken', icon: '🎒', category: 'school', frequency: 'daily', minAge: 6, maxAge: 12 },
  { title: 'Aankleden zonder hulp', icon: '👕', category: 'zelfredzaamheid', frequency: 'daily', minAge: 6, maxAge: 9 },
  // School — middel (8-12)
  { title: 'Agenda bijhouden', icon: '📓', category: 'school', frequency: 'daily', minAge: 8, maxAge: 14 },
  { title: 'Huiswerk zelf plannen', icon: '📅', category: 'school', frequency: 'weekly', minAge: 9, maxAge: 14 },
  { title: 'Rapport laten tekenen', icon: '✍️', category: 'school', frequency: 'milestone', minAge: 8, maxAge: 14 },
  // Thuis — ouder (10-14)
  { title: 'Zelf wekker zetten', icon: '⏰', category: 'zelfredzaamheid', frequency: 'daily', minAge: 9, maxAge: 14 },
  { title: 'Tafel dekken of afruimen', icon: '🍽️', category: 'thuis', frequency: 'daily', minAge: 7, maxAge: 14 },
  { title: 'Vuilnisbak buiten zetten', icon: '🗑️', category: 'thuis', frequency: 'weekly', minAge: 10, maxAge: 14 },
  // Sociaal
  { title: 'Groeten bij binnenkomst', icon: '👋', category: 'sociaal', frequency: 'daily', minAge: 5, maxAge: 10 },
  { title: 'Afspraken zelf regelen', icon: '📱', category: 'sociaal', frequency: 'milestone', minAge: 11, maxAge: 14 },
]

export async function independenceRoutes(fastify: FastifyInstance) {
  // ── GET /api/independence/:childId — Taken voor dit kind ──────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { childId } = request.params as { childId: string }
    const { date } = request.query as { date?: string }

    // Toegangscontrole
    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }
    if (user.role === 'parent') {
      const link = await prisma.parentChild.findFirst({ where: { parentId: user.sub, childId } })
      if (!link) return reply.status(403).send({ error: 'Geen toegang' })
    }

    const targetDate = date ? new Date(date) : new Date()
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

    const tasks = await prisma.independenceTask.findMany({
      where: { childId, isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: {
        completions: {
          where: {
            childId,
            completedAt: { gte: weekStart, lt: dayEnd },
          },
          orderBy: { completedAt: 'desc' },
        },
      },
    })

    // Markeer welke vandaag al gedaan zijn
    const result = tasks.map(task => {
      const todayCompletions = task.completions.filter(c =>
        c.completedAt >= dayStart && c.completedAt < dayEnd
      )
      const weekCompletions = task.completions.filter(c =>
        c.completedAt >= weekStart && c.completedAt < dayEnd
      )
      return {
        ...task,
        completedToday: todayCompletions.length > 0,
        completedThisWeek: weekCompletions.length > 0,
        lastCompletedAt: task.completions[0]?.completedAt ?? null,
        weekCount: weekCompletions.length,
      }
    })

    return { tasks: result }
  })

  // ── POST /api/independence/:childId — Nieuwe taak aanmaken ───
  fastify.post('/:childId', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const body = request.body as {
      title: string; icon?: string; category?: string;
      frequency?: string; minAge?: number; maxAge?: number; description?: string
    }

    const task = await prisma.independenceTask.create({
      data: {
        childId,
        title: body.title,
        icon: body.icon ?? '✅',
        category: body.category ?? 'thuis',
        frequency: body.frequency ?? 'daily',
        minAge: body.minAge,
        maxAge: body.maxAge,
        description: body.description,
      },
    })
    return { task }
  })

  // ── POST /api/independence/:childId/seed — Standaardtaken toevoegen
  fastify.post('/:childId/seed', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { age } = request.body as { age?: number }

    const child = await prisma.user.findUnique({ where: { id: childId }, select: { dateOfBirth: true } })
    const childAge = age ?? (child?.dateOfBirth
      ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null)

    const existing = await prisma.independenceTask.count({ where: { childId } })
    if (existing > 0) return reply.status(409).send({ error: 'Kind heeft al taken. Voeg ze handmatig toe.' })

    const applicableTasks = DEFAULT_TASKS.filter(t =>
      !childAge || (
        (t.minAge == null || childAge >= t.minAge) &&
        (t.maxAge == null || childAge <= t.maxAge)
      )
    )

    await prisma.independenceTask.createMany({
      data: applicableTasks.map((t, i) => ({ ...t, childId, sortOrder: i })),
    })

    return { created: applicableTasks.length }
  })

  // ── PUT /api/independence/tasks/:id — Taak bewerken ──────────
  fastify.put('/tasks/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { title?: string; icon?: string; category?: string; frequency?: string; isActive?: boolean }

    const task = await prisma.independenceTask.update({
      where: { id },
      data: body,
    })
    return { task }
  })

  // ── DELETE /api/independence/tasks/:id — Taak verwijderen ─────
  fastify.delete('/tasks/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.independenceTask.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  })

  // ── POST /api/independence/tasks/:id/complete — Afvinken ──────
  fastify.post('/tasks/:id/complete', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as { id: string }
    const { note } = request.body as { note?: string }

    const task = await prisma.independenceTask.findUnique({ where: { id } })
    if (!task) return reply.status(404).send({ error: 'Taak niet gevonden' })

    // Controleer dat kind zichzelf aanvinkt of dat ouder het doet
    if (user.role === 'child' && user.sub !== task.childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const childId = user.role === 'child' ? user.sub : task.childId
    const completion = await prisma.independenceCompletion.create({
      data: { taskId: id, childId, note },
    })

    // Token toekennen als er een config bestaat
    let tokensAwarded = 0
    const tokenConfig = await prisma.tokenConfig.findFirst({
      where: { childId, sourceType: 'task', enabled: true },
    })
    if (tokenConfig && tokenConfig.tokensPerCompletion > 0) {
      await prisma.tokenTransaction.create({
        data: {
          childId,
          amount: tokenConfig.tokensPerCompletion,
          type: 'earned',
          sourceType: 'task',
          sourceId: id,
          note: `Vaardigheid: ${task.title}`,
        },
      })
      tokensAwarded = tokenConfig.tokensPerCompletion
    }

    return { completion, tokensAwarded }
  })

  // ── GET /api/independence/:childId/history — Afgelopen 30 dagen
  fastify.get('/:childId/history', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const completions = await prisma.independenceCompletion.findMany({
      where: { childId, completedAt: { gte: thirtyDaysAgo } },
      include: { task: { select: { title: true, icon: true, category: true } } },
      orderBy: { completedAt: 'desc' },
    })

    return { completions }
  })
}
