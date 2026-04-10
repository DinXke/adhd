/**
 * TRMNL E-Paper Display Plugin — HTML markup voor e-ink scherm in de keuken.
 * TRMNL pollt periodiek dit endpoint en rendert de HTML als e-ink afbeelding.
 *
 * Documentatie: https://docs.usetrmnl.com/go/private-plugins
 */
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { redis } from '../lib/redis'
import { requireParent } from '../middleware/auth'

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

  // ── POST /api/trmnl/generate-token — Genereer TRMNL API token ──
  fastify.post('/generate-token', { preHandler: requireParent }, async (request) => {
    const { childId } = request.body as { childId: string }
    if (!childId) throw { statusCode: 400, message: 'childId is verplicht' }
    const token = crypto.randomBytes(16).toString('hex') // 32 hex chars
    await redis.set(`trmnl-token:${childId}`, token)
    return { token, childId }
  })

  // ── POST /api/trmnl/markup — Markup voor TRMNL plugin ────────
  // TRMNL stuurt POST met JSON body { user_uuid, api_key?, ... }
  fastify.post('/markup', async (request, reply) => {
    const body = request.body as { user_uuid?: string; api_key?: string }
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

    // Validate api_key from body or Bearer token from Authorization header
    const apiKey = body?.api_key ?? extractBearerToken(request.headers.authorization)
    const storedToken = await redis.get(`trmnl-token:${device.childId}`)
    if (storedToken && (!apiKey || apiKey !== storedToken)) {
      return reply.status(403).send({ error: 'Ongeldig TRMNL API token' })
    }

    return buildMarkup(device.childId)
  })

  // ── GET /api/trmnl/markup — Fallback voor browser preview ─────
  fastify.get('/markup', async (request, reply) => {
    const { token } = request.query as { token?: string }

    // When a token is configured for any child, require it
    if (token) {
      // Validate token against all stored trmnl-tokens
      const valid = await validateTrmnlTokenAny(token)
      if (!valid) {
        return reply.status(403).send({ error: 'Ongeldig TRMNL token' })
      }
    }

    const fallbackChild = await prisma.user.findFirst({
      where: { role: 'child', isActive: true },
      select: { id: true },
    })
    if (!fallbackChild) {
      return reply.type('text/html').send('<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#eee"><h1>GRIP TRMNL Plugin</h1><p>Geen kind geconfigureerd. Dit endpoint wordt gebruikt door TRMNL via POST.</p></body></html>')
    }

    // If a token was required but not provided, check if one is configured
    if (!token) {
      const storedToken = await redis.get(`trmnl-token:${fallbackChild.id}`)
      if (storedToken) {
        return reply.status(401).send({ error: 'Token vereist als query parameter: ?token=xxx' })
      }
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
    const appUrl = process.env.APP_URL ?? 'https://jouw-grip-url.be'

    // Inline file contents (no disk dependency)
    const files: Record<string, string> = {
      'settings.yml': `name: "GRIP - Dagplanning & Tokens"
description: "Toont de dagplanning en token-voortgang van je kind (ADHD-app) op je TRMNL e-ink scherm."
strategy: polling
polling_url: "{{grip_url}}/api/trmnl/markup"
polling_verb: POST
polling_headers:
  Content-Type: application/json
  Authorization: "Bearer {{api_key}}"
polling_body: '{"user_uuid":"{{user_uuid}}","api_key":"{{api_key}}"}'
refresh_rate: 900
custom_fields:
  - name: grip_url
    label: "GRIP Server URL"
    type: text
    placeholder: "${appUrl}"
    hint: "Het adres van je GRIP-installatie (zonder trailing slash)"
    required: true
  - name: user_uuid
    label: "TRMNL User UUID"
    type: text
    placeholder: "Je TRMNL user UUID (zie account-instellingen)"
    hint: "Wordt automatisch meegegeven, laat leeg indien onzeker"
    required: false
  - name: api_key
    label: "API Key"
    type: text
    placeholder: "Genereer via GRIP admin → TRMNL → Token genereren"
    hint: "Beveiligingstoken voor toegang tot de markup-API"
    required: true`,

      'full.liquid': `<div class="layout">
  <div class="columns"><div class="column">
    <span class="title title--small">{{ title }}</span>
    <div class="content"><div class="data-list" data-list-limit="true" data-list-max-height="340">
      {% for item in activities %}<div class="item"><span class="label">{{ item.marker }} {{ item.title }}</span><span class="value">{{ item.time }}</span></div>{% endfor %}
      {% if activities.size == 0 %}<div class="item"><span class="label">Geen schema vandaag</span></div>{% endif %}
    </div></div>
    <div class="tag_columns"><span class="tag">{{ token_tag }}</span><span class="tag">{{ reward_tag }}</span>{% if emotion_tag %}<span class="tag">{{ emotion_tag }}</span>{% endif %}</div>
  </div></div>
  <div class="title_bar"><span class="title">GRIP</span><span class="instance">{{ date_display }}</span></div>
</div>`,

      'half_vertical.liquid': `<div class="layout layout--half">
  <div class="columns"><div class="column">
    <span class="title title--small">Tokens</span>
    <div class="content"><div class="data-list">
      <div class="item"><span class="label">Saldo</span><span class="value">{{ balance }} st</span></div>
      <div class="item"><span class="label">Vandaag</span><span class="value">+{{ earned_today }}</span></div>
      {% if next_reward_title %}<div class="item"><span class="label">{{ next_reward_title }}</span><span class="value">{{ next_reward_cost }} st</span></div>
      <div class="item"><span class="label">{{ progress_bar }}</span></div>{% endif %}
      {% if streak > 1 %}<div class="item"><span class="label">{{ streak }}d streak!</span></div>{% endif %}
    </div></div>
  </div></div>
  <div class="title_bar"><span class="title">GRIP</span><span class="instance">{{ child_name }}</span></div>
</div>`,

      'quadrant.liquid': `<div class="layout layout--quadrant">
  <div class="columns"><div class="column">
    <span class="title title--small">{{ status_label }}</span>
    <div class="content">
      {% if current_title %}<p style="font-size:18px;font-weight:bold;margin:8px 0">{{ current_icon }} {{ current_title }}</p>
      <p style="font-size:13px">{{ current_time }} - {{ current_duration }} min</p>
      {% else %}<p style="font-size:14px">Geen activiteiten meer vandaag</p>{% endif %}
    </div>
    <div class="tag_columns"><span class="tag">{{ balance }} st</span></div>
  </div></div>
  <div class="title_bar"><span class="title">GRIP</span><span class="instance">{{ child_name }}</span></div>
</div>`,
    }

    try {
      const archiver = await import('archiver')
      const archive = archiver.default('zip', { zlib: { level: 9 } })
      reply.header('Content-Type', 'application/zip')
      reply.header('Content-Disposition', 'attachment; filename="grip-trmnl-plugin.zip"')

      for (const [name, content] of Object.entries(files)) {
        archive.append(content, { name })
      }

      archive.finalize()
      return reply.send(archive)
    } catch (err) {
      // Fallback: serve als JSON
      reply.header('Content-Type', 'application/json')
      reply.header('Content-Disposition', 'attachment; filename="grip-trmnl-plugin.json"')
      return { error: 'ZIP generatie mislukt', files: Object.keys(files), note: 'Installeer archiver: npm install archiver' }
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

function extractBearerToken(header?: string): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+(\S+)$/i)
  return match ? match[1] : null
}

/** Check if a token matches any stored trmnl-token for any child */
async function validateTrmnlTokenAny(token: string): Promise<boolean> {
  // Scan Redis for trmnl-token:* keys and compare
  let cursor = '0'
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'trmnl-token:*', 'COUNT', 100)
    cursor = nextCursor
    for (const key of keys) {
      const stored = await redis.get(key)
      if (stored === token) return true
    }
  } while (cursor !== '0')
  return false
}

