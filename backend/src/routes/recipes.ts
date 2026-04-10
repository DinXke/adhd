/**
 * Recepten — stap-voor-stap kookmodus voor kinderen
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function recipeRoutes(fastify: FastifyInstance) {

  // ── GET /api/recipes/:childId ─────────────────────────────────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request) => {
    const { childId } = request.params as { childId: string }
    const recipes = await prisma.recipe.findMany({
      where: { childId, isActive: true },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return { recipes }
  })

  // ── POST /api/recipes/:childId ────────────────────────────────
  fastify.post('/:childId', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { title, icon, description, duration, difficulty, steps } = request.body as {
      title: string
      icon?: string
      description?: string
      duration?: number
      difficulty?: number
      steps: { title: string; description?: string; duration?: number; tip?: string }[]
    }

    if (!title || !steps?.length) {
      return reply.status(400).send({ error: 'Titel en minstens 1 stap zijn verplicht' })
    }

    const recipe = await prisma.recipe.create({
      data: {
        childId,
        title,
        icon: icon ?? '🍳',
        description,
        duration,
        difficulty: difficulty ?? 1,
        steps: {
          create: steps.map((s, i) => ({
            sortOrder: i,
            title: s.title,
            description: s.description,
            duration: s.duration,
            tip: s.tip,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    })

    return reply.status(201).send({ recipe })
  })

  // ── PUT /api/recipes/:id ──────────────────────────────────────
  fastify.put('/:childId/recipes/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { childId: string; id: string }
    const { title, icon, description, duration, difficulty, steps } = request.body as {
      title?: string
      icon?: string
      description?: string
      duration?: number
      difficulty?: number
      steps?: { title: string; description?: string; duration?: number; tip?: string }[]
    }

    // Update basis-info
    await prisma.recipe.update({
      where: { id },
      data: { title, icon, description, duration, difficulty },
    })

    // Vervang stappen als meegestuurd
    if (steps) {
      await prisma.recipeStep.deleteMany({ where: { recipeId: id } })
      await prisma.recipeStep.createMany({
        data: steps.map((s, i) => ({
          recipeId: id,
          sortOrder: i,
          title: s.title,
          description: s.description ?? null,
          duration: s.duration ?? null,
          tip: s.tip ?? null,
        })),
      })
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    })

    return { recipe }
  })

  // ── DELETE /api/recipes/:childId/recipes/:id ──────────────────
  fastify.delete('/:childId/recipes/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { childId: string; id: string }
    await prisma.recipe.update({ where: { id }, data: { isActive: false } })
    return reply.status(204).send()
  })

  // ── POST /api/recipes/play/:id — registreer speelronde ────────
  fastify.post('/play/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string }
    await prisma.recipe.update({ where: { id }, data: { playCount: { increment: 1 } } })
    return { ok: true }
  })
}
