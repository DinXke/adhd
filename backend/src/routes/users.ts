import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { hashPassword, hashPin } from '../lib/hash'
import { requireAuth, requireAdmin, requireParent } from '../middleware/auth'
import { Role } from '@prisma/client'

const CHILD_SELECT = {
  id: true, name: true, role: true, avatarUrl: true, avatarId: true,
  gender: true, dateOfBirth: true, isActive: true,
}

export async function userRoutes(fastify: FastifyInstance) {
  // ── GET /api/users/me — Eigen profiel ────────────────────────
  fastify.get('/me', { preHandler: requireAuth }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true, name: true, email: true, role: true,
        avatarUrl: true, avatarId: true, gender: true,
        dateOfBirth: true, isActive: true,
        caregiverAccess: {
          where: { isActive: true },
          select: {
            childId: true, modules: true,
            child: { select: { id: true, name: true, avatarUrl: true, avatarId: true } },
          },
        },
        myChildren: {
          select: {
            isPrimary: true,
            child: { select: CHILD_SELECT },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    return user
  })

  // ── POST /api/users — Gebruiker aanmaken (admin) ──────────────
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const body = request.body as {
      name: string
      role: Role
      email?: string
      password?: string
      pin?: string
      avatarUrl?: string
      avatarId?: string
      gender?: string
      dateOfBirth?: string
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
      avatarId: body.avatarId,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    }

    if (body.pin) data.pin = await hashPin(body.pin)
    if (body.password) data.password = await hashPassword(body.password)

    const user = await prisma.user.create({
      data,
      select: { id: true, name: true, role: true, email: true, avatarUrl: true, avatarId: true },
    })

    await prisma.auditLog.create({
      data: { userId: request.user.sub, action: 'user.create', entityType: 'user', entityId: user.id },
    })

    return reply.status(201).send(user)
  })

  // ── GET /api/users/my-children — Gekoppelde kinderen (ouder) ──
  fastify.get('/my-children', { preHandler: requireParent }, async (request) => {
    const links = await prisma.parentChild.findMany({
      where: { parentId: request.user.sub },
      select: { isPrimary: true, child: { select: CHILD_SELECT } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
    return { children: links.map((l) => ({ ...l.child, isPrimary: l.isPrimary })) }
  })

  // ── GET /api/users/children — Alle kinderen (admin) ───────────
  fastify.get('/children', { preHandler: requireAdmin }, async () => {
    const children = await prisma.user.findMany({
      where: { role: 'child', isActive: true },
      select: CHILD_SELECT,
      orderBy: { name: 'asc' },
    })
    return { children }
  })

  // ── POST /api/users/children — Kind aanmaken + koppelen ───────
  fastify.post('/children', { preHandler: requireParent }, async (request, reply) => {
    const body = request.body as {
      name: string
      pin: string
      gender?: string
      dateOfBirth?: string
      avatarId?: string
      isPrimary?: boolean
    }

    if (!body.name || !body.pin) {
      return reply.status(400).send({ error: 'name en pin zijn verplicht' })
    }
    if (!/^\d{4}$/.test(body.pin)) {
      return reply.status(400).send({ error: 'PIN moet 4 cijfers zijn' })
    }

    const child = await prisma.user.create({
      data: {
        name: body.name,
        role: 'child',
        pin: await hashPin(body.pin),
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        avatarId: body.avatarId ?? (body.gender === 'meisje' ? 'meisje-1' : body.gender === 'jongen' ? 'jongen-1' : 'neutraal-1'),
      },
      select: CHILD_SELECT,
    })

    // Koppel aan ouder
    const existingLinks = await prisma.parentChild.count({ where: { parentId: request.user.sub } })
    await prisma.parentChild.create({
      data: {
        parentId: request.user.sub,
        childId: child.id,
        isPrimary: body.isPrimary ?? existingLinks === 0, // eerste kind is primair
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'child.create',
        entityType: 'user',
        entityId: child.id,
        metadata: { name: child.name },
      },
    })

    return reply.status(201).send(child)
  })

  // ── PUT /api/users/children/:id — Kind bijwerken ──────────────
  fastify.put('/children/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }

    // Controleer of ouder toegang heeft tot dit kind
    const link = await prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId: request.user.sub, childId: id } },
    })
    if (!link && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Geen toegang tot dit kind' })
    }

    const body = request.body as {
      name?: string
      pin?: string
      gender?: string
      dateOfBirth?: string
      avatarId?: string
      isActive?: boolean
    }

    const data: any = {}
    if (body.name) data.name = body.name
    if (body.pin) {
      if (!/^\d{4}$/.test(body.pin)) return reply.status(400).send({ error: 'PIN moet 4 cijfers zijn' })
      data.pin = await hashPin(body.pin)
    }
    if (body.gender !== undefined) data.gender = body.gender
    if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
    if (body.avatarId !== undefined) data.avatarId = body.avatarId
    if (body.isActive !== undefined) data.isActive = body.isActive

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: CHILD_SELECT,
    })

    return updated
  })

  // ── DELETE /api/users/children/:id — Kind deactiveren ─────────
  fastify.delete('/children/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const link = await prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId: request.user.sub, childId: id } },
    })
    if (!link && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Geen toegang tot dit kind' })
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } })
    return reply.status(204).send()
  })

  // ── POST /api/users/children/:id/link — Kind koppelen aan ouder ─
  fastify.post('/children/:id/link', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const child = await prisma.user.findUnique({ where: { id, role: 'child' } })
    if (!child) return reply.status(404).send({ error: 'Kind niet gevonden' })

    const existingLinks = await prisma.parentChild.count({ where: { parentId: request.user.sub } })
    await prisma.parentChild.upsert({
      where: { parentId_childId: { parentId: request.user.sub, childId: id } },
      create: { parentId: request.user.sub, childId: id, isPrimary: existingLinks === 0 },
      update: {},
    })

    return { ok: true }
  })

  // ── PATCH /api/users/me/avatar — Avatar kiezen (kind) ─────────
  fastify.patch('/me/avatar', { preHandler: requireAuth }, async (request) => {
    const { avatarId, gender } = request.body as { avatarId: string; gender?: string }
    return prisma.user.update({
      where: { id: request.user.sub },
      data: { avatarId, gender },
      select: { id: true, avatarId: true, gender: true },
    })
  })

  // ── PATCH /api/users/me/pin — PIN wijzigen (kind) ─────────────
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

  // ── GET /api/users (admin) — Alle gebruikers ──────────────────
  fastify.get('/', { preHandler: requireAdmin }, async () => {
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, email: true, role: true,
        avatarUrl: true, avatarId: true, gender: true,
        dateOfBirth: true, isActive: true, createdAt: true,
        myParents: { select: { parent: { select: { id: true, name: true } }, isPrimary: true } },
      },
    })
    return { users }
  })

  // ── PUT /api/users/:id — Gebruiker bijwerken (admin) ─────────
  fastify.put('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Gebruiker niet gevonden' })

    const body = request.body as {
      name?: string
      email?: string
      role?: Role
      isActive?: boolean
      gender?: string
      dateOfBirth?: string
    }

    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.email !== undefined) data.email = body.email?.toLowerCase().trim() || null
    if (body.role !== undefined) data.role = body.role
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.gender !== undefined) data.gender = body.gender
    if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        avatarUrl: true, avatarId: true, gender: true,
        dateOfBirth: true, isActive: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'user.update',
        entityType: 'user',
        entityId: id,
        metadata: { fields: Object.keys(data) },
      },
    })

    return updated
  })

  // ── PUT /api/users/:id/password — Wachtwoord resetten (admin) ─
  fastify.put('/:id/password', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Gebruiker niet gevonden' })

    const { password } = request.body as { password: string }
    if (!password) return reply.status(400).send({ error: 'Wachtwoord is verplicht' })

    await prisma.user.update({
      where: { id },
      data: { password: await hashPassword(password) },
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'user.password_reset',
        entityType: 'user',
        entityId: id,
      },
    })

    return { ok: true }
  })

  // ── PUT /api/users/:id/pin — PIN resetten (admin) ────────────
  fastify.put('/:id/pin', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Gebruiker niet gevonden' })

    const { pin } = request.body as { pin: string }
    if (!pin || !/^\d{4}$/.test(pin)) {
      return reply.status(400).send({ error: 'PIN moet 4 cijfers zijn' })
    }

    await prisma.user.update({
      where: { id },
      data: { pin: await hashPin(pin) },
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'user.pin_reset',
        entityType: 'user',
        entityId: id,
      },
    })

    return { ok: true }
  })

  // ── DELETE /api/users/:id — Gebruiker permanent verwijderen (admin) ─
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    // Prevent self-deletion
    if (id === request.user.sub) {
      return reply.status(400).send({ error: 'Je kunt jezelf niet verwijderen' })
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
    if (!existing) return reply.status(404).send({ error: 'Gebruiker niet gevonden' })

    // Delete cascade handles related data
    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'user.delete',
        entityType: 'user',
        entityId: id,
        metadata: { name: existing.name, role: existing.role },
      },
    })

    return { ok: true }
  })
}
