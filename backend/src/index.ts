import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'
import { authRoutes } from './routes/auth'
import { healthRoutes } from './routes/health'
import { userRoutes } from './routes/users'
import { scheduleRoutes } from './routes/schedules'
import { taskRoutes } from './routes/tasks'
import { tokenRoutes } from './routes/tokens'
import { emotionRoutes } from './routes/emotions'
import { tokenSettingsRoutes, getExtraAllowedOrigins } from './routes/settings'
import { exerciseRoutes } from './routes/exercises'
import { inviteRoutes } from './routes/invites'
import { communicationRoutes } from './routes/communication'
import { dossierRoutes } from './routes/dossier'
import { uploadRoutes } from './routes/upload'
import { dashboardRoutes } from './routes/dashboard'
import { reportsRoutes } from './routes/reports'
import { haRoutes } from './routes/ha'
import { independenceRoutes } from './routes/independence'
import { socialRoutes } from './routes/social'
import { trmnlRoutes } from './routes/trmnl'
import { pushRoutes } from './routes/push'
import { upgradeRoutes } from './routes/upgrade'
import { moneyRoutes } from './routes/money'
import { recipeRoutes } from './routes/recipes'
import { tipsRoutes } from './routes/tips'
import { appointmentRoutes } from './routes/appointments'
import { vacationRoutes } from './routes/vacations'
import { childlistRoutes } from './routes/childlists'
import multipart from '@fastify/multipart'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
  trustProxy: true,
})

async function main() {
  // ── Multipart (bestandsupload) ───────────────────────────────
  await app.register(multipart, { limits: { fileSize: 26 * 1024 * 1024 } })

  // ── Security ────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Beheerd door Nginx
  })

  // CORS: sta alle geconfigureerde origins toe (komma-gescheiden in CORS_ORIGINS)
  const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? 'http://localhost:3080')
    .split(',')
    .map((o) => o.trim())

  await app.register(cors, {
    origin: (origin, cb) => {
      // Sta requests zonder origin toe (bv. curl, PWA same-origin)
      if (!origin) return cb(null, true)
      if (allowedOrigins.some((allowed) => origin === allowed)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} niet toegestaan`), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(cookie, {
    secret: process.env.JWT_SECRET,
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
  })

  // Rate limiting — globaal
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    redis,
    errorResponseBuilder: () => ({
      error: 'Te veel verzoeken. Probeer opnieuw over een minuut.',
    }),
  })

  // ── Routes ──────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(scheduleRoutes, { prefix: '/api/schedules' })
  await app.register(taskRoutes, { prefix: '/api/tasks' })
  await app.register(tokenRoutes, { prefix: '/api/tokens' })
  await app.register(emotionRoutes, { prefix: '/api/emotions' })
  await app.register(tokenSettingsRoutes, { prefix: '/api/admin/settings' })
  await app.register(exerciseRoutes, { prefix: '/api/exercises' })
  await app.register(inviteRoutes, { prefix: '/api/invites' })
  await app.register(communicationRoutes, { prefix: '/api/communication' })
  await app.register(dossierRoutes, { prefix: '/api/dossier' })
  await app.register(uploadRoutes, { prefix: '/api/upload' })
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await app.register(reportsRoutes, { prefix: '/api/reports' })
  await app.register(haRoutes, { prefix: '/api/ha' })
  await app.register(independenceRoutes, { prefix: '/api/independence' })
  await app.register(socialRoutes, { prefix: '/api/social' })
  await app.register(trmnlRoutes, { prefix: '/api/trmnl' })
  await app.register(pushRoutes)
  await app.register(upgradeRoutes)
  await app.register(moneyRoutes, { prefix: '/api/money' })
  await app.register(recipeRoutes, { prefix: '/api/recipes' })
  await app.register(tipsRoutes, { prefix: '/api/tips' })
  await app.register(appointmentRoutes, { prefix: '/api/appointments' })
  await app.register(vacationRoutes, { prefix: '/api/vacations' })
  await app.register(childlistRoutes, { prefix: '/api/childlists' })

  // ── Graceful shutdown ────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info(`Ontvangen ${signal} — afsluiten...`)
    await app.close()
    await prisma.$disconnect()
    await redis.quit()
    process.exit(0)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })

  // ── Start ────────────────────────────────────────────────────
  await redis.connect()
  await prisma.$connect()

  // Extra toegestane origins laden vanuit Redis (admin kan deze aanpassen)
  const extraOrigins = await getExtraAllowedOrigins()
  if (extraOrigins.length > 0) {
    const current = process.env.CORS_ORIGINS ?? ''
    const combined = [...current.split(',').map((o) => o.trim()).filter(Boolean), ...extraOrigins]
    process.env.CORS_ORIGINS = [...new Set(combined)].join(',')
    app.log.info(`Extra CORS-origins geladen: ${extraOrigins.join(', ')}`)
  }
  // Sla de basis env-origins op als fallback bij verwijderen
  process.env.CORS_ORIGINS_BASE = process.env.CORS_ORIGINS

  await app.listen({ port: 3001, host: '0.0.0.0' })
  app.log.info('GRIP backend gestart op poort 3001')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
