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

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
  trustProxy: true,
})

async function main() {
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
  await app.listen({ port: 3001, host: '0.0.0.0' })
  app.log.info('GRIP backend gestart op poort 3001')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
