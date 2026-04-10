import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'
import { EmotionLevel } from '@prisma/client'

export async function emotionRoutes(fastify: FastifyInstance) {
  // ── POST /api/emotions — Check-in opslaan ─────────────────────
  fastify.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user
    const { childId, level, note } = request.body as {
      childId: string
      level: string
      note?: string
    }

    // Alleen eigen check-in of ouder voor kind
    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    if (!Object.values(EmotionLevel).includes(level as EmotionLevel)) {
      return reply.status(400).send({ error: 'Ongeldig emotieniveau' })
    }

    const log = await prisma.emotionLog.create({
      data: { childId, level: level as EmotionLevel, note },
    })

    // Token toekennen als geconfigureerd
    const config = await prisma.tokenConfig.findFirst({
      where: { childId, sourceType: 'emotion_checkin', enabled: true },
    })

    let tokensAwarded = 0
    if (config) {
      await prisma.tokenTransaction.create({
        data: {
          childId,
          amount: config.tokensPerCompletion,
          type: 'earned',
          sourceType: 'emotion_checkin',
          sourceId: log.id,
        },
      })
      tokensAwarded = config.tokensPerCompletion
    }

    return reply.status(201).send({ log, tokensAwarded })
  })

  // ── GET /api/emotions/:childId — Recente check-ins ───────────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const logs = await prisma.emotionLog.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return { logs }
  })

  // ── GET /api/emotions/:childId/today — Check-in vandaag? ─────
  fastify.get('/:childId/today', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const log = await prisma.emotionLog.findFirst({
      where: { childId, createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
    })

    return { checkedInToday: !!log, lastLog: log ?? null }
  })
}
