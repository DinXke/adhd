import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { hashPassword, hashPin } from '../lib/hash'
import { requireAuth, requireAdmin, requireParent } from '../middleware/auth'
import { Role } from '@prisma/client'

export async function userRoutes(fastify: FastifyInstance) {
  // ── GET /api/users/me — Eigen profiel ────────────────────
  fastify.get('/me', { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true, name: true, email: true, role: true, avatarUrl: true, isActive: true,
        caregiverAccess: {
          where: { isActive: true },
          select: { childId: true, modules: true, child: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    })
    return user
  })

  // ── POST /api/users — Gebruiker aanmaken (admin) ─────────
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const body = request.body as {
      name: string
      role: Role
      email?: string
      password?: string
      pin?: string
      avatarUrl?: string
    }

    if (body.role === 'child' && !body.pin) {
      return reply.status(400).send({ error: 'Kind-account vereist een PIN' })
    }
    if (body.role !== 'child' && !body.email) {
      return reply.status(400).send({ error: 'Email vereist voor dit rol-type' })
    }

    const data: any = {
      name: body.name,
      role: body.role,
      email: body.email?.toLowerCase().trim(),
      avatarUrl: body.avatarUrl,
    }

    if (body.pin) data.pin = await hashPin(body.pin)
    if (body.password) data.password = await hashPassword(body.password)

    const user = await prisma.user.create({
      data,
      select: { id: true, name: true, role: true, email: true, avatarUrl: true },
    })

    await prisma.auditLog.create({
      data: { userId: request.user.sub, action: 'user.create', entityType: 'user', entityId: user.id },
    })

    return reply.status(201).send(user)
  })

  // ── GET /api/users/children — Alle kinderen (ouder/admin) ─
  fastify.get('/children', { preHandler: requireParent }, async () => {
    const children = await prisma.user.findMany({
      where: { role: 'child', isActive: true },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    })
    return { children }
  })

  // ── PATCH /api/users/me/pin — PIN wijzigen (kind) ────────
  fastify.patch('/me/pin', { preHandler: requireAuth }, async (request, reply) => {
    if (request.user.role !== 'child') {
      return reply.status(403).send({ error: 'Alleen voor kind-accounts' })
    }
    const { pin } = request.body as { pin: string }
    if (!/^\d{4}$/.test(pin)) {
      return reply.status(400).send({ error: 'PIN moet 4 cijfers zijn' })
    }
    await prisma.user.update({
      where: { id: request.user.sub },
      data: { pin: await hashPin(pin) },
    })
    return { ok: true }
  })
}
