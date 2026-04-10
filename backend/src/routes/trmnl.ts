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

// ── Dashboard block types & renderers ────────────────────────
const BLOCK_TYPES = [
  'dagplanning', 'token_saldo', 'token_voortgang', 'huidige_activiteit',
  'emotie', 'afspraken', 'streak', 'wist_je_dat', 'spaarpot',
] as const
type BlockType = typeof BLOCK_TYPES[number]

interface DashboardBlock { type: BlockType; config?: Record<string, unknown> }
interface Dashboard {
  id: string; childId: string; name: string
  layout: 'full' | 'half_vertical' | 'quadrant'
  blocks: DashboardBlock[]
  createdAt: string
}

// Fun facts rotatie
const FUN_FACTS = [
  'Een octopus heeft drie harten.',
  'Honing kan duizenden jaren goed blijven.',
  'Koala\'s slapen 22 uur per dag.',
  'Bananen zijn technisch gezien bessen.',
  'De Eiffeltoren is in de zomer 15 cm hoger.',
  'Een slak kan 3 jaar slapen.',
  'Een groep flamingo\'s heet een "flamboyance".',
  'De maan drijft elk jaar 3,8 cm weg van de aarde.',
]

interface BlockData {
  activities: { id: string; title: string; icon: string | null; startTime: string; durationMinutes: number }[]
  balance: number
  earnedToday: number
  streakDays: number
  allRewards: { id: string; title: string; costTokens: number }[]
  nextReward: { title: string; costTokens: number } | null
  currentActivity: { title: string; icon: string | null; startTime: string; durationMinutes: number } | null
  isCurrent: boolean
  lastEmotion: { level: string; createdAt: Date } | null
  name: string
  now: Date
  moneyBalance?: number
  moneyGoal?: { name: string; targetAmount: number } | null
}

