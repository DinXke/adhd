/**
 * Dossier-routes — centraal dossier voor kind (verslagen, IHP, medicatie, notities).
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'
import { DossierCategory } from '@prisma/client'

// Controleer of gebruiker toegang heeft tot dossier van dit kind
async function canAccessDossier(userId: string, role: string, childId: string): Promise<boolean> {
  if (role === 'admin') return true
  if (role === 'parent') {
    const link = await prisma.parentChild.findFirst({ where: { parentId: userId, childId } })
    return !!link
  }
  // Hulpverlener: controleer CaregiverAccess met dossier-module
  const access = await prisma.caregiverAccess.findFirst({
    where: { userId, childId, isActive: true, modules: { has: 'dossier' } },
  })
  return !!access
}

export async function dossierRoutes(fastify: FastifyInstance) {

  // ── GET /api/dossier/:childId — Overzicht dossier ─────────────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { category } = request.query as { category?: string }

    if (!(await canAccessDossier(request.user.sub, request.user.role, childId))) {
      return reply.status(403).send({ error: 'Geen toegang tot dit dossier' })
    }

    const entries = await prisma.dossierEntry.findMany({
      where: {
        childId,
        ...(category ? { category: category as DossierCategory } : {}),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return { entries }
  })

  // ── GET /api/dossier/:childId/:entryId — Enkel item ───────────
  fastify.get('/:childId/:entryId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId, entryId } = request.params as { childId: string; entryId: string }

    if (!(await canAccessDossier(request.user.sub, request.user.role, childId))) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const entry = await prisma.dossierEntry.findFirst({
      where: { id: entryId, childId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        attachments: true,
        visibility: { select: { id: true, name: true, role: true } },
      },
    })

    if (!entry) return reply.status(404).send({ error: 'Niet gevonden' })
    return { entry }
  })

  // ── POST /api/dossier/:childId — Nieuw item aanmaken ──────────
  fastify.post('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }

    if (!(await canAccessDossier(request.user.sub, request.user.role, childId))) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { category, title, content, visibleToIds = [] } = request.body as {
      category: string
      title: string
      content: string
      visibleToIds?: string[]
    }

    if (!category || !title || !content) {
      return reply.status(400).send({ error: 'category, title en content zijn verplicht' })
    }

    const entry = await prisma.dossierEntry.create({
      data: {
        childId,
        category: category as DossierCategory,
        title,
        content,
        authorId: request.user.sub,
        visibility: visibleToIds.length
          ? { connect: visibleToIds.map(id => ({ id })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        attachments: true,
      },
    })

    return reply.status(201).send({ entry })
  })

  // ── PUT /api/dossier/:childId/:entryId — Item bijwerken ───────
  fastify.put('/:childId/:entryId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId, entryId } = request.params as { childId: string; entryId: string }

    const existing = await prisma.dossierEntry.findFirst({ where: { id: entryId, childId } })
    if (!existing) return reply.status(404).send({ error: 'Niet gevonden' })

    // Alleen auteur of ouder/admin mag bewerken
    if (existing.authorId !== request.user.sub && request.user.role !== 'parent' && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { title, content, visibleToIds } = request.body as {
      title?: string
      content?: string
      visibleToIds?: string[]
    }

    const entry = await prisma.dossierEntry.update({
      where: { id: entryId },
      data: {
        title,
        content,
        visibility: visibleToIds
          ? { set: visibleToIds.map(id => ({ id })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        attachments: true,
      },
    })

    return { entry }
  })

  // ── DELETE /api/dossier/:childId/:entryId ─────────────────────
  fastify.delete('/:childId/:entryId', { preHandler: requireParent }, async (request, reply) => {
    const { childId, entryId } = request.params as { childId: string; entryId: string }

    await prisma.dossierEntry.deleteMany({ where: { id: entryId, childId } })
    return reply.status(204).send()
  })
}
