/**
 * Sociale scripts — Claude Sonnet genereert interactieve scenario's voor sociale situaties.
 */
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireParent } from '../middleware/auth'
import Anthropic from '@anthropic-ai/sdk'

const prisma = new PrismaClient()

const CATEGORIES = {
  hulp_vragen: { label: 'Om hulp vragen', icon: '🙋', description: 'Hoe vraag je iets aan de juf, een vriend of een volwassene?' },
  conflict: { label: 'Ruzie oplossen', icon: '🤝', description: 'Wat doe je als je ruzie hebt of iemand pest?' },
  vrienden: { label: 'Vrienden maken', icon: '👫', description: 'Hoe sluit je je aan bij een groepje? Hoe reageer je op iemand?' },
  regels: { label: 'Regels begrijpen', icon: '📋', description: 'Waarom zijn er regels en hoe ga je ermee om?' },
  gevoelens: { label: 'Gevoelens delen', icon: '💬', description: 'Hoe praat je over hoe je je voelt?' },
  algemeen: { label: 'Algemeen', icon: '🌟', description: 'Andere sociale situaties' },
}

export async function socialRoutes(fastify: FastifyInstance) {
  // ── GET /api/social/categories — Beschikbare categorieën ─────
  fastify.get('/categories', { preHandler: requireAuth }, async () => {
    return { categories: Object.entries(CATEGORIES).map(([key, val]) => ({ key, ...val })) }
  })

  // ── GET /api/social/:childId — Scripts voor dit kind ─────────
  fastify.get('/:childId', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { childId } = request.params as { childId: string }
    const { category } = request.query as { category?: string }

    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const scripts = await prisma.socialScript.findMany({
      where: { childId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    })
    return { scripts }
  })

  // ── POST /api/social/:childId/generate — Genereer via Claude ─
  fastify.post('/:childId/generate', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const { category = 'algemeen', difficulty = 1, topic } = request.body as {
      category?: string; difficulty?: number; topic?: string
    }

    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) return reply.status(503).send({ error: 'Claude API niet geconfigureerd' })

    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { name: true, dateOfBirth: true },
    })
    const age = child?.dateOfBirth
      ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 10

    const catInfo = CATEGORIES[category as keyof typeof CATEGORIES] ?? CATEGORIES.algemeen

    const prompt = `Je bent een therapeut die interactieve sociale oefenscenario's maakt voor kinderen met ADHD.

Maak een kort scenario voor ${child?.name ?? 'een kind'} (${age} jaar) over: ${catInfo.label}${topic ? ` — specifiek over: ${topic}` : ''}.

Schrijf in Vlaams Nederlands. Niveau ${difficulty}/3. Houd het positief en educatief.

Antwoord ALLEEN als geldig JSON (geen tekst ervoor of erna):
{
  "title": "Korte pakkende titel (max 5 woorden)",
  "scenario": "De situatie in 2-3 zinnen. Concrete setting, directe aanleiding.",
  "choices": [
    {
      "text": "Optie A tekst (max 15 woorden, actiegericht)",
      "outcome": "Wat er daarna gebeurt (2 zinnen, realistisch en warm)",
      "isPositive": true,
      "tip": "Korte Barkley-tip (max 10 woorden)"
    },
    {
      "text": "Optie B tekst",
      "outcome": "Wat er daarna gebeurt",
      "isPositive": false,
      "tip": "Wat je de volgende keer beter kunt doen"
    },
    {
      "text": "Optie C tekst",
      "outcome": "Wat er daarna gebeurt",
      "isPositive": true,
      "tip": "Positieve bekrachtiging"
    }
  ]
}`

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: any
    try {
      // Extraheer JSON zelfs als Claude wat tekst toevoegt
      const match = text.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match?.[0] ?? text)
    } catch {
      return reply.status(500).send({ error: 'Kon script niet parsen. Probeer opnieuw.' })
    }

    const script = await prisma.socialScript.create({
      data: {
        childId,
        title: parsed.title ?? 'Sociaal scenario',
        scenario: parsed.scenario ?? '',
        category,
        choices: parsed.choices ?? [],
        difficulty,
        isAiGenerated: true,
      },
    })

    return { script }
  })

  // ── POST /api/social/:childId/manual — Handmatig aanmaken ────
  fastify.post('/:childId/manual', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const body = request.body as {
      title: string; scenario: string; category?: string; choices: any[]; difficulty?: number
    }

    const script = await prisma.socialScript.create({
      data: {
        childId,
        title: body.title,
        scenario: body.scenario,
        category: body.category ?? 'algemeen',
        choices: body.choices,
        difficulty: body.difficulty ?? 1,
        isAiGenerated: false,
      },
    })
    return { script }
  })

  // ── POST /api/social/scripts/:id/play — Afspelen registreren ─
  fastify.post('/scripts/:id/play', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.socialScript.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    })
    return { ok: true }
  })

  // ── DELETE /api/social/scripts/:id — Script verwijderen ──────
  fastify.delete('/scripts/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.socialScript.delete({ where: { id } })
    return { ok: true }
  })
}
