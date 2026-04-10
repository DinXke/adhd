import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'
import { Subject, ExerciseType } from '@prisma/client'
import { generateExercises, generateHint, hasClaudeKey } from '../lib/claude'
import { sendPushToAdmins } from './push'

export async function exerciseRoutes(fastify: FastifyInstance) {

  // ── GET /api/exercises — Oefeningen ophalen ───────────────────
  fastify.get('/', { preHandler: requireAuth }, async (request) => {
    const { subject, difficulty, limit = '10', childId } = request.query as {
      subject?: string
      difficulty?: string
      limit?: string
      childId?: string
    }

    // Recente oefeningen voor dit kind ophalen (voor adaptieve selectie)
    let recentExerciseIds: string[] = []
    if (childId) {
      const recent = await prisma.exerciseSessionItem.findMany({
        where: { session: { childId } },
        select: { exerciseId: true },
        orderBy: { answeredAt: 'desc' },
        take: 50,
      })
      recentExerciseIds = recent.map((r) => r.exerciseId)
    }

    const exercises = await prisma.exercise.findMany({
      where: {
        isApproved: true,
        ...(subject ? { subject: subject as Subject } : {}),
        ...(difficulty ? { difficulty: parseInt(difficulty) } : {}),
        // Vermijd heel recent gemaakte oefeningen (lichte variatie)
        ...(recentExerciseIds.length > 20 ? { id: { notIn: recentExerciseIds.slice(0, 20) } } : {}),
      },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'asc' }],
      take: parseInt(limit),
    })

    return { exercises }
  })

  // ── POST /api/exercises/generate — Claude Haiku generatie ─────
  fastify.post('/generate', { preHandler: requireParent }, async (request, reply) => {
    if (!hasClaudeKey()) {
      return reply.status(503).send({
        error: 'Claude API key niet ingesteld. Voeg CLAUDE_API_KEY toe in de instellingen.',
        needsApiKey: true,
      })
    }

    const { subject, theme, difficulty, count = 5, childId } = request.body as {
      subject: string
      theme: string
      difficulty: number
      count?: number
      childId?: string
    }

    if (!subject || !theme || !difficulty) {
      return reply.status(400).send({ error: 'subject, theme en difficulty zijn verplicht' })
    }

    const generated = await generateExercises({
      subject,
      theme,
      difficulty: Math.min(5, Math.max(1, difficulty)),
      count: Math.min(10, count),
    })

    // Opslaan in database
    const saved = await Promise.all(
      generated.map((ex) =>
        prisma.exercise.create({
          data: {
            subject: subject as Subject,
            type: (ex.type as ExerciseType) ?? ExerciseType.multiple_choice,
            difficulty,
            title: ex.title,
            questionJson: ex as any,
            tags: ex.tags ?? [],
            isAiGenerated: true,
            isApproved: false, // Ouder moet goedkeuren
            generatedBy: 'claude-haiku-4-5',
            createdById: request.user.sub,
          },
        })
      )
    )

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'exercises.generate',
        entityType: 'exercise',
        entityId: saved[0]?.id ?? '',
        metadata: { subject, theme, difficulty, count: saved.length },
      },
    })

    // Push naar ouders: nieuwe oefeningen wachten op review
    if (saved.length > 0) {
      sendPushToAdmins({
        title: `${saved.length} nieuwe oefeningen wachten op goedkeuring`,
        body: `Onderwerp: ${subject}. Controleer ze voor Julie ze ziet.`,
        icon: '/icons/icon-192.png',
        tag: 'exercise-review',
        url: '/dashboard/exercises/review',
      }).catch(() => {})
    }

    return reply.status(201).send({ exercises: saved, count: saved.length })
  })

  // ── PATCH /api/exercises/:id/approve — Goedkeuren ────────────
  fastify.patch('/:id/approve', { preHandler: requireParent }, async (request) => {
    const { id } = request.params as { id: string }
    const { isApproved } = request.body as { isApproved: boolean }
    return prisma.exercise.update({ where: { id }, data: { isApproved } })
  })

  // ── DELETE /api/exercises/:id ─────────────────────────────────
  fastify.delete('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.exercise.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── POST /api/exercises/sessions — Sessie starten ────────────
  fastify.post('/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const { childId, subject, exerciseIds } = request.body as {
      childId: string
      subject: string
      exerciseIds: string[]
    }

    const user = request.user
    if (user.role === 'child' && user.sub !== childId) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const session = await prisma.exerciseSession.create({
      data: {
        childId,
        subject: subject as Subject,
        items: {
          create: exerciseIds.map((exerciseId) => ({ exerciseId })),
        },
      },
      include: {
        items: {
          include: { exercise: true },
        },
      },
    })

    return reply.status(201).send({ session })
  })

  // ── GET /api/exercises/sessions/:sessionId ────────────────────
  fastify.get('/sessions/:sessionId', { preHandler: requireAuth }, async (request) => {
    const { sessionId } = request.params as { sessionId: string }

    const session = await prisma.exerciseSession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: { exercise: true },
          orderBy: { id: 'asc' },
        },
      },
    })

    return { session }
  })

  // ── POST /api/exercises/sessions/:sessionId/answer ────────────
  fastify.post('/sessions/:sessionId/answer', { preHandler: requireAuth }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const { itemId, answer, timeSeconds } = request.body as {
      itemId: string
      answer: string
      timeSeconds?: number
    }

    const item = await prisma.exerciseSessionItem.findUnique({
      where: { id: itemId },
      include: { exercise: true, session: true },
    })
    if (!item) return reply.status(404).send({ error: 'Item niet gevonden' })

    const q = item.exercise.questionJson as any
    const correctAnswer = String(q.answer).toLowerCase().trim()
    const givenAnswer = String(answer).toLowerCase().trim()
    const isCorrect = correctAnswer === givenAnswer

    const attempts = item.attempts + 1
    let hint: string | null = null

    // Hint genereren bij eerste fout poging
    if (!isCorrect && attempts === 1 && hasClaudeKey()) {
      try {
        hint = await generateHint({
          question: q.question,
          wrongAnswer: answer,
          correctAnswer: q.answer,
          subject: item.exercise.subject,
          difficulty: item.exercise.difficulty,
        })
      } catch {
        // Gebruik statische hint als fallback
        hint = q.hints?.[0]?.content ?? null
      }
    } else if (!isCorrect && attempts >= 2) {
      // Na 2 pogingen: toon het juiste antwoord
      hint = q.explanation ?? `Het juiste antwoord is: ${q.answer}`
    }

    // Update het item
    const updatedItem = await prisma.exerciseSessionItem.update({
      where: { id: itemId },
      data: {
        isCorrect: isCorrect || undefined, // enkel zetten als goed
        attempts,
        answeredAt: isCorrect || attempts >= 2 ? new Date() : undefined,
        timeSeconds,
      },
    })

    // Tokens toekennen als correct (eerste poging)
    let tokensAwarded = 0
    if (isCorrect && attempts === 1) {
      const config = await prisma.tokenConfig.findFirst({
        where: {
          childId: item.session.childId,
          sourceType: 'exercise',
          enabled: true,
        },
      })
      if (config) {
        await prisma.tokenTransaction.create({
          data: {
            childId: item.session.childId,
            amount: config.tokensPerCompletion,
            type: 'earned',
            sourceType: 'exercise',
            sourceId: item.exerciseId,
          },
        })
        tokensAwarded = config.tokensPerCompletion
      }
    }

    return { isCorrect, attempts, hint, tokensAwarded, item: updatedItem }
  })

  // ── POST /api/exercises/sessions/:sessionId/complete ──────────
  fastify.post('/sessions/:sessionId/complete', { preHandler: requireAuth }, async (request) => {
    const { sessionId } = request.params as { sessionId: string }
    const { durationSeconds } = request.body as { durationSeconds?: number }

    const session = await prisma.exerciseSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date(), durationSeconds },
      include: { items: true },
    })

    const correct = session.items.filter((i) => i.isCorrect).length
    const total = session.items.length
    const childId = session.childId

    // Sessie-bonus tokens
    const config = await prisma.tokenConfig.findFirst({
      where: { childId, sourceType: 'exercise_session', enabled: true },
    })
    let bonusTokens = 0
    if (config) {
      await prisma.tokenTransaction.create({
        data: {
          childId,
          amount: config.tokensPerCompletion,
          type: 'earned',
          sourceType: 'exercise_session',
          sourceId: sessionId,
        },
      })
      bonusTokens = config.tokensPerCompletion
    }

    return { session, correct, total, bonusTokens }
  })

  // ── GET /api/exercises/generation-stats — AI gebruik stats ───
  fastify.get('/generation-stats', { preHandler: requireParent }, async () => {
    const now = new Date()

    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [today, week, month, year, total] = await Promise.all([
      prisma.exercise.count({ where: { isAiGenerated: true, createdAt: { gte: startOfDay } } }),
      prisma.exercise.count({ where: { isAiGenerated: true, createdAt: { gte: startOfWeek } } }),
      prisma.exercise.count({ where: { isAiGenerated: true, createdAt: { gte: startOfMonth } } }),
      prisma.exercise.count({ where: { isAiGenerated: true, createdAt: { gte: startOfYear } } }),
      prisma.exercise.count({ where: { isAiGenerated: true } }),
    ])

    // Kosteninschatting: ~$0.00003 per gegenereerde oefening (batch van 10 = 1 call ≈ $0.0003)
    const costPer = 0.00003
    return {
      stats: {
        today: { count: today, estimatedCostEur: +(today * costPer).toFixed(5) },
        week: { count: week, estimatedCostEur: +(week * costPer).toFixed(5) },
        month: { count: month, estimatedCostEur: +(month * costPer).toFixed(4) },
        year: { count: year, estimatedCostEur: +(year * costPer).toFixed(4) },
        allTime: { count: total, estimatedCostEur: +(total * costPer).toFixed(4) },
      },
    }
  })

  // ── GET /api/exercises/subjects — Vakken met aantallen ────────
  fastify.get('/subjects', { preHandler: requireAuth }, async () => {
    const counts = await prisma.exercise.groupBy({
      by: ['subject'],
      where: { isApproved: true },
      _count: { id: true },
    })
    return { subjects: counts.map((c) => ({ subject: c.subject, count: c._count.id })) }
  })

  // ── GET /api/exercises/pending — Ter goedkeuring (ouder) ──────
  fastify.get('/pending', { preHandler: requireParent }, async () => {
    const exercises = await prisma.exercise.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'desc' },
    })
    return { exercises }
  })
}