function renderBlock(type: BlockType, data: BlockData): string {
  const EMOTION_ICON: Record<string, string> = {
    great: ':-)', good: ':)', okay: ':-|', sad: ':-(', angry: '>:(',
  }
  switch (type) {
    case 'dagplanning': {
      const nowMin = data.now.getHours() * 60 + data.now.getMinutes()
      const rows = data.activities.slice(0, 7).map(a => {
        const [h, m] = a.startTime.split(':').map(Number)
        const start = h * 60 + m
        const isPast = nowMin > start + a.durationMinutes
        const isCur = data.currentActivity?.startTime === a.startTime && data.isCurrent
        const marker = isPast ? '✅' : isCur ? '▶' : '○'
        return `<div class="item"><span class="label">${marker} ${a.title}</span><span class="value">${a.startTime}</span></div>`
      }).join('')
      return `<span class="title title--small">Dagplanning</span><div class="data-list">${rows || '<div class="item"><span class="label">Geen schema vandaag</span></div>'}</div>`
    }
    case 'token_saldo': {
      // Balk met sterretjes: ★ voor huidige stand, ☆ voor komende doelen
      const saldoBar = buildStarBar(data.balance, data.allRewards)
      return `<span class="title title--small">Tokens: ${data.balance}</span>${saldoBar}<div class="data-list"><div class="item"><span class="label">Vandaag verdiend</span><span class="value">+${data.earnedToday}</span></div>${data.streakDays > 1 ? `<div class="item"><span class="label">Streak</span><span class="value">${data.streakDays} dagen</span></div>` : ''}</div>`
    }
    case 'token_voortgang': {
      if (data.allRewards.length === 0) return `<span class="title title--small">Voortgang</span><div class="data-list"><div class="item"><span class="label">${data.balance} tokens — geen doelen</span></div></div>`
      const starBar = buildStarBar(data.balance, data.allRewards)
      const goals = data.allRewards.map(r => {
        const reached = data.balance >= r.costTokens
        return `<div class="item"><span class="label">${reached ? '★' : '☆'} ${r.title}</span><span class="value">${r.costTokens} st</span></div>`
      }).join('')
      return `<span class="title title--small">Voortgang</span>${starBar}<div class="data-list">${goals}</div>`
    }
    case 'huidige_activiteit': {
      const act = data.currentActivity
      if (!act) return `<span class="title title--small">${data.isCurrent ? '▶ NU' : 'VANDAAG'}</span><p style="font-size:14px">Geen activiteiten meer</p>`
      return `<span class="title title--small">${data.isCurrent ? '▶ NU' : 'STRAKS'}</span><p style="font-size:18px;font-weight:bold;margin:8px 0">${act.icon ?? ''} ${act.title}</p><p style="font-size:13px">${act.startTime} · ${act.durationMinutes} min</p>`
    }
    case 'emotie': {
      if (!data.lastEmotion) return `<span class="title title--small">Emotie</span><div class="data-list"><div class="item"><span class="label">Nog geen check-in vandaag</span></div></div>`
      const icon = EMOTION_ICON[data.lastEmotion.level] ?? data.lastEmotion.level
      return `<span class="title title--small">Emotie</span><div class="data-list"><div class="item"><span class="label">Vandaag</span><span class="value">${icon} ${data.lastEmotion.level}</span></div></div>`
    }
    case 'afspraken':
      return `<span class="title title--small">Afspraken</span><div class="data-list"><div class="item"><span class="label">Zie dagplanning</span></div></div>`
    case 'streak':
      return `<span class="title title--small">Streak</span><div class="data-list"><div class="item"><span class="label">${data.streakDays > 0 ? `${data.streakDays} dag${data.streakDays !== 1 ? 'en' : ''} op rij!` : 'Begin vandaag!'}</span></div></div>`
    case 'wist_je_dat': {
      const dayIdx = Math.floor(data.now.getTime() / 86400000) % FUN_FACTS.length
      return `<span class="title title--small">Wist je dat?</span><div class="data-list"><div class="item"><span class="label">${FUN_FACTS[dayIdx]}</span></div></div>`
    }
    case 'spaarpot':
      return `<span class="title title--small">Spaarpotje</span><div class="data-list"><div class="item"><span class="label">Saldo</span><span class="value">${(data.moneyBalance ?? 0).toFixed(2)}</span></div>${data.moneyGoal ? `<div class="item"><span class="label">${data.moneyGoal.name}</span><span class="value">${data.moneyGoal.targetAmount.toFixed(2)}</span></div>` : ''}</div>`
    default:
      return `<div class="item"><span class="label">Onbekend blok</span></div>`
  }
}

