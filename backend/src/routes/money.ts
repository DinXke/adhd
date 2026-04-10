/**
 * Geldmodule — virtueel spaarpotje voor kinderen
 * Routes: GET /balance, POST /deposit, POST /spend, GET /goals, POST /goals, DELETE /goals/:id
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'

export async function moneyRoutes(fastify: FastifyInstance) {

  // ── GET /api/money/:childId/balance ───────────────────────────
  fastify.get('/:childId/balance', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const user = request.user

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const [transactions, goals] = await Promise.all([
      prisma.moneyTransaction.findMany({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.moneySavingGoal.findMany({
        where: { childId, isReached: false },
        orderBy: { targetAmount: 'asc' },
      }),
    ])

    const balance = transactions.reduce((sum, t) => sum + t.amount, 0)

    // Totaal gespaard vandaag en deze week
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
    const earnedToday = transactions
      .filter(t => new Date(t.createdAt) >= today && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0)

    return { balance, earnedToday, transactions, goals }
  })

  // ── POST /api/money/:childId/deposit — Ouder stort geld ───────
  fastify.post('/:childId/deposit', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { amount, note, type = 'allowance' } = request.body as {
      amount: number
      note?: string
      type?: string
    }

    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Bedrag moet positief zijn' })

    const tx = await prisma.moneyTransaction.create({
      data: {
        childId,
        amount: Math.round(amount), // centen
        type,
        note,
        grantedBy: request.user.sub,
      },
    })

    // Check of spaardoel bereikt is
    const newBalance = await prisma.moneyTransaction
      .aggregate({ where: { childId }, _sum: { amount: true } })
      .then(r => r._sum.amount ?? 0)

    const reachedGoals = await prisma.moneySavingGoal.findMany({
      where: { childId, isReached: false, targetAmount: { lte: newBalance } },
    })
    if (reachedGoals.length > 0) {
      await prisma.moneySavingGoal.updateMany({
        where: { id: { in: reachedGoals.map(g => g.id) } },
        data: { isReached: true, reachedAt: new Date() },
      })
    }

    return reply.status(201).send({ transaction: tx, newBalance, reachedGoals })
  })

  // ── POST /api/money/:childId/spend ────────────────────────────
  fastify.post('/:childId/spend', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { amount, note } = request.body as { amount: number; note?: string }

    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Bedrag moet positief zijn' })

    const balance = await prisma.moneyTransaction
      .aggregate({ where: { childId }, _sum: { amount: true } })
      .then(r => r._sum.amount ?? 0)

    if (balance < amount) {
      return reply.status(400).send({ error: 'Onvoldoende saldo' })
    }

    const tx = await prisma.moneyTransaction.create({
      data: { childId, amount: -Math.round(amount), type: 'spending', note, grantedBy: request.user.sub },
    })

    return reply.status(201).send({ transaction: tx, newBalance: balance - amount })
  })

  // ── GET/POST/DELETE spaardoelen ───────────────────────────────
  fastify.get('/:childId/goals', { preHandler: requireAuth }, async (request) => {
    const { childId } = request.params as { childId: string }
    const goals = await prisma.moneySavingGoal.findMany({
      where: { childId },
      orderBy: [{ isReached: 'asc' }, { targetAmount: 'asc' }],
    })
    return { goals }
  })

  fastify.post('/:childId/goals', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { title, targetAmount, icon } = request.body as {
      title: string; targetAmount: number; icon?: string
    }

    if (!title || !targetAmount) return reply.status(400).send({ error: 'Titel en bedrag verplicht' })

    const goal = await prisma.moneySavingGoal.create({
      data: { childId, title, targetAmount: Math.round(targetAmount), icon: icon ?? '🎯' },
    })

    return reply.status(201).send({ goal })
  })

  fastify.delete('/:childId/goals/:goalId', { preHandler: requireParent }, async (request, reply) => {
    const { goalId } = request.params as { childId: string; goalId: string }
    await prisma.moneySavingGoal.delete({ where: { id: goalId } })
    return reply.status(204).send()
  })
}
