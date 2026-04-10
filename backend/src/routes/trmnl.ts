/**
 * TRMNL E-Paper Display Plugin — HTML markup voor e-ink scherm in de keuken.
 * TRMNL pollt periodiek dit endpoint en rendert de HTML als e-ink afbeelding.
 *
 * Documentatie: https://docs.usetrmnl.com/go/private-plugins
 */
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const DAY_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MONTH_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function formatDate(d: Date) {
  return `${DAY_NL[d.getDay()]} ${d.getDate()} ${MONTH_NL[d.getMonth()]}`
}

function tokenBar(current: number, target: number, maxWidth = 24): string {
  const pct = Math.min(current / target, 1)
  const filled = Math.round(pct * maxWidth)
  return '█'.repeat(filled) + '░'.repeat(maxWidth - filled)
}

export async function trmnlRoutes(fastify: FastifyInstance) {
  // ── POST /api/trmnl/markup — Markup voor TRMNL plugin ────────
  // TRMNL stuurt POST met JSON body { user_uuid, ... }
  fastify.post('/markup', async (request, reply) => {
    const body = request.body as { user_uuid?: string }
    const userUuid = body?.user_uuid

    // Auth via user_uuid (TRMNL identifier gekoppeld aan kind)
    const device = userUuid
      ? await prisma.trmnlDevice.findFirst({ where: { userUuid, isActive: true } })
      : null

    if (!device) {
      // Fallback: gebruik de eerste actieve child (development mode)
      const fallbackChild = await prisma.user.findFirst({
        where: { role: 'child', isActive: true },
        select: { id: true },
      })
      if (!fallbackChild) {
        return { markup: '<div class="layout"><div class="title_bar"><span class="title">GRIP</span><span class="instance">Geen kind geconfigureerd</span></div></div>' }
      }
      return buildMarkup(fallbackChild.id)
    }

    return buildMarkup(device.childId)
  })

  // ── GET /api/trmnl/markup — Fallback voor browser preview ─────
  fastify.get('/markup', async (request, reply) => {
    const fallbackChild = await prisma.user.findFirst({
      where: { role: 'child', isActive: true },
      select: { id: true },
    })
    if (!fallbackChild) {
      return reply.type('text/html').send('<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#eee"><h1>GRIP TRMNL Plugin</h1><p>Geen kind geconfigureerd. Dit endpoint wordt gebruikt door TRMNL via POST.</p></body></html>')
    }
    const data = await buildMarkup(fallbackChild.id)
    return reply.type('text/html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>GRIP TRMNL Preview</title><style>body{margin:0;padding:20px;background:#111;color:#eee;font-family:'Inter',sans-serif}.layout{background:#fff;color:#000;padding:20px;border-radius:8px;max-width:800px;margin:0 auto}.title_bar{display:flex;justify-content:space-between;border-top:1px solid #ccc;margin-top:16px;padding-top:8px}.title{font-weight:bold}.item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}.label{font-size:14px}.value{font-size:14px;font-weight:600}.tag_columns{display:flex;gap:8px;margin-top:12px}.tag{background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:12px}h2{color:#fff;text-align:center;margin-bottom:16px}</style></head><body><h2>GRIP TRMNL Preview (monochroom)</h2>${data.markup}<h2 style="margin-top:32px">Half Vertical</h2>${data.markup_half_vertical}<h2 style="margin-top:32px">Quadrant</h2>${data.markup_quadrant}</body></html>`)
  })

  // ── GET /api/trmnl/preview/:childId — Preview voor admin ─────
  fastify.get('/preview/:childId', async (request, reply) => {
    const { childId } = request.params as { childId: string }
    return buildMarkup(childId)
  })

  // ── POST /api/trmnl/link — Koppel TRMNL device aan kind ──────
  fastify.post('/link', async (request, reply) => {
    const { childId, userUuid } = request.body as { childId: string; userUuid: string }
    if (!childId || !userUuid) return reply.status(400).send({ error: 'childId en userUuid vereist' })

    const accessToken = crypto.randomBytes(24).toString('hex')
    const device = await prisma.trmnlDevice.upsert({
      where: { childId },
      update: { userUuid, accessToken, isActive: true },
      create: { childId, userUuid, accessToken },
    })
    return { device: { id: device.id, childId: device.childId, userUuid: device.userUuid } }
  })

  // ── GET /api/trmnl/plugin.zip — Download TRMNL plugin als ZIP ─
  fastify.get('/plugin.zip', async (request, reply) => {
    const fs = await import('fs')
    const path = await import('path')
    const { createGzip } = await import('zlib')

    // Archiver is er niet, gebruik een simpele ZIP via raw bytes
    // We bouwen een minimale ZIP met de 4 bestanden
    const pluginDir = path.join(__dirname, '..', 'trmnl-plugin')
    const files = ['settings.yml', 'full.liquid', 'half_vertical.liquid', 'quadrant.liquid']

    // Gebruik de ingebouwde node stream + archiver-vrije aanpak
    // Stuur individuele bestanden als multipart? Nee, beter: genereer ZIP in-memory
    try {
      const archiver = await import('archiver')
      const archive = archiver.default('zip', { zlib: { level: 9 } })
      reply.header('Content-Type', 'application/zip')
      reply.header('Content-Disposition', 'attachment; filename="grip-trmnl-plugin.zip"')

      for (const file of files) {
        const filePath = path.join(pluginDir, file)
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf-8')
          // Inject APP_URL in settings.yml default
          if (file === 'settings.yml') {
            const appUrl = process.env.APP_URL ?? 'https://jouw-grip-url.be'
            content = content.replace('https://julie.scheepers.one', appUrl)
          }
          archive.append(content, { name: file })
        }
      }

      archive.finalize()
      return reply.send(archive)
    } catch {
      // Fallback: serve settings.yml als JSON config
      const appUrl = process.env.APP_URL ?? 'https://jouw-grip-url.be'
      reply.header('Content-Type', 'application/json')
      reply.header('Content-Disposition', 'attachment; filename="grip-trmnl-plugin.json"')
      return {
        name: 'GRIP — Dagplanning & Tokens',
        description: 'Installeer als TRMNL private plugin.',
        polling_url: `${appUrl}/api/trmnl/markup`,
        refresh_rate: 900,
        note: 'ZIP-generatie niet beschikbaar — installeer de plugin bestanden handmatig vanuit de /backend/src/trmnl-plugin/ map.',
      }
    }
  })

  // ── GET /api/trmnl/plugin-config — JSON config (legacy) ─────
  fastify.get('/plugin-config', async (request, reply) => {
    const appUrl = process.env.APP_URL ?? 'https://jouw-grip-url.be'
    const webhookUrl = `${appUrl}/api/trmnl/markup`
    reply.header('Content-Type', 'application/json')
    return {
      name: 'GRIP — Groei Routine Inzicht Planning',
      description: 'Toont de dagplanning en token-voortgang van je kind op je TRMNL e-ink scherm.',
      webhook_url: webhookUrl,
      polling_url: webhookUrl,
      refresh_rate: 900,
      screens: { full: 'Dagplanning', half_vertical: 'Tokens', quadrant: 'Nu bezig' },
      install_steps: [
        '1. Download grip-trmnl-plugin.zip via /api/trmnl/plugin.zip',
        '2. Ga naar usetrmnl.com → Plugins → Private → Import',
        '3. Upload de ZIP',
        '4. Vul je GRIP Server URL in bij de plugin-instellingen',
        '5. Wijs de plugin toe aan je apparaat',
      ],
    }
  })

  // ── GET /api/trmnl/status — TRMNL koppeling status ────────────
  fastify.get('/status', async () => {
    const devices = await prisma.trmnlDevice.findMany({
      include: { child: { select: { name: true } } },
    })
    return {
      devices: devices.map(d => ({
        id: d.id,
        childName: d.child.name,
        userUuid: d.userUuid,
        isActive: d.isActive,
        screens: d.screens,
        refreshMinutes: d.refreshMinutes,
      })),
    }
  })
}

