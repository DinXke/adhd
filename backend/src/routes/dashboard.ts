/**
 * Dashboard API — echte statistieken, activiteitsfeed en weekgrafiek-data.
 */
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'

const prisma = new PrismaClient()

export async function dashboardRoutes(fastify: FastifyInstance) {
  // ── GET /api/dashboard/overview?childId=xxx ───────────────────
  fastify.get('/overview', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { childId } = request.query as { childId?: string }

    // Bepaal welk kind we tonen
    let targetChildId = childId
    if (!targetChildId) {
      if (user.role === 'child') {
        targetChildId = user.sub
      } else {
        // Pak eerste kind van de ouder
        const link = await prisma.parentChild.findFirst({
          where: { parentId: user.sub },
          orderBy: { createdAt: 'asc' },
        })
        if (!link) return reply.status(404).send({ error: 'Geen kind gekoppeld' })
        targetChildId = link.childId
      }
    }

    // Toegangscontrole
    if (user.role === 'caregiver') {
      const access = await prisma.caregiverAccess.findFirst({
        where: { userId: user.sub, childId: targetChildId, isActive: true },
      })
      if (!access?.modules.includes('progress')) {
        return reply.status(403).send({ error: 'Geen toegang tot voortgang' })
      }
    } else if (user.role === 'parent') {
      const link = await prisma.parentChild.findFirst({
        where: { parentId: user.sub, childId: targetChildId },
      })
      if (!link) return reply.status(403).send({ error: 'Geen toegang' })
    }

    const child = await prisma.user.findUnique({
      where: { id: targetChildId },
      select: { id: true, name: true, avatarId: true, dateOfBirth: true },
    })
    if (!child) return reply.status(404).send({ error: 'Kind niet gevonden' })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // ── Vandaag-statistieken ──────────────────────────────────
    const [
      tokensEarnedToday,
      tokenBalance,
      emotionToday,
      exerciseSessionsToday,
      tasksToday,
    ] = await Promise.all([
      // Tokens verdiend vandaag
      prisma.tokenTransaction.aggregate({
        where: {
          childId: targetChildId,
          type: 'earned',
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        _sum: { amount: true },
      }),
      // Totaal saldo
      prisma.tokenTransaction.aggregate({
        where: { childId: targetChildId },
        _sum: { amount: true },
      }),
      // Laatste emotie check-in vandaag
      prisma.emotionLog.findFirst({
        where: { childId: targetChildId, createdAt: { gte: todayStart, lt: todayEnd } },
        orderBy: { createdAt: 'desc' },
      }),
      // Oefensessies vandaag
      prisma.exerciseSession.count({
        where: { childId: targetChildId, startedAt: { gte: todayStart, lt: todayEnd } },
      }),
      // Taken vandaag
      prisma.task.findMany({
        where: {
          childId: targetChildId,
          scheduledFor: { gte: todayStart, lt: todayEnd },
        },
        select: { id: true, completedAt: true },
      }),
    ])

    const tasksCompleted = tasksToday.filter(t => t.completedAt !== null).length

    // ── 7-daagse token trend ──────────────────────────────────
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
    const tokensByDay = await prisma.tokenTransaction.groupBy({
      by: ['createdAt'],
      where: {
        childId: targetChildId,
        type: 'earned',
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { amount: true },
    })

    // Maak array van 7 dagen
    const tokenTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      const dayTransactions = tokensByDay.filter(t =>
        new Date(t.createdAt).toISOString().slice(0, 10) === dateStr
      )
      const total = dayTransactions.reduce((sum, t) => sum + (t._sum.amount ?? 0), 0)
      return {
        date: dateStr,
        label: date.toLocaleDateString('nl-BE', { weekday: 'short' }),
        tokens: total,
      }
    })

    // ── Weekelijks emotion distributie ───────────────────────
    const emotionsThisWeek = await prisma.emotionLog.groupBy({
      by: ['level'],
      where: { childId: targetChildId, createdAt: { gte: sevenDaysAgo } },
      _count: true,
    })

    // ── Oefennauwkeurigheid per vak ───────────────────────────
    const exerciseStats = await prisma.exerciseSessionItem.groupBy({
      by: ['isCorrect'],
      where: {
        session: {
          childId: targetChildId,
          startedAt: { gte: sevenDaysAgo },
        },
      },
      _count: true,
    })
    const correctCount = exerciseStats.find(s => s.isCorrect === true)?._count ?? 0
    const wrongCount = exerciseStats.find(s => s.isCorrect === false)?._count ?? 0
    const totalAnswers = correctCount + wrongCount

    // ── Activiteitsfeed ───────────────────────────────────────
    const [recentTokens, recentEmotions, recentSessions] = await Promise.all([
      prisma.tokenTransaction.findMany({
        where: { childId: targetChildId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, amount: true, type: true, sourceType: true, note: true, createdAt: true },
      }),
      prisma.emotionLog.findMany({
        where: { childId: targetChildId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, level: true, note: true, createdAt: true },
      }),
      prisma.exerciseSession.findMany({
        where: { childId: targetChildId, startedAt: { gte: sevenDaysAgo } },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: { id: true, subject: true, startedAt: true, completedAt: true, durationSeconds: true },
      }),
    ])

    // Merge en sorteer activiteitsfeed
    const feed = [
      ...recentTokens.map(t => ({
        id: t.id,
        type: 'token' as const,
        icon: t.amount > 0 ? '⭐' : '🛍️',
        text: t.note
          ? `${t.note} — ${t.amount > 0 ? '+' : ''}${t.amount} tokens`
          : `${sourceLabel(t.sourceType)} — ${t.amount > 0 ? '+' : ''}${t.amount} tokens`,
        time: t.createdAt,
      })),
      ...recentEmotions.map(e => ({
        id: e.id,
        type: 'emotion' as const,
        icon: emotionIcon(e.level),
        text: `Emotie check-in: ${emotionLabel(e.level)}${e.note ? ` — ${e.note}` : ''}`,
        time: e.createdAt,
      })),
      ...recentSessions.map(s => ({
        id: s.id,
        type: 'exercise' as const,
        icon: '📚',
        text: `${subjectLabel(s.subject)} sessie${s.completedAt ? ' afgerond' : ' gestart'}${s.durationSeconds ? ` (${Math.round(s.durationSeconds / 60)} min)` : ''}`,
        time: s.startedAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20)

    return {
      child: {
        id: child.id,
        name: child.name,
        avatarId: child.avatarId,
        age: child.dateOfBirth
          ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      },
      today: {
        tokensEarned: tokensEarnedToday._sum.amount ?? 0,
        tokenBalance: tokenBalance._sum.amount ?? 0,
        emotion: emotionToday
          ? { level: emotionToday.level, icon: emotionIcon(emotionToday.level), label: emotionLabel(emotionToday.level) }
          : null,
        exerciseSessions: exerciseSessionsToday,
        tasksCompleted,
        tasksTotal: tasksToday.length,
      },
      charts: {
        tokenTrend,
        emotions: emotionsThisWeek.map(e => ({
          level: e.level,
          label: emotionLabel(e.level),
          icon: emotionIcon(e.level),
          count: e._count,
        })),
        exerciseAccuracy: {
          correct: correctCount,
          wrong: wrongCount,
          total: totalAnswers,
          percentage: totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : null,
        },
      },
      feed,
    }
  })
}

// ── Helpers ───────────────────────────────────────────────────

function emotionIcon(level: string) {
  const map: Record<string, string> = {
    great: '😄', good: '😊', okay: '😐', sad: '😢', angry: '😤',
  }
  return map[level] ?? '😊'
}

function emotionLabel(level: string) {
  const map: Record<string, string> = {
    great: 'Super goed', good: 'Goed', okay: 'Gaat wel', sad: 'Verdrietig', angry: 'Boos',
  }
  return map[level] ?? level
}

function subjectLabel(subject: string) {
  const map: Record<string, string> = {
    math: 'Wiskunde', language: 'Taal', spelling: 'Spelling',
    reading: 'Lezen', world: 'Wereldoriëntatie',
  }
  return map[subject] ?? subject
}

function sourceLabel(sourceType: string) {
  const map: Record<string, string> = {
    activity: 'Activiteit', task: 'Taak', task_step: 'Taakstap',
    exercise: 'Oefening', exercise_session: 'Oefensessie',
    emotion_checkin: 'Emotie check-in', morning_routine: 'Ochtendroutine',
    bedtime_routine: 'Bedtijdroutine', streak: 'Streak bonus',
    manual: 'Manueel toegekend', redeemed: 'Ingewisseld',
  }
  return map[sourceType] ?? sourceType
}
