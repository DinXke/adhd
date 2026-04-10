import { FastifyInstance } from 'fastify'
import { requireAdmin } from '../middleware/auth'
import { redis } from '../lib/redis'

const SETTINGS_KEY = 'grip:settings'

interface AppSettings {
  extraAllowedOrigins: string[]  // extra CORS-origins bovenop CORS_ORIGINS in .env
  appName: string
}

async function loadSettings(): Promise<AppSettings> {
  const raw = await redis.get(SETTINGS_KEY)
  if (!raw) return { extraAllowedOrigins: [], appName: 'GRIP' }
  try {
    return JSON.parse(raw)
  } catch {
    return { extraAllowedOrigins: [], appName: 'GRIP' }
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  await redis.set(SETTINGS_KEY, JSON.stringify(settings))
}

// Exporteer voor gebruik in CORS-check
export async function getExtraAllowedOrigins(): Promise<string[]> {
  const s = await loadSettings()
  return s.extraAllowedOrigins
}

export async function tokenSettingsRoutes(fastify: FastifyInstance) {
  // ── GET /api/admin/settings ───────────────────────────────────
  fastify.get('/', { preHandler: requireAdmin }, async () => {
    const settings = await loadSettings()
    const envOrigins = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    return {
      settings,
      envOrigins,
      allOrigins: [...new Set([...envOrigins, ...settings.extraAllowedOrigins])],
    }
  })

  // ── PUT /api/admin/settings ───────────────────────────────────
  fastify.put('/', { preHandler: requireAdmin }, async (request, reply) => {
    const body = request.body as Partial<AppSettings>
    const current = await loadSettings()

    const updated: AppSettings = {
      extraAllowedOrigins: Array.isArray(body.extraAllowedOrigins)
        ? body.extraAllowedOrigins.map((o: string) => o.trim()).filter(Boolean)
        : current.extraAllowedOrigins,
      appName: body.appName ?? current.appName,
    }

    await saveSettings(updated)

    // Herlaad CORS-origins in geheugen zodat ze direct actief zijn
    process.env.CORS_ORIGINS = [
      ...(process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
      ...updated.extraAllowedOrigins,
    ].join(',')

    return updated
  })

  // ── POST /api/admin/settings/origins — Snel een origin toevoegen
  fastify.post('/origins', { preHandler: requireAdmin }, async (request, reply) => {
    const { origin } = request.body as { origin: string }
    if (!origin || !origin.startsWith('http')) {
      return reply.status(400).send({ error: 'Geef een geldig URL op (beginnend met http)' })
    }

    const settings = await loadSettings()
    const trimmed = origin.trim().replace(/\/$/, '')

    if (!settings.extraAllowedOrigins.includes(trimmed)) {
      settings.extraAllowedOrigins.push(trimmed)
      await saveSettings(settings)

      // Direct actief maken
      const existing = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
      if (!existing.includes(trimmed)) {
        process.env.CORS_ORIGINS = [...existing, trimmed].join(',')
      }
    }

    return { added: trimmed, extraAllowedOrigins: settings.extraAllowedOrigins }
  })

  // ── DELETE /api/admin/settings/origins — Origin verwijderen ──
  fastify.delete('/origins', { preHandler: requireAdmin }, async (request, reply) => {
    const { origin } = request.body as { origin: string }
    const settings = await loadSettings()
    settings.extraAllowedOrigins = settings.extraAllowedOrigins.filter((o) => o !== origin)
    await saveSettings(settings)

    // Verwijder uit process.env (env-origins blijven altijd staan)
    const envOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
    const envBase = new Set(
      (process.env.CORS_ORIGINS_BASE ?? process.env.CORS_ORIGINS ?? '')
        .split(',').map((o) => o.trim()).filter(Boolean)
    )
    process.env.CORS_ORIGINS = [...envBase, ...settings.extraAllowedOrigins].join(',')

    return { removed: origin, extraAllowedOrigins: settings.extraAllowedOrigins }
  })
}