async function buildMarkup(childId: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Haal alle data tegelijk op
  const [child, schedule, tokenData, nextReward, todayEarned, lastEmotion] = await Promise.all([
    prisma.user.findUnique({ where: { id: childId }, select: { name: true } }),
    prisma.schedule.findFirst({
      where: { userId: childId, dayOfWeek: now.getDay(), isActive: true },
      include: { activities: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.tokenTransaction.aggregate({
      where: { childId },
      _sum: { amount: true },
    }),
    prisma.reward.findFirst({
      where: { childId: childId, isAvailable: true },
      orderBy: { costTokens: 'asc' },
    }),
    prisma.tokenTransaction.aggregate({
      where: { childId, type: 'earned', createdAt: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.emotionLog.findFirst({
      where: { childId, createdAt: { gte: todayStart, lt: todayEnd } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const name = child?.name ?? 'Julie'
  const balance = tokenData._sum.amount ?? 0
  const earnedToday = todayEarned._sum.amount ?? 0
  const activities = schedule?.activities ?? []

  // Bepaal huidige activiteit
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const current = activities.find(a => {
    const [h, m] = a.startTime.split(':').map(Number)
    const start = h * 60 + m
    const end = start + a.durationMinutes
    return nowMinutes >= start && nowMinutes < end
  })
  const upcoming = activities.find(a => {
    const [h, m] = a.startTime.split(':').map(Number)
    return h * 60 + m > nowMinutes
  })

  const EMOTION_ICON: Record<string, string> = {
    great: '😄', good: '😊', okay: '😐', sad: '😢', angry: '😤',
  }

  // ── Full layout: Dagoverzicht ──────────────────────────────
  const activityRows = activities.slice(0, 7).map(a => {
    const [h, m] = a.startTime.split(':').map(Number)
    const start = h * 60 + m
    const isPast = nowMinutes > start + a.durationMinutes
    const isCurrent = current?.id === a.id
    const marker = isPast ? '✅' : isCurrent ? '▶' : '○'
    return `<div class="item">
      <span class="label">${marker} ${a.title}</span>
      <span class="value">${a.startTime}</span>
    </div>`
  }).join('')

  const nextRewardBar = nextReward
    ? `${tokenBar(balance, nextReward.costTokens)} ${balance}/${nextReward.costTokens}`
    : `⭐ ${balance} tokens`

  const markup = `<div class="layout">
  <div class="columns">
    <div class="column">
      <span class="title title--small">${name}'s dag</span>
      <div class="content">
        <div class="data-list">
          ${activityRows || '<div class="item"><span class="label">Geen schema vandaag</span></div>'}
        </div>
      </div>
      <div class="tag_columns">
        <span class="tag">⭐ ${balance}</span>
        <span class="tag">${nextReward ? `Nog ${Math.max(0, nextReward.costTokens - balance)} → ${nextReward.title}` : 'Goed bezig!'}</span>
        ${lastEmotion ? `<span class="tag">${EMOTION_ICON[lastEmotion.level]}</span>` : ''}
      </div>
    </div>
  </div>
  <div class="title_bar">
    <span class="title">GRIP</span>
    <span class="instance">${formatDate(now)}</span>
  </div>
</div>`

  // ── Half vertical: Token voortgang ──────────────────────────
  const streakDays = await getStreak(childId)
  const markup_half_vertical = `<div class="layout layout--half">
  <div class="columns">
    <div class="column">
      <span class="title title--small">⭐ Tokens</span>
      <div class="content">
        <div class="data-list">
          <div class="item">
            <span class="label">Saldo</span>
            <span class="value">⭐ ${balance}</span>
          </div>
          <div class="item">
            <span class="label">Vandaag</span>
            <span class="value">+${earnedToday}</span>
          </div>
          ${nextReward ? `<div class="item">
            <span class="label">${nextReward.title}</span>
            <span class="value">${nextReward.costTokens} ⭐</span>
          </div>
          <div class="item">
            <span class="label">${nextRewardBar}</span>
          </div>` : ''}
          ${streakDays > 1 ? `<div class="item"><span class="label">🔥 ${streakDays} dagen streak!</span></div>` : ''}
        </div>
      </div>
    </div>
  </div>
  <div class="title_bar">
    <span class="title">GRIP</span>
    <span class="instance">${name}</span>
  </div>
</div>`

  // ── Quadrant: Nu Doen ───────────────────────────────────────
  const currentActivity = current ?? upcoming
  const markup_quadrant = `<div class="layout layout--quadrant">
  <div class="columns">
    <div class="column">
      <span class="title title--small">${current ? '▶ NU' : upcoming ? 'STRAKS' : 'VANDAAG'}</span>
      <div class="content">
        ${currentActivity
          ? `<p style="font-size:18px;font-weight:bold;margin:8px 0">${currentActivity.icon ?? ''} ${currentActivity.title}</p>
             <p style="font-size:13px">${currentActivity.startTime} · ${currentActivity.durationMinutes} min</p>`
          : `<p style="font-size:14px">Geen activiteiten meer vandaag</p>`}
      </div>
      <div class="tag_columns">
        <span class="tag">⭐ ${balance}</span>
      </div>
    </div>
  </div>
  <div class="title_bar">
    <span class="title">GRIP</span>
    <span class="instance">${name}</span>
  </div>
</div>`

  return { markup, markup_half_vertical, markup_quadrant }
}

async function getStreak(childId: string): Promise<number> {
  const now = new Date()
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const count = await prisma.tokenTransaction.count({
      where: { childId, type: 'earned', createdAt: { gte: dayStart, lt: dayEnd } },
    })
    if (count === 0) break
    streak++
  }
  return streak
}
