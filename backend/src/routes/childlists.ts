/**
 * Kind-lijstjes — kinderen kunnen eigen to-do lijstjes aanmaken en beheren.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function childlistRoutes(fastify: FastifyInstance) {
  // ── GET / — Alle lijstjes van het ingelogde kind ───────────
  fastify.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user

    if (user.role !== 'child') {
      return reply.status(403).send({ error: 'Alleen voor kinderen' })
    }

    const lists = await prisma.childList.findMany({
      where: { childId: user.sub },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return { lists }
  })

  // ── POST / — Nieuw lijstje aanmaken ────────────────────────
  fastify.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user

    if (user.role !== 'child') {
      return reply.status(403).send({ error: 'Alleen voor kinderen' })
    }

    const { title, icon, color } = request.body as {
      title: string
      icon?: string
      color?: string
    }

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Titel is verplicht' })
    }

    const count = await prisma.childList.count({ where: { childId: user.sub } })

    const list = await prisma.childList.create({
      data: {
        childId: user.sub,
        title: title.trim(),
        icon: icon ?? '📝',
        color: color ?? '#7BAFA3',
        sortOrder: count,
      },
      include: { items: true },
    })

    return reply.status(201).send({ list })
  })

  // ── PUT /:id — Lijstje bewerken ────────────────────────────
  fastify.put('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }

    const list = await prisma.childList.findUnique({ where: { id } })
    if (!list) return reply.status(404).send({ error: 'Lijstje niet gevonden' })

    // Kind mag alleen eigen lijstjes bewerken
    if (user.role === 'child' && list.childId !== user.sub) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { title, icon, color } = request.body as {
      title?: string
      icon?: string
      color?: string
    }

    const updated = await prisma.childList.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
      },
      include: { items: true },
    })

    return { list: updated }
  })

  // ── DELETE /:id — Lijstje verwijderen ──────────────────────
  fastify.delete('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }

    const list = await prisma.childList.findUnique({ where: { id } })
    if (!list) return reply.status(404).send({ error: 'Lijstje niet gevonden' })

    if (user.role === 'child' && list.childId !== user.sub) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    await prisma.childList.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── POST /:id/items — Item toevoegen aan lijstje ───────────
  fastify.post('/:id/items', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }

    const list = await prisma.childList.findUnique({ where: { id } })
    if (!list) return reply.status(404).send({ error: 'Lijstje niet gevonden' })

    if (user.role === 'child' && list.childId !== user.sub) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { title } = request.body as { title: string }

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Titel is verplicht' })
    }

    const itemCount = await prisma.childListItem.count({ where: { listId: id } })

    const item = await prisma.childListItem.create({
      data: {
        listId: id,
        title: title.trim(),
        sortOrder: itemCount,
      },
    })

    return reply.status(201).send({ item })
  })

  // ── PATCH /items/:itemId — Item togglen of bewerken ────────
  fastify.patch('/items/:itemId', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user
    const { itemId } = request.params as { itemId: string }

    const item = await prisma.childListItem.findUnique({
      where: { id: itemId },
      include: { list: true },
    })
    if (!item) return reply.status(404).send({ error: 'Item niet gevonden' })

    if (user.role === 'child' && item.list.childId !== user.sub) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { title, isCompleted } = request.body as {
      title?: string
      isCompleted?: boolean
    }

    const updated = await prisma.childListItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(isCompleted !== undefined && {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        }),
      },
    })

    return { item: updated }
  })

  // ── DELETE /items/:itemId — Item verwijderen ───────────────
  fastify.delete('/items/:itemId', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user
    const { itemId } = request.params as { itemId: string }

    const item = await prisma.childListItem.findUnique({
      where: { id: itemId },
      include: { list: true },
    })
    if (!item) return reply.status(404).send({ error: 'Item niet gevonden' })

    if (user.role === 'child' && item.list.childId !== user.sub) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    await prisma.childListItem.delete({ where: { id: itemId } })
    return reply.status(204).send()
  })

  // ── GET /:childId/parent — Ouder bekijkt lijstjes van kind ─
  fastify.get('/:childId/parent', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }

    // Controleer ouder-kind relatie
    const link = await prisma.parentChild.findFirst({
      where: { parentId: request.user.sub, childId },
    })
    if (!link && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const lists = await prisma.childList.findMany({
      where: { childId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return { lists }
  })
}