async function buildMarkup(childId: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Haal alle data tegelijk op
  const [child, schedule, tokenData, allRewards, todayEarned, lastEmotion] = await Promise.all([
    prisma.user.findUnique({ where: { id: childId }, select: { name: true } }),
    prisma.schedule.findFirst({
      where: { userId: childId, dayOfWeek: now.getDay(), isActive: true },
      include: { activities: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.tokenTransaction.aggregate({
      where: { childId },
      _sum: { amount: true },
    }),
    prisma.reward.findMany({
      where: { childId, isAvailable: true },
      orderBy: { costTokens: 'asc' },
      take: 5,
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
  const nextReward = allRewards[0] ?? null

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

  // Bouw monochrome voortgangsbalk met doelen
  // E-ink: alleen █ ░ ▓ en ASCII-tekens
  function rewardProgressBar(bal: number, rewards: typeof allRewards): string {
    if (rewards.length === 0) return `⭐ ${bal} tokens`
    const maxCost = rewards[rewards.length - 1].costTokens
    const barWidth = 28
    const filledWidth = Math.min(Math.round((bal / maxCost) * barWidth), barWidth)
    let bar = ''
    for (let i = 0; i < barWidth; i++) {
      // Check if a reward milestone falls at this position
      const milestone = rewards.find(r => {
        const pos = Math.round((r.costTokens / maxCost) * barWidth)
        return pos === i + 1
      })
      if (milestone) {
        bar += bal >= milestone.costTokens ? '◆' : '◇'
      } else {
        bar += i < filledWidth ? '█' : '░'
      }
    }
    return bar
  }

  const progressBar = rewardProgressBar(balance, allRewards)

  // Doelen-legenda voor half-vertical
  const goalsLegend = allRewards.map(r => {
    const reached = balance >= r.costTokens
    return `<div class="item"><span class="label">${reached ? '◆' : '◇'} ${r.title}</span><span class="value">${r.costTokens} ⭐</span></div>`
  }).join('')

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

  const markup = `<div class="layout">
  <div class="columns">
    <div class="column">
      <span class="title title--small">${name}'s dag</span>
      <div class="content">
        <div class="data-list">
          ${activityRows || '<div class="item"><span class="label">Geen schema vandaag</span></div>'}
        </div>
      </div>
      <div style="margin-top:8px;font-family:monospace;font-size:11px;letter-spacing:1px;color:#333">${progressBar}</div>
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

  // ── Half vertical: Token voortgang met doelen ──────────────
  const streakDays = await getStreak(childId)
  const markup_half_vertical = `<div class="layout layout--half">
  <div class="columns">
    <div class="column">
      <span class="title title--small">⭐ ${balance} tokens</span>
      <div class="content">
        <div style="margin:8px 0;font-family:monospace;font-size:12px;letter-spacing:1px;color:#333">${progressBar}</div>
        <div class="data-list">
          ${goalsLegend || '<div class="item"><span class="label">Geen doelen ingesteld</span></div>'}
          <div class="item">
            <span class="label">Vandaag verdiend</span>
            <span class="value">+${earnedToday}</span>
          </div>
          ${streakDays > 1 ? `<div class="item"><span class="label">Streak</span><span class="value">${streakDays} dagen</span></div>` : ''}
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
