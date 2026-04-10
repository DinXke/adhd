import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function tokenRoutes(fastify: FastifyInstance) {
  // ── GET /api/tokens/:childId — Saldo + transacties ───────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const transactions = await prisma.tokenTransaction.findMany({
      where: { childId },
      include: { reward: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const balance = transactions.reduce((sum, t) => {
      return t.type === 'redeemed' ? sum - t.amount : sum + t.amount
    }, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEarned = transactions
      .filter((t) => t.type !== 'redeemed' && new Date(t.createdAt) >= today)
      .reduce((sum, t) => sum + t.amount, 0)

    // Streak berekenen
    const streak = await calculateStreak(childId)

    return { balance, todayEarned, streak, transactions }
  })

  // ── POST /api/tokens/:childId/grant — Manuele toekenning (ouder) ─
  fastify.post('/:childId/grant', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { amount, note } = request.body as { amount: number; note?: string }

    if (!amount || amount < 1 || amount > 100) {
      return reply.status(400).send({ error: 'Aantal moet tussen 1 en 100 zijn' })
    }

    const txn = await prisma.tokenTransaction.create({
      data: {
        childId,
        amount,
        type: 'manual',
        sourceType: 'manual',
        note,
        grantedById: request.user.sub,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'tokens.grant',
        entityType: 'token_transaction',
        entityId: txn.id,
        metadata: { amount, note, childId },
      },
    })

    return txn
  })

  // ── GET /api/tokens/:childId/rewards — Beschikbare beloningen ─
  fastify.get('/:childId/rewards', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const rewards = await prisma.reward.findMany({
      where: { childId, isAvailable: true },
      orderBy: { sortOrder: 'asc' },
    })

    return { rewards }
  })

  // ── POST /api/tokens/:childId/rewards — Beloning aanmaken (ouder) ─
  fastify.post('/:childId/rewards', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const body = request.body as {
      title: string
      description?: string
      imageUrl?: string
      costTokens: number
      requiresApproval?: boolean
      category?: string
      expiresAt?: string
    }

    const count = await prisma.reward.count({ where: { childId } })
    const reward = await prisma.reward.create({
      data: {
        childId,
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        costTokens: body.costTokens,
        requiresApproval: body.requiresApproval ?? true,
        category: body.category,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        sortOrder: count,
      },
    })

    return reply.status(201).send(reward)
  })

  // ── PUT /api/tokens/rewards/:rewardId — Beloning updaten ─
  fastify.put('/rewards/:rewardId', { preHandler: requireParent }, async (request) => {
    const { rewardId } = request.params as { rewardId: string }
    const body = request.body as {
      title?: string
      description?: string
      costTokens?: number
      isAvailable?: boolean
      requiresApproval?: boolean
      category?: string
      sortOrder?: number
    }
    return prisma.reward.update({ where: { id: rewardId }, data: body })
  })

  // ── DELETE /api/tokens/rewards/:rewardId ─────────────────
  fastify.delete('/rewards/:rewardId', { preHandler: requireParent }, async (request, reply) => {
    const { rewardId } = request.params as { rewardId: string }
    await prisma.reward.delete({ where: { id: rewardId } })
    return reply.status(204).send()
  })

  // ── POST /api/tokens/:childId/redeem — Beloning inwisselen ─
  fastify.post('/:childId/redeem', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const { rewardId } = request.body as { rewardId: string }

    const reward = await prisma.reward.findUnique({ where: { id: rewardId } })
    if (!reward || !reward.isAvailable) {
      return reply.status(404).send({ error: 'Beloning niet beschikbaar' })
    }

    // Huidig saldo berekenen
    const allTxns = await prisma.tokenTransaction.findMany({ where: { childId } })
    const balance = allTxns.reduce((sum, t) =>
      t.type === 'redeemed' ? sum - t.amount : sum + t.amount, 0)

    if (balance < reward.costTokens) {
      return reply.status(400).send({
        error: `Niet genoeg tokens. Je hebt ${balance}, je hebt ${reward.costTokens} nodig.`,
      })
    }

    const txn = await prisma.tokenTransaction.create({
      data: {
        childId,
        amount: reward.costTokens,
        type: 'redeemed',
        sourceType: 'reward',
        sourceId: rewardId,
        rewardId,
      },
    })

    // Spaarpot-beloning: voeg geld toe aan spaarpotje
    let moneyAdded: number | null = null
    if (reward.category === 'spaarpot' && reward.description?.startsWith('MONEY:')) {
      const parsedAmount = parseInt(reward.description.replace('MONEY:', ''), 10)
      if (parsedAmount > 0) {
        await prisma.moneyTransaction.create({
          data: {
            childId,
            amount: parsedAmount,
            type: 'earning',
            note: `Beloning: ${reward.title}`,
            grantedBy: user.sub,
          },
        })
        moneyAdded = parsedAmount
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'reward.redeem',
        entityType: 'reward',
        entityId: rewardId,
        metadata: { rewardTitle: reward.title, costTokens: reward.costTokens, childId, moneyAdded },
      },
    })

    return {
      transaction: txn,
      requiresApproval: reward.requiresApproval,
      rewardTitle: reward.title,
      moneyAdded,
    }
  })

  // ── GET /api/tokens/:childId/config — Token-configs ──────
  fastify.get('/:childId/config', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const configs = await prisma.tokenConfig.findMany({
      where: { childId },
      orderBy: { sourceType: 'asc' },
    })
    return { configs }
  })

  // ── POST /api/tokens/:childId/reset — Reset tokens en voortgang ─
  fastify.post('/:childId/reset', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const { resetTokens, resetExercises, resetEmotions } = request.body as {
      resetTokens?: boolean
      resetExercises?: boolean
      resetEmotions?: boolean
    }

    const results: string[] = []

    if (resetTokens) {
      await prisma.tokenTransaction.deleteMany({ where: { childId } })
      results.push('tokens')
    }

    if (resetExercises) {
      await prisma.exerciseSession.deleteMany({ where: { childId } })
      results.push('oefeningen')
    }

    if (resetEmotions) {
      await prisma.emotionLog.deleteMany({ where: { childId } })
      results.push('emotie-logs')
    }

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'child.reset',
        entityType: 'user',
        entityId: childId,
        metadata: { resetTokens, resetExercises, resetEmotions },
      },
    })

    return { ok: true, reset: results }
  })

  // ── PUT /api/tokens/:childId/config — Config opslaan ─────
  fastify.put('/:childId/config', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const { sourceType, sourceId, enabled, tokensPerCompletion, bonusTokens } =
      request.body as {
        sourceType: string
        sourceId?: string
        enabled: boolean
        tokensPerCompletion: number
        bonusTokens?: number
      }

    const existing = await prisma.tokenConfig.findFirst({
      where: { childId, sourceType: sourceType as any, sourceId: sourceId ?? null },
    })

    if (existing) {
      return prisma.tokenConfig.update({
        where: { id: existing.id },
        data: { enabled, tokensPerCompletion, bonusTokens },
      })
    }

    return prisma.tokenConfig.create({
      data: {
        childId,
        sourceType: sourceType as any,
        sourceId: sourceId ?? null,
        enabled,
        tokensPerCompletion,
        bonusTokens,
        createdById: request.user.sub,
      },
    })
  })
}

async function calculateStreak(childId: string): Promise<number> {
  // Hoeveel opeenvolgende dagen had het kind tokens verdiend?
  const txns = await prisma.tokenTransaction.findMany({
    where: { childId, type: { not: 'redeemed' } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  if (!txns.length) return 0

  const days = new Set(txns.map((t) => t.createdAt.toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}
