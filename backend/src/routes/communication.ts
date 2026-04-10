/**
 * Communicatieportaal — kanalen, berichten, leesbevestigingen, bestandsbijlagen.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'
import { getPresignedUrl } from '../lib/minio'
import { ChannelType } from '@prisma/client'
import { sendPush } from './push'

// Controleer of gebruiker toegang heeft tot kanaal (lid, ouder van kind, of admin)
async function canAccessChannel(userId: string, role: string, channelId: string): Promise<boolean> {
  if (role === 'admin') return true

  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) return false

  // Ouder: controleer of ze toegang hebben tot dit kind
  if (role === 'parent') {
    const link = await prisma.parentChild.findFirst({ where: { parentId: userId, childId: channel.childId } })
    return !!link
  }

  // Hulpverlener/kind: moet lid zijn van het kanaal
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  })
  return !!member
}

export async function communicationRoutes(fastify: FastifyInstance) {

  // ── GET /api/communication/channels — Kanalen ophalen ─────────
  fastify.get('/channels', { preHandler: requireAuth }, async (request) => {
    const { childId } = request.query as { childId?: string }
    const user = request.user

    let channels

    if (user.role === 'admin' || user.role === 'parent') {
      // Ouder/admin: alle kanalen voor hun kinderen
      const childFilter = childId ?? undefined

      if (childId) {
        channels = await prisma.channel.findMany({
          where: { childId },
          include: {
            members: { include: { user: { select: { id: true, name: true, avatarUrl: true, avatarId: true, role: true } } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { author: { select: { name: true } } },
            },
            _count: { select: { messages: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      } else {
        // Alle kanalen voor alle gekoppelde kinderen
        const myChildren = await prisma.parentChild.findMany({
          where: { parentId: user.sub },
          select: { childId: true },
        })
        const childIds = myChildren.map(c => c.childId)
        channels = await prisma.channel.findMany({
          where: { childId: { in: childIds } },
          include: {
            members: { include: { user: { select: { id: true, name: true, avatarUrl: true, avatarId: true, role: true } } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { author: { select: { name: true } } },
            },
            _count: { select: { messages: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      }
    } else {
      // Hulpverlener: alleen kanalen waarvan ze lid zijn
      const memberships = await prisma.channelMember.findMany({
        where: { userId: user.sub },
        select: { channelId: true },
      })
      const channelIds = memberships.map(m => m.channelId)
      channels = await prisma.channel.findMany({
        where: { id: { in: channelIds } },
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true, avatarId: true, role: true } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { author: { select: { name: true } } },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
    }

    // Voeg ongelezen-teller toe per kanaal
    const withUnread = await Promise.all(
      channels.map(async (ch) => {
        const unread = await prisma.message.count({
          where: {
            channelId: ch.id,
            reads: { none: { userId: user.sub } },
          },
        })
        return { ...ch, unreadCount: unread }
      })
    )

    return { channels: withUnread }
  })

  // ── POST /api/communication/channels — Kanaal aanmaken (ouder) ─
  fastify.post('/channels', { preHandler: requireParent }, async (request, reply) => {
    const { name, type = 'general', childId, memberUserIds = [] } = request.body as {
      name: string
      type?: string
      childId: string
      memberUserIds?: string[]
    }

    if (!name || !childId) return reply.status(400).send({ error: 'name en childId zijn verplicht' })

    const channel = await prisma.channel.create({
      data: {
        name,
        type: type as ChannelType,
        childId,
        members: {
          create: [
            { userId: request.user.sub }, // ouder is altijd lid
            ...memberUserIds
              .filter(id => id !== request.user.sub)
              .map(userId => ({ userId })),
          ],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
      },
    })

    return reply.status(201).send({ channel })
  })

  // ── PATCH /api/communication/channels/:id — Kanaal bijwerken ──
  fastify.patch('/channels/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name, memberUserIds } = request.body as { name?: string; memberUserIds?: string[] }

    if (!(await canAccessChannel(request.user.sub, request.user.role, id))) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const channel = await prisma.channel.update({ where: { id }, data: { name } })

    if (memberUserIds) {
      await prisma.channelMember.deleteMany({ where: { channelId: id } })
      await prisma.channelMember.createMany({
        data: memberUserIds.map(userId => ({ channelId: id, userId })),
        skipDuplicates: true,
      })
    }

    return { channel }
  })

  // ── DELETE /api/communication/channels/:id ─────────────────────
  fastify.delete('/channels/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.channel.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── GET /api/communication/channels/:id/messages ──────────────
  fastify.get('/channels/:id/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { before, limit = '30' } = request.query as { before?: string; limit?: string }

    if (!(await canAccessChannel(request.user.sub, request.user.role, id))) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true, avatarId: true } },
        reads: { select: { userId: true, readAt: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    })

    // Auto-mark als gelezen
    const unreadIds = messages
      .filter(m => !m.reads.some(r => r.userId === request.user.sub))
      .map(m => m.id)

    if (unreadIds.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadIds.map(messageId => ({ messageId, userId: request.user.sub })),
        skipDuplicates: true,
      })
    }

    return { messages: messages.reverse(), hasMore: messages.length === parseInt(limit) }
  })

  // ── POST /api/communication/channels/:id/messages ─────────────
  fastify.post('/channels/:id/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { content, isStructuredUpdate = false, templateData } = request.body as {
      content: string
      isStructuredUpdate?: boolean
      templateData?: any
    }

    if (!(await canAccessChannel(request.user.sub, request.user.role, id))) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    if (!content?.trim()) return reply.status(400).send({ error: 'Bericht mag niet leeg zijn' })

    const message = await prisma.message.create({
      data: {
        channelId: id,
        authorId: request.user.sub,
        content: content.trim(),
        isStructuredUpdate,
        templateData,
      },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true, avatarId: true } },
        reads: true,
        attachments: true,
      },
    })

    // Zender heeft het zelf gelezen
    await prisma.messageRead.create({
      data: { messageId: message.id, userId: request.user.sub },
    })

    // Push notificatie naar alle kanaalleden behalve de zender
    try {
      const channel = await prisma.channel.findUnique({
        where: { id },
        include: { members: { select: { id: true } } },
      })
      const sender = message.author
      const recipients = (channel?.members ?? []).filter(m => m.id !== request.user.sub)
      await Promise.allSettled(recipients.map(r =>
        sendPush(r.id, {
          title: `Nieuw bericht van ${sender.name}`,
          body: content.trim().slice(0, 100),
          icon: '/icons/icon-192.png',
          tag: `message-${id}`,
          url: `/dashboard/communication`,
        })
      ))
    } catch {}

    return reply.status(201).send({ message })
  })

  // ── DELETE /api/communication/messages/:msgId ─────────────────
  fastify.delete('/messages/:msgId', { preHandler: requireAuth }, async (request, reply) => {
    const { msgId } = request.params as { msgId: string }
    const msg = await prisma.message.findUnique({ where: { id: msgId } })
    if (!msg) return reply.status(404).send({ error: 'Bericht niet gevonden' })
    if (msg.authorId !== request.user.sub && request.user.role !== 'admin' && request.user.role !== 'parent') {
      return reply.status(403).send({ error: 'Geen toegang' })
    }
    await prisma.message.delete({ where: { id: msgId } })
    return reply.status(204).send()
  })

  // ── GET /api/communication/files/:key — Pre-signed download URL ─
  fastify.get('/files/:key', { preHandler: requireAuth }, async (request) => {
    const { key } = request.params as { key: string }
    const url = await getPresignedUrl(decodeURIComponent(key))
    return { url }
  })
}
