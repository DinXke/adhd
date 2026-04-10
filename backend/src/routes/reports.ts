/**
 * Weekrapporten — Claude Sonnet analyseert voortgangsdata en genereert rapport.
 */
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'

const prisma = new PrismaClient()

// In-memory cache van laatste gegenereerde rapporten (per kind)
const reportCache = new Map<string, { content: string; generatedAt: Date; weekStart: string }>()

export async function reportsRoutes(fastify: FastifyInstance) {
  // ── GET /api/reports/weekly?childId=xxx — Haal laatste rapport op ─
  fastify.get('/weekly', { preHandler: requireRole(Role.parent, Role.caregiver, Role.admin) }, async (request, reply) => {
    const user = (request as any).user
    const { childId } = request.query as { childId?: string }

    const targetChildId = await resolveChildId(user, childId)
    if (!targetChildId) return reply.status(404).send({ error: 'Geen kind gevonden' })

    const cached = reportCache.get(targetChildId)
    if (cached) return cached

    return { content: null, generatedAt: null, weekStart: null }
  })

  // ── POST /api/reports/weekly — Genereer nieuw weekrapport ─────────
  fastify.post('/weekly', { preHandler: requireRole(Role.parent, Role.admin) }, async (request, reply) => {
    const user = (request as any).user
    const { childId } = request.body as { childId?: string }

    const targetChildId = await resolveChildId(user, childId)
    if (!targetChildId) return reply.status(404).send({ error: 'Geen kind gevonden' })

    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) return reply.status(503).send({ error: 'Claude API niet geconfigureerd. Voeg CLAUDE_API_KEY toe aan .env' })

    const child = await prisma.user.findUnique({
      where: { id: targetChildId },
      select: { name: true, dateOfBirth: true },
    })
    if (!child) return reply.status(404).send({ error: 'Kind niet gevonden' })

    const age = child.dateOfBirth
      ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    // Verzamel data van de afgelopen 7 dagen
    const [tokens, emotions, sessions, sessionItems] = await Promise.all([
      prisma.tokenTransaction.findMany({
        where: { childId: targetChildId, createdAt: { gte: weekStart } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emotionLog.findMany({
        where: { childId: targetChildId, createdAt: { gte: weekStart } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.exerciseSession.findMany({
        where: { childId: targetChildId, startedAt: { gte: weekStart } },
        include: { items: { select: { isCorrect: true } } },
      }),
      prisma.exerciseSessionItem.findMany({
        where: { session: { childId: targetChildId, startedAt: { gte: weekStart } } },
        select: { isCorrect: true },
      }),
    ])

    // Samenvatting voor Claude
    const totalEarned = tokens.filter(t => t.type === 'earned').reduce((s, t) => s + t.amount, 0)
    const totalRedeemed = tokens.filter(t => t.type === 'redeemed').reduce((s, t) => s + Math.abs(t.amount), 0)
    const emotionDist = emotions.reduce((acc, e) => {
      acc[e.level] = (acc[e.level] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    const correctAnswers = sessionItems.filter(i => i.isCorrect === true).length
    const wrongAnswers = sessionItems.filter(i => i.isCorrect === false).length
    const accuracy = sessionItems.length > 0 ? Math.round((correctAnswers / sessionItems.length) * 100) : null
    const activeDays = new Set(tokens.map(t => new Date(t.createdAt).toISOString().slice(0, 10))).size

    const dataStr = `
Kind: ${child.name}${age ? `, ${age} jaar` : ''}
Periode: ${weekStartStr} t/m ${now.toISOString().slice(0, 10)}

TOKENS:
- Verdiend deze week: ${totalEarned} tokens
- Ingewisseld: ${totalRedeemed} tokens
- Actieve dagen: ${activeDays}/7
- Token-bronnen: ${tokens.filter(t => t.type === 'earned').map(t => t.sourceType).join(', ') || 'geen'}

EMOTIES (${emotions.length} check-ins):
${Object.entries(emotionDist).map(([level, count]) => `- ${level}: ${count}x`).join('\n') || '- Geen check-ins'}

SCHOOLOEFENINGEN:
- Sessies: ${sessions.length}
- Totaal antwoorden: ${sessionItems.length}
- Correct: ${correctAnswers} (${accuracy !== null ? accuracy + '%' : 'n.v.t.'})
- Fout: ${wrongAnswers}
${sessions.map(s => `- ${s.subject}: ${s.items.filter(i => i.isCorrect).length}/${s.items.length} correct`).join('\n') || '- Geen sessies'}
    `.trim()

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Je bent een ondersteuner voor ouders van kinderen met ADHD. Schrijf een warm, bemoedigend weekrapport in het Nederlands (Vlaams) op basis van deze data. Gebruik de Barkley-methode: focus op positieve bekrachtiging, bespreek patronen zonder te oordelen, geef 2-3 concrete tips voor de volgende week.

Formaat:
1. Korte positieve samenvatting (2-3 zinnen)
2. Sterktes van deze week (bullets)
3. Aandachtspunten (neutraal, geen kritiek)
4. Tips voor volgende week (2-3 concrete acties)

Houd het compact: max 250 woorden. Schrijf alsof je een warme professional bent die de ouder kent.

Data:
${dataStr}`,
        },
      ],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    const result = { content, generatedAt: new Date(), weekStart: weekStartStr }
    reportCache.set(targetChildId, result)

    return result
  })
}

async function resolveChildId(user: any, childId?: string): Promise<string | null> {
  if (childId) return childId
  if (user.role === 'child') return user.sub
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.sub },
    orderBy: { createdAt: 'asc' },
  })
  return link?.childId ?? null
}
