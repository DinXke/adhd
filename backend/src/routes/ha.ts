/**
 * Home Assistant integratie — webhooks voor slimme thuisautomatisering.
 * Triggers kunnen zowel manueel als automatisch (via scheduler) worden gestuurd.
 */
import { FastifyInstance } from 'fastify'
import { requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'

// Beschikbare HA-triggers met hun beschrijving
export const HA_TRIGGERS = {
  activity_start: { label: 'Activiteit start', description: 'Gestuurd bij start van een activiteit' },
  activity_warning_5min: { label: '5 min waarschuwing', description: 'Gestuurd 5 minuten voor activiteitwisseling' },
  activity_warning_1min: { label: '1 min waarschuwing', description: 'Gestuurd 1 minuut voor activiteitwisseling' },
  morning_routine_start: { label: 'Ochtendroutine start', description: 'Gestuurd bij start ochtendroutine' },
  bedtime_routine_start: { label: 'Bedtijdroutine start', description: 'Gestuurd bij start bedtijdroutine' },
  all_tasks_done: { label: 'Alle taken af', description: 'Gestuurd wanneer alle taken van de dag zijn afgerond' },
  emotion_negative: { label: 'Negatieve emotie', description: 'Gestuurd bij emotie check-in "verdrietig" of "boos"' },
  token_milestone: { label: 'Token mijlpaal bereikt', description: 'Gestuurd wanneer een beloningsdoel bereikt is' },
} as const

export type HaTrigger = keyof typeof HA_TRIGGERS

/**
 * Stuur een webhook naar Home Assistant.
 * HA-kant: maak een automatisering met trigger type "webhook" en de gewenste webhook_id.
 */
export async function sendHaWebhook(
  trigger: HaTrigger,
  payload: Record<string, unknown> = {}
): Promise<boolean> {
  const haUrl = process.env.HA_URL?.replace(/\/$/, '')
  const haToken = process.env.HA_TOKEN

  if (!haUrl || !haToken) return false

  try {
    const webhookId = `grip_${trigger}`
    const res = await fetch(`${haUrl}/api/webhook/${webhookId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${haToken}`,
      },
      body: JSON.stringify({
        trigger,
        ...payload,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    })
    return res.ok || res.status === 200
  } catch {
    // HA is niet bereikbaar — geen fatale fout
    return false
  }
}

export async function haRoutes(fastify: FastifyInstance) {
  // ── GET /api/ha/status — HA configuratiestatus ────────────────
  fastify.get('/status', { preHandler: requireRole(Role.parent, Role.admin) }, async () => {
    const configured = !!(process.env.HA_URL && process.env.HA_TOKEN)
    return {
      configured,
      haUrl: configured ? process.env.HA_URL : null,
      triggers: Object.entries(HA_TRIGGERS).map(([key, val]) => ({
        key,
        ...val,
        webhookId: `grip_${key}`,
      })),
    }
  })

  // ── POST /api/ha/test — Testbericht sturen ────────────────────
  fastify.post('/test', { preHandler: requireRole(Role.parent, Role.admin) }, async (request, reply) => {
    const { trigger = 'all_tasks_done' } = request.body as { trigger?: HaTrigger }

    if (!process.env.HA_URL || !process.env.HA_TOKEN) {
      return reply.status(503).send({
        error: 'Home Assistant niet geconfigureerd. Voeg HA_URL en HA_TOKEN toe aan .env',
      })
    }

    const ok = await sendHaWebhook(trigger as HaTrigger, { test: true, source: 'grip-manual-test' })
    return {
      success: ok,
      message: ok
        ? `Webhook 'grip_${trigger}' succesvol verstuurd naar HA`
        : `Webhook verstuurd maar geen bevestiging ontvangen — check je HA-automatie`,
      webhookId: `grip_${trigger}`,
    }
  })
}