export async function trmnlRoutes(fastify: FastifyInstance) {

  // ── Dashboard CRUD ─────────────────────────────────────────

  // POST /api/trmnl/dashboards — Nieuw dashboard opslaan
  fastify.post('/dashboards', { preHandler: requireParent }, async (request, reply) => {
    const { childId, name, layout, blocks } = request.body as {
      childId: string; name: string
      layout: 'full' | 'half_vertical' | 'quadrant'
      blocks: DashboardBlock[]
    }
    if (!childId || !name || !layout || !blocks) {
      return reply.status(400).send({ error: 'childId, name, layout en blocks zijn verplicht' })
    }
    // Validate block types
    for (const b of blocks) {
      if (!BLOCK_TYPES.includes(b.type as BlockType)) {
        return reply.status(400).send({ error: `Ongeldig bloktype: ${b.type}` })
      }
    }
    const id = crypto.randomBytes(12).toString('hex')
    const dashboard: Dashboard = {
      id, childId, name, layout, blocks,
      createdAt: new Date().toISOString(),
    }
    await redis.set(`trmnl-dashboard:${childId}:${id}`, JSON.stringify(dashboard))
    // Update index
    const indexRaw = await redis.get(`trmnl-dashboards:${childId}`)
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : []
    if (!index.includes(id)) index.push(id)
    await redis.set(`trmnl-dashboards:${childId}`, JSON.stringify(index))
    return { dashboard }
  })

  // GET /api/trmnl/dashboards/:childId — Alle dashboards voor kind
  fastify.get('/dashboards/:childId', { preHandler: requireParent }, async (request) => {
    const { childId } = request.params as { childId: string }
    const indexRaw = await redis.get(`trmnl-dashboards:${childId}`)
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : []
    const dashboards: Dashboard[] = []
    for (const id of index) {
      const raw = await redis.get(`trmnl-dashboard:${childId}:${id}`)
      if (raw) dashboards.push(JSON.parse(raw))
    }
    return { dashboards }
  })

  // PUT /api/trmnl/dashboards/:id — Dashboard bijwerken
  fastify.put('/dashboards/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { childId, name, layout, blocks } = request.body as {
      childId: string; name: string
      layout: 'full' | 'half_vertical' | 'quadrant'
      blocks: DashboardBlock[]
    }
    if (!childId) return reply.status(400).send({ error: 'childId is verplicht' })
    // Validate block types
    if (blocks) {
      for (const b of blocks) {
        if (!BLOCK_TYPES.includes(b.type as BlockType)) {
          return reply.status(400).send({ error: `Ongeldig bloktype: ${b.type}` })
        }
      }
    }
    const raw = await redis.get(`trmnl-dashboard:${childId}:${id}`)
    if (!raw) return reply.status(404).send({ error: 'Dashboard niet gevonden' })
    const existing: Dashboard = JSON.parse(raw)
    const updated: Dashboard = {
      ...existing,
      name: name ?? existing.name,
      layout: layout ?? existing.layout,
      blocks: blocks ?? existing.blocks,
    }
    await redis.set(`trmnl-dashboard:${childId}:${id}`, JSON.stringify(updated))
    return { dashboard: updated }
  })

  // DELETE /api/trmnl/dashboards/:id/:childId — Dashboard verwijderen
  fastify.delete('/dashboards/:id/:childId', { preHandler: requireParent }, async (request, reply) => {
    const { id, childId } = request.params as { id: string; childId: string }
    await redis.del(`trmnl-dashboard:${childId}:${id}`)
    const indexRaw = await redis.get(`trmnl-dashboards:${childId}`)
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : []
    const newIndex = index.filter(i => i !== id)
    await redis.set(`trmnl-dashboards:${childId}`, JSON.stringify(newIndex))
    return { success: true }
  })

  // ── POST /api/trmnl/generate-token — Genereer TRMNL API token ──
  fastify.post('/generate-token', { preHandler: requireParent }, async (request) => {
    const { childId } = request.body as { childId: string }
    if (!childId) throw { statusCode: 400, message: 'childId is verplicht' }
    const token = crypto.randomBytes(16).toString('hex') // 32 hex chars
    await redis.set(`trmnl-token:${childId}`, token)
    return { token, childId }
  })

  // ── POST /api/trmnl/markup — Markup voor TRMNL plugin ────────
  // TRMNL stuurt POST met JSON body { user_uuid, api_key?, child_id?, ... }
  // child_id kan via TRMNL custom field ingesteld worden
  // "all" of leeg = alterneer tussen kinderen bij elk request
  fastify.post('/markup', async (request, reply) => {
    const body = request.body as { user_uuid?: string; api_key?: string; child_id?: string }
    const userUuid = body?.user_uuid

    // Auth via user_uuid (TRMNL identifier gekoppeld aan kind)
    const device = userUuid
      ? await prisma.trmnlDevice.findFirst({ where: { userUuid, isActive: true } })
      : null

    // Determine which child to show
    let targetChildId: string | null = null

    // 1. Explicit child_id from TRMNL settings
    if (body?.child_id && body.child_id !== 'all' && body.child_id !== '') {
      targetChildId = body.child_id
    }
    // 2. Linked device
    else if (device) {
      targetChildId = device.childId
    }

    // 3. Fallback or alternation
    if (!targetChildId) {
      const allChildren = await prisma.user.findMany({
        where: { role: 'child', isActive: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      if (allChildren.length === 0) {
        return { markup: '<div class="layout"><div class="title_bar"><span class="title">GRIP</span><span class="instance">Geen kind geconfigureerd</span></div></div>' }
      }

      // Alternation: rotate based on current request count (stored in Redis)
      if (allChildren.length > 1 && (!body?.child_id || body.child_id === 'all')) {
        const counter = await redis.incr('trmnl-rotation-counter')
        targetChildId = allChildren[(counter - 1) % allChildren.length].id
      } else {
        targetChildId = allChildren[0].id
      }
    }

    if (!targetChildId) {
      return { markup: '<div class="layout"><div class="title_bar"><span class="title">GRIP</span><span class="instance">Fout</span></div></div>' }
    }

    // Validate api_key if one is stored — skip check if no token configured
    const apiKey = body?.api_key ?? extractBearerToken(request.headers.authorization)
    if (apiKey) {
      // Token provided — validate it
      const storedToken = await redis.get(`trmnl-token:${targetChildId}`)
      if (storedToken && apiKey !== storedToken) {
        return reply.status(403).send({ error: 'Ongeldig TRMNL API token' })
      }
    }

    return buildMarkup(targetChildId)
  })

  // ── GET /api/trmnl/markup — Werkt voor zowel TRMNL polling (GET) als browser preview
  fastify.get('/markup', async (request, reply) => {
    const query = request.query as { token?: string; child_id?: string; api_key?: string; user_uuid?: string }

    // API key validatie (uit query param of Authorization header)
    const apiKey = query.api_key ?? extractBearerToken(request.headers.authorization)
    if (apiKey) {
      // Zoek kind-ID gekoppeld aan deze token, of valideer generiek
      const valid = await validateTrmnlTokenAny(apiKey)
      if (!valid) {
        // Token niet gevonden in Redis — misschien nog niet gegenereerd, laat door
      }
    }

    // Determine child
    let targetChildId: string | null = (query.child_id && query.child_id !== '{{child_id}}' && query.child_id !== 'all' && query.child_id !== '') ? query.child_id : null

    if (!targetChildId) {
      const allChildren = await prisma.user.findMany({
        where: { role: 'child', isActive: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      if (allChildren.length === 0) {
        return { markup: '<div class="layout"><div class="title_bar"><span class="title">GRIP</span><span class="instance">Geen kind</span></div></div>' }
      }
      if (allChildren.length > 1 && (!query.child_id || query.child_id === 'all')) {
        const counter = await redis.incr('trmnl-rotation-counter')
        targetChildId = allChildren[(counter - 1) % allChildren.length].id
      } else {
        targetChildId = allChildren[0].id
      }
    }

    // Token check (optional)
    if (query.token) {
      const valid = await validateTrmnlTokenAny(query.token)
      if (!valid) return reply.status(403).send({ error: 'Ongeldig token' })
    }

    const data = await buildMarkup(targetChildId!)

    // TRMNL detection: heeft Authorization header, of Accept: json, of TRMNL user-agent
    const isApiRequest = !!(
      request.headers.authorization ||
      request.headers.accept?.includes('application/json') ||
      request.headers['user-agent']?.includes('TRMNL') ||
      request.headers['content-type']?.includes('application/json')
    )
    if (isApiRequest) {
      return data
    }

    // Browser preview
    return reply.type('text/html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>GRIP TRMNL Preview</title><style>body{margin:0;padding:20px;background:#111;color:#eee;font-family:'Inter',sans-serif}.layout{background:#fff;color:#000;padding:20px;border-radius:8px;max-width:800px;margin:0 auto}.title_bar{display:flex;justify-content:space-between;border-top:1px solid #ccc;margin-top:16px;padding-top:8px}.title{font-weight:bold}.item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}.label{font-size:14px}.value{font-size:14px;font-weight:600}.tag_columns{display:flex;gap:8px;margin-top:12px}.tag{background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:12px}h2{color:#fff;text-align:center;margin-bottom:16px}.content{margin-bottom:12px}.data-list{margin-top:4px}</style></head><body><h2>GRIP TRMNL Preview</h2>${data.markup}<h2 style="margin-top:32px">Half Vertical</h2>${data.markup_half_vertical}<h2 style="margin-top:32px">Quadrant</h2>${data.markup_quadrant}</body></html>`)
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
polling_url: "{{grip_url}}/api/trmnl/markup?child_id={{child_id}}&api_key={{api_key}}&user_uuid={{user_uuid}}"
polling_verb: GET
polling_headers:
  Content-Type: application/json
  Authorization: "Bearer {{api_key}}"
polling_body: ""
refresh_rate: 900
custom_fields:
  - keyname: grip_url
    field_type: text
    name: "GRIP Server URL"
    placeholder: "${appUrl}"
    hint: "Het adres van je GRIP-installatie (zonder trailing slash)"
    required: true
  - keyname: user_uuid
    field_type: text
    name: "TRMNL User UUID"
    placeholder: "Je TRMNL user UUID (zie account-instellingen)"
    hint: "Wordt automatisch meegegeven, laat leeg indien onzeker"
    required: false
  - keyname: api_key
    field_type: text
    name: "API Key"
    placeholder: "Genereer via GRIP admin -> TRMNL -> Token genereren"
    hint: "Beveiligingstoken voor toegang tot de markup-API"
    required: true
  - keyname: child_id
    field_type: text
    name: "Kind ID"
    placeholder: "all"
    hint: "Kind-ID uit GRIP, of 'all' om te alterneren tussen kinderen"
    required: false`,

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

    // Build ZIP using Node.js zlib (no archiver dependency)
    const zipBuffer = buildSimpleZip(files)
    reply.header('Content-Type', 'application/zip')
    reply.header('Content-Disposition', 'attachment; filename="grip-trmnl-plugin.zip"')
    reply.header('Content-Length', zipBuffer.length)
    return reply.send(zipBuffer)
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

/** Build a minimal ZIP file from a map of filename → content (no dependencies) */
function buildSimpleZip(files: Record<string, string>): Buffer {
  const entries: { name: Buffer; data: Buffer; crc: number }[] = []

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, 'utf-8')
    const data = Buffer.from(content, 'utf-8')
    const crc = crc32(data)
    entries.push({ name: nameBytes, data, crc })
  }

  const localHeaders: Buffer[] = []
  const centralHeaders: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    // Local file header
    const local = Buffer.alloc(30 + entry.name.length + entry.data.length)
    local.writeUInt32LE(0x04034b50, 0)    // signature
    local.writeUInt16LE(20, 4)            // version needed
    local.writeUInt16LE(0, 6)             // flags
    local.writeUInt16LE(0, 8)             // compression: stored
    local.writeUInt16LE(0, 10)            // mod time
    local.writeUInt16LE(0, 12)            // mod date
    local.writeUInt32LE(entry.crc, 14)    // crc32
    local.writeUInt32LE(entry.data.length, 18)  // compressed size
    local.writeUInt32LE(entry.data.length, 22)  // uncompressed size
    local.writeUInt16LE(entry.name.length, 26)  // filename length
    local.writeUInt16LE(0, 28)            // extra field length
    entry.name.copy(local, 30)
    entry.data.copy(local, 30 + entry.name.length)
    localHeaders.push(local)

    // Central directory header
    const central = Buffer.alloc(46 + entry.name.length)
    central.writeUInt32LE(0x02014b50, 0)  // signature
    central.writeUInt16LE(20, 4)          // version made by
    central.writeUInt16LE(20, 6)          // version needed
    central.writeUInt16LE(0, 8)           // flags
    central.writeUInt16LE(0, 10)          // compression
    central.writeUInt16LE(0, 12)          // mod time
    central.writeUInt16LE(0, 14)          // mod date
    central.writeUInt32LE(entry.crc, 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(entry.name.length, 28)
    central.writeUInt16LE(0, 30)          // extra length
    central.writeUInt16LE(0, 32)          // comment length
    central.writeUInt16LE(0, 34)          // disk number
    central.writeUInt16LE(0, 36)          // internal attrs
    central.writeUInt32LE(0, 38)          // external attrs
    central.writeUInt32LE(offset, 42)     // local header offset
    entry.name.copy(central, 46)
    centralHeaders.push(central)

    offset += local.length
  }

  const centralDir = Buffer.concat(centralHeaders)
  const centralDirOffset = offset

  // End of central directory
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDir.length, 12)
  eocd.writeUInt32LE(centralDirOffset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localHeaders, centralDir, eocd])
}

/** CRC32 — standard ZIP checksum */
function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/** Build a star progress bar: ★ for reached, ☆ for upcoming goals, █░ for fill */
function buildStarBar(balance: number, rewards: { title: string; costTokens: number }[]): string {
  if (rewards.length === 0) return `<div style="margin:4px 0;font-family:monospace;font-size:12px">★ ${balance} tokens</div>`
  const maxCost = Math.max(rewards[rewards.length - 1].costTokens, balance + 1)
  const barWidth = 30
  let bar = ''
  for (let i = 0; i < barWidth; i++) {
    const posValue = Math.round(((i + 1) / barWidth) * maxCost)
    // Check if a reward goal falls at this position
    const milestone = rewards.find(r => {
      const goalPos = Math.round((r.costTokens / maxCost) * barWidth)
      return goalPos === i + 1
    })
    if (milestone) {
      bar += balance >= milestone.costTokens ? '★' : '☆'
    } else {
      const fillPos = Math.round((balance / maxCost) * barWidth)
      bar += i < fillPos ? '█' : '░'
    }
  }
  const nextGoal = rewards.find(r => r.costTokens > balance)
  const label = nextGoal ? ` ${balance}/${nextGoal.costTokens} → ${nextGoal.title}` : ` ${balance} ★`
  return `<div style="margin:6px 0;font-family:monospace;font-size:11px;letter-spacing:0.5px">${bar}</div><div style="font-size:10px;color:#666">${label}</div>`
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

async function buildMarkup(childId: string, overrideDashboard?: Dashboard) {
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

  // ── Custom dashboard rendering ─────────────────────────────
  const streakDays = await getStreak(childId)
  const currentActivity = current ?? upcoming

  const blockData: BlockData = {
    activities: activities.map(a => ({ id: a.id, title: a.title, icon: a.icon, startTime: a.startTime, durationMinutes: a.durationMinutes })),
    balance, earnedToday, streakDays,
    allRewards: allRewards.map(r => ({ id: r.id, title: r.title, costTokens: r.costTokens })),
    nextReward: nextReward ? { title: nextReward.title, costTokens: nextReward.costTokens } : null,
    currentActivity: currentActivity ? { title: currentActivity.title, icon: currentActivity.icon, startTime: currentActivity.startTime, durationMinutes: currentActivity.durationMinutes } : null,
    isCurrent: !!current,
    lastEmotion, name, now,
  }

  // Check for custom dashboards in Redis
  let customDashboard = overrideDashboard
  if (!customDashboard) {
    const indexRaw = await redis.get(`trmnl-dashboards:${childId}`)
    if (indexRaw) {
      const index: string[] = JSON.parse(indexRaw)
      if (index.length > 0) {
        const raw = await redis.get(`trmnl-dashboard:${childId}:${index[0]}`)
        if (raw) customDashboard = JSON.parse(raw)
      }
    }
  }

  // If custom dashboard exists, use its blocks for the full layout only
  // Keep default half/quadrant layouts for compatibility
  let customFullMarkup: string | null = null
  if (customDashboard && customDashboard.blocks.length > 0) {
    const blocksHtml = customDashboard.blocks.map(b => `<div class="content" style="margin-bottom:8px">${renderBlock(b.type as BlockType, blockData)}</div>`).join('')
    customFullMarkup = `<div class="layout">
  <div class="columns"><div class="column">
    ${blocksHtml}
  </div></div>
  <div class="title_bar"><span class="title">GRIP</span><span class="instance">${formatDate(now)}</span></div>
</div>`
  }

  // ── Default layouts (unchanged) ───────────────────────────

  const EMOTION_ICON: Record<string, string> = {
    great: '😄', good: '😊', okay: '😐', sad: '😢', angry: '😤',
  }

  function rewardProgressBar(bal: number, rewards: typeof allRewards): string {
    if (rewards.length === 0) return `⭐ ${bal} tokens`
    const maxCost = rewards[rewards.length - 1].costTokens
    const barWidth = 28
    const filledWidth = Math.min(Math.round((bal / maxCost) * barWidth), barWidth)
    let bar = ''
    for (let i = 0; i < barWidth; i++) {
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

  return {
    markup: customFullMarkup ?? markup,
    markup_half_vertical,
    markup_quadrant,
  }
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
