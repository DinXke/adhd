import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword, hashPin, verifyPin, sha256 } from '../lib/hash'
import { redis } from '../lib/redis'
import { randomBytes } from 'crypto'
import { Role } from '@prisma/client'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_SECONDS = 900 // 15 minuten

function loginKey(identifier: string) {
  return `login_attempts:${sha256(identifier)}`
}

async function checkRateLimit(identifier: string, reply: any): Promise<boolean> {
  const key = loginKey(identifier)
  const attempts = await redis.get(key)
  if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
    const ttl = await redis.ttl(key)
    reply.status(429).send({
      error: `Te veel mislukte pogingen. Probeer opnieuw over ${Math.ceil(ttl / 60)} minuten.`,
    })
    return false
  }
  return true
}

async function recordFailedAttempt(identifier: string) {
  const key = loginKey(identifier)
  const attempts = await redis.incr(key)
  if (attempts === 1) {
    await redis.expire(key, LOCKOUT_SECONDS)
  }
}

async function clearAttempts(identifier: string) {
  await redis.del(loginKey(identifier))
}

function generateRefreshToken(): string {
  return randomBytes(40).toString('hex')
}

async function createTokenPair(
  fastify: FastifyInstance,
  user: { id: string; role: Role },
  sessionId: string,
  ipAddress?: string,
  userAgent?: string,
) {
  // Access token (kort geldig, in geheugen op client)
  const accessToken = fastify.jwt.sign(
    { sub: user.id, role: user.role, sessionId },
    { expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900') },
  )

  // Refresh token (lang geldig, httpOnly cookie)
  const rawRefreshToken = generateRefreshToken()
  const hashedRefreshToken = sha256(rawRefreshToken)

  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(process.env.JWT_REFRESH_TTL ?? '604800'))

  await prisma.refreshToken.create({
    data: {
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  return { accessToken, rawRefreshToken }
}

export async function authRoutes(fastify: FastifyInstance) {
  // ── POST /api/auth/login/pin — Kind-login ────────────────
  fastify.post('/login/pin', {
    schema: {
      body: {
        type: 'object',
        required: ['childId', 'pin'],
        properties: {
          childId: { type: 'string' },
          pin: { type: 'string', minLength: 4, maxLength: 4 },
        },
      },
    },
    handler: async (request, reply) => {
      const { childId, pin } = request.body as { childId: string; pin: string }

      const rateLimitKey = `${request.ip}:${childId}`
      if (!(await checkRateLimit(rateLimitKey, reply))) return

      const user = await prisma.user.findFirst({
        where: { id: childId, role: 'child', isActive: true },
        select: { id: true, role: true, pin: true, name: true, avatarUrl: true },
      })

      if (!user?.pin) {
        await recordFailedAttempt(rateLimitKey)
        return reply.status(401).send({ error: 'Onjuiste PIN' })
      }

      const valid = await verifyPin(user.pin, pin)
      if (!valid) {
        await recordFailedAttempt(rateLimitKey)
        return reply.status(401).send({ error: 'Onjuiste PIN' })
      }

      await clearAttempts(rateLimitKey)

      const sessionId = randomBytes(16).toString('hex')
      const { accessToken, rawRefreshToken } = await createTokenPair(
        fastify,
        user,
        sessionId,
        request.ip,
        request.headers['user-agent'],
      )

      await prisma.auditLog.create({
        data: { userId: user.id, action: 'user.login', ipAddress: request.ip },
      })

      reply.setCookie('refresh_token', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800'),
      })

      return {
        accessToken,
        user: { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
      }
    },
  })

  // ── POST /api/auth/login — Email/wachtwoord login ────────
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string }

      const normalizedEmail = email.toLowerCase().trim()
      const rateLimitKey = `${request.ip}:${normalizedEmail}`

      if (!(await checkRateLimit(rateLimitKey, reply))) return

      const user = await prisma.user.findFirst({
        where: { email: normalizedEmail, isActive: true },
        select: { id: true, role: true, password: true, name: true, avatarUrl: true, email: true },
      })

      if (!user?.password) {
        await recordFailedAttempt(rateLimitKey)
        // Constant-time-achtige vertraging om user enumeration te voorkomen
        await hashPassword('dummy_to_prevent_timing_attack')
        return reply.status(401).send({ error: 'Onjuist e-mailadres of wachtwoord' })
      }

      const valid = await verifyPassword(user.password, password)
      if (!valid) {
        await recordFailedAttempt(rateLimitKey)
        return reply.status(401).send({ error: 'Onjuist e-mailadres of wachtwoord' })
      }

      await clearAttempts(rateLimitKey)

      const sessionId = randomBytes(16).toString('hex')
      const { accessToken, rawRefreshToken } = await createTokenPair(
        fastify,
        user,
        sessionId,
        request.ip,
        request.headers['user-agent'],
      )

      await prisma.auditLog.create({
        data: { userId: user.id, action: 'user.login', ipAddress: request.ip },
      })

      reply.setCookie('refresh_token', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800'),
      })

      return {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          email: user.email,
        },
      }
    },
  })

  // ── POST /api/auth/refresh — Nieuwe access token ─────────
  fastify.post('/refresh', async (request, reply) => {
    const rawToken = (request.cookies as Record<string, string>)['refresh_token']
    if (!rawToken) {
      return reply.status(401).send({ error: 'Geen refresh token' })
    }

    const hashedToken = sha256(rawToken)
    const stored = await prisma.refreshToken.findFirst({
      where: { token: hashedToken, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, role: true, name: true, avatarUrl: true, isActive: true } } },
    })

    if (!stored || !stored.user.isActive) {
      reply.clearCookie('refresh_token', { path: '/api/auth' })
      return reply.status(401).send({ error: 'Ongeldige of verlopen refresh token' })
    }

    // Roteer refresh token (token rotation)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const sessionId = randomBytes(16).toString('hex')
    const { accessToken, rawRefreshToken } = await createTokenPair(
      fastify,
      stored.user,
      sessionId,
      request.ip,
      request.headers['user-agent'],
    )

    reply.setCookie('refresh_token', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800'),
    })

    return {
      accessToken,
      user: {
        id: stored.user.id,
        name: stored.user.name,
        role: stored.user.role,
        avatarUrl: stored.user.avatarUrl,
      },
    }
  })

  // ── POST /api/auth/logout ─────────────────────────────────
  fastify.post('/logout', async (request, reply) => {
    const rawToken = (request.cookies as Record<string, string>)['refresh_token']
    if (rawToken) {
      const hashedToken = sha256(rawToken)
      await prisma.refreshToken.updateMany({
        where: { token: hashedToken },
        data: { revokedAt: new Date() },
      })
    }
    reply.clearCookie('refresh_token', { path: '/api/auth' })
    return { ok: true }
  })

  // ── GET /api/auth/children — Haal kind-profielen op voor PIN-scherm ─
  fastify.get('/children', async () => {
    const children = await prisma.user.findMany({
      where: { role: 'child', isActive: true },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    })
    return { children }
  })
}
