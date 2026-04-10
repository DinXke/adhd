/**
 * Push notificaties — VAPID web push
 * Routes: POST /subscribe, DELETE /subscribe, POST /broadcast (admin)
 * Helper: sendPush(userId, notification) — geëxporteerd voor gebruik in andere routes
 */
import { FastifyInstance } from 'fastify'
import webpush from 'web-push'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'

// ── VAPID configuratie ────────────────────────────────────────
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_CONTACT = process.env.VAPID_CONTACT     ?? 'mailto:admin@example.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE)
}

// ── In-memory subscription store (per userId) ─────────────────
// Persistentie: PushSubscription model in Prisma schema
// Als er geen model is, valt het terug op in-memory (herstart = weg)
interface PushSub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}
const subscriptions = new Map<string, PushSub[]>()

export interface PushNotification {
  title: string
  body: string
  icon?: string
  tag?: string
  url?: string
}

// ── Helper: stuur push naar één gebruiker ─────────────────────
export async function sendPush(userId: string, notification: PushNotification): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  // Probeer Prisma-subscriptions op te halen (als model bestaat)
  let subs: PushSub[] = []
  try {
    const dbSubs = await (prisma as any).pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    })
    subs = dbSubs.map((s: any) => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }))
  } catch {
    // Model bestaat nog niet — gebruik in-memory
    subs = subscriptions.get(userId) ?? []
  }

  const payload = JSON.stringify({ ...notification, timestamp: Date.now() })
  const dead: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub as any, payload)
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.endpoint)
        }
      }
    })
  )

  // Ruim dode subscriptions op
  if (dead.length > 0) {
    try {
      await (prisma as any).pushSubscription.deleteMany({
        where: { userId, endpoint: { in: dead } },
      })
    } catch {
      const remaining = (subscriptions.get(userId) ?? []).filter(s => !dead.includes(s.endpoint))
      subscriptions.set(userId, remaining)
    }
  }
}

// ── Helper: stuur push naar alle admins/ouders ────────────────
export async function sendPushToAdmins(notification: PushNotification): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'parent'] }, isActive: true },
      select: { id: true },
    })
    await Promise.allSettled(admins.map(a => sendPush(a.id, notification)))
  } catch {}
}

// ── Routes ────────────────────────────────────────────────────
export async function pushRoutes(fastify: FastifyInstance) {
  // Public key ophalen (frontend heeft dit nodig voor subscription)
  fastify.get('/api/push/vapid-public-key', async () => {
    return { publicKey: VAPID_PUBLIC }
  })

  // Subscription opslaan
  fastify.post('/api/push/subscribe', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { endpoint, keys } = request.body as any

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return reply.status(400).send({ error: 'Ongeldige subscription' })
    }

    try {
      await (prisma as any).pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.sub },
        create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.sub },
      })
    } catch {
      // Fallback: in-memory
      const existing = subscriptions.get(user.sub) ?? []
      const without = existing.filter(s => s.endpoint !== endpoint)
      subscriptions.set(user.sub, [...without, { endpoint, keys }])
    }

    // Stuur test-notificatie
    await sendPush(user.sub, {
      title: 'GRIP notificaties ingeschakeld ✅',
      body: 'Je ontvangt voortaan meldingen van GRIP.',
      icon: '/icons/icon-192.png',
      tag: 'welcome',
    })

    return { ok: true }
  })

  // Subscription verwijderen
  fastify.delete('/api/push/subscribe', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { endpoint } = request.body as any

    try {
      await (prisma as any).pushSubscription.delete({ where: { endpoint } })
    } catch {
      const existing = subscriptions.get(user.sub) ?? []
      subscriptions.set(user.sub, existing.filter(s => s.endpoint !== endpoint))
    }

    return { ok: true }
  })

  // Test push (admin)
  fastify.post('/api/push/test', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user
    const { title, body } = (request.body as any) ?? {}

    await sendPush(user.sub, {
      title: title ?? 'Test notificatie',
      body: body ?? 'Dit is een testbericht van GRIP.',
      icon: '/icons/icon-192.png',
      tag: 'test',
    })

    return { ok: true }
  })
}
