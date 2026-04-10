/**
 * Dagelijkse ouder-tip via Claude Haiku
 * Gegenereerd op basis van gisteren's activiteit van het kind
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import Anthropic from '@anthropic-ai/sdk'

function getClient() {
  return new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
}

async function generateTip(childId: string): Promise<string> {
  const child = await prisma.user.findUnique({ where: { id: childId }, select: { name: true } })

  // Verzamel gisteren's data
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [tasks, emotions, exerciseSessions, exerciseItems, tokenTotal] = await Promise.all([
    prisma.task.findMany({
      where: { childId, createdAt: { gte: yesterday, lt: todayStart } },
      select: { completedAt: true },
    }),
    prisma.emotionLog.findMany({
      where: { childId, createdAt: { gte: yesterday, lt: todayStart } },
      select: { level: true },
    }),
    prisma.exerciseSession.findMany({
      where: { childId, startedAt: { gte: yesterday, lt: todayStart } },
      select: { id: true },
    }),
    prisma.exerciseSessionItem.findMany({
      where: { session: { childId, startedAt: { gte: yesterday, lt: todayStart } } },
      select: { isCorrect: true },
    }),
    prisma.tokenTransaction.aggregate({
      where: { childId, createdAt: { gte: yesterday, lt: todayStart }, type: 'earned' },
      _sum: { amount: true },
    }),
  ])

  const completedTasks = tasks.filter(t => t.completedAt).length
  const totalTasks = tasks.length
  const tokens = tokenTotal._sum.amount ?? 0
  const emotionSummary = emotions.map(e => e.level).join(', ') || 'geen check-in'
  const totalItems = exerciseItems.length
  const correctItems = exerciseItems.filter(i => i.isCorrect === true).length
  const exerciseAccuracy = totalItems > 0 ? Math.round(correctItems / totalItems * 100) : null

  const prompt = `Je bent een gedragsdeskundige gespecialiseerd in ADHD bij kinderen (Barkley-methode).
Geef één korte, praktische tip voor de ouder van ${child?.name ?? 'het kind'} (kind met ADHD) op basis van gisteren:

Gisteren:
- Taken: ${completedTasks}/${totalTasks} afgerond
- Emoties: ${emotionSummary}
- Oefeningen: ${exerciseAccuracy !== null ? `${exerciseAccuracy}% correct` : 'geen oefeningen gedaan'}
- Tokens verdiend: ${tokens}

Schrijf ÉÉN concrete tip van maximaal 2 zinnen. In het Vlaams Nederlands (B2-niveau).
Gebaseerd op Barkley's externe bekrachtiging en punt-van-uitvoering principes.
Geen opsomming, geen uitleg. Gewoon de tip.
Begin NIET met "Tip:" of "Beste ouder".`

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  return (response.content[0] as any).text?.trim() ?? ''
}

export async function tipsRoutes(fastify: FastifyInstance) {

  // ── GET /api/tips/:childId/today ──────────────────────────────
  fastify.get('/:childId/today', { preHandler: requireAuth }, async (request) => {
    const { childId } = request.params as { childId: string }
    const today = new Date().toISOString().slice(0, 10)

    // Kijk of er al een tip is voor vandaag
    let tip = await (prisma as any).dailyTip.findUnique({
      where: { childId_date: { childId, date: today } },
    })

    if (!tip) {
      // Genereer nieuwe tip
      try {
        const content = await generateTip(childId)
        if (content) {
          tip = await (prisma as any).dailyTip.create({
            data: { childId, content, date: today },
          })
        }
      } catch (err) {
        fastify.log.error({ err }, 'Tip genereren mislukt')
        return { tip: null }
      }
    }

    return { tip }
  })

  // ── POST /api/tips/:childId/regenerate — Nieuwe tip genereren ─
  fastify.post('/:childId/regenerate', { preHandler: requireAuth }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const today = new Date().toISOString().slice(0, 10)

    // Verwijder bestaande tip van vandaag
    await (prisma as any).dailyTip.deleteMany({ where: { childId, date: today } })

    try {
      const content = await generateTip(childId)
      if (!content) return reply.status(500).send({ error: 'Geen tip gegenereerd' })

      const tip = await (prisma as any).dailyTip.create({ data: { childId, content, date: today } })
      return { tip }
    } catch (err) {
      fastify.log.error({ err }, 'Tip regenereren mislukt')
      return reply.status(500).send({ error: 'Claude API fout' })
    }
  })
}
