import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_, reply) => {
    const checks = { db: false, redis: false }

    try {
      await prisma.$queryRaw`SELECT 1`
      checks.db = true
    } catch {}

    try {
      await redis.ping()
      checks.redis = true
    } catch {}

    const healthy = checks.db && checks.redis
    reply.status(healthy ? 200 : 503)
    return {
      status: healthy ? 'ok' : 'degraded',
      checks,
      version: process.env.npm_package_version ?? 'unknown',
      uptime: Math.floor(process.uptime()),
    }
  })
}
