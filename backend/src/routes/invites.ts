/**
 * Hulpverlener-uitnodigingssysteem.
 * Ouder stuurt invite-link (JWT-gebaseerd token), hulpverlener maakt account aan.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireParent } from '../middleware/auth'
import { hashPassword } from '../lib/hash'
import crypto from 'crypto'
import { Role } from '@prisma/client'

const INVITE_TTL_HOURS = 72

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function inviteRoutes(fastify: FastifyInstance) {

  // ── POST /api/invites — Invite aanmaken (ouder) ───────────────
  fastify.post('/', { preHandler: requireParent }, async (request, reply) => {
    const { email, childId, modules = [], role = 'caregiver' } = request.body as {
      email: string
      childId: string
      modules?: string[]
      role?: string
    }

    if (!email || !childId) {
      return reply.status(400).send({ error: 'email en childId zijn verplicht' })
    }

    // Controleer of ouder toegang heeft tot dit kind
    const link = await prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId: request.user.sub, childId } },
    })
    if (!link && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Geen toegang tot dit kind' })
    }

    // Bestaande actieve invite intrekken
    await prisma.caregiverInvite.deleteMany({
      where: {
        email: email.toLowerCase(),
        childId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    const rawToken = generateToken()
    const invite = await prisma.caregiverInvite.create({
      data: {
        token: hashToken(rawToken),
        email: email.toLowerCase(),
        role: role as Role,
        childId,
        invitedById: request.user.sub,
        modules,
        expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        action: 'invite.create',
        entityType: 'caregiver_invite',
        entityId: invite.id,
        metadata: { email, childId, modules, role },
      },
    })

    return reply.status(201).send({
      inviteId: invite.id,
      inviteUrl: `${process.env.APP_URL ?? 'http://localhost:3080'}/uitnodiging/${rawToken}`,
      expiresAt: invite.expiresAt,
    })
  })

  // ── GET /api/invites — Invites voor ouder ────────────────────
  fastify.get('/', { preHandler: requireParent }, async (request) => {
    const { childId } = request.query as { childId?: string }

    const invites = await prisma.caregiverInvite.findMany({
      where: {
        invitedById: request.user.sub,
        ...(childId ? { childId } : {}),
      },
      include: {
        invitedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { invites }
  })

  // ── GET /api/invites/validate/:token — Token valideren ────────
  fastify.get('/validate/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    const hashed = hashToken(token)

    const invite = await prisma.caregiverInvite.findUnique({
      where: { token: hashed },
      include: {
        invitedBy: { select: { name: true } },
      },
    })

    if (!invite) return reply.status(404).send({ error: 'Uitnodiging niet gevonden' })
    if (invite.usedAt) return reply.status(410).send({ error: 'Uitnodiging is al gebruikt' })
    if (invite.expiresAt < new Date()) return reply.status(410).send({ error: 'Uitnodiging is verlopen' })

    const child = await prisma.user.findUnique({
      where: { id: invite.childId },
      select: { name: true },
    })

    return {
      email: invite.email,
      role: invite.role,
      modules: invite.modules,
      childName: child?.name ?? 'Onbekend',
      invitedByName: invite.invitedBy.name,
      expiresAt: invite.expiresAt,
    }
  })

  // ── POST /api/invites/accept/:token — Invite accepteren ───────
  fastify.post('/accept/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    const { name, password } = request.body as { name: string; password: string }

    if (!name || !password) return reply.status(400).send({ error: 'naam en wachtwoord zijn verplicht' })
    if (password.length < 8) return reply.status(400).send({ error: 'Wachtwoord minimaal 8 tekens' })

    const hashed = hashToken(token)
    const invite = await prisma.caregiverInvite.findUnique({ where: { token: hashed } })

    if (!invite) return reply.status(404).send({ error: 'Uitnodiging niet gevonden' })
    if (invite.usedAt) return reply.status(410).send({ error: 'Uitnodiging is al gebruikt' })
    if (invite.expiresAt < new Date()) return reply.status(410).send({ error: 'Uitnodiging is verlopen' })

    // Maak hulpverlener-account aan of haal bestaande op
    let caregiver = await prisma.user.findUnique({ where: { email: invite.email } })
    if (!caregiver) {
      caregiver = await prisma.user.create({
        data: {
          name,
          email: invite.email,
          password: await hashPassword(password),
          role: invite.role,
        },
      })
    }

    // Toegang toekennen
    await prisma.caregiverAccess.upsert({
      where: { userId_childId: { userId: caregiver.id, childId: invite.childId } },
      create: {
        userId: caregiver.id,
        childId: invite.childId,
        modules: invite.modules,
        invitedBy: invite.invitedById,
        isActive: true,
      },
      update: { modules: invite.modules, isActive: true },
    })

    // Invite markeren als gebruikt
    await prisma.caregiverInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), invitedUserId: caregiver.id },
    })

    await prisma.auditLog.create({
      data: {
        userId: caregiver.id,
        action: 'invite.accept',
        entityType: 'caregiver_invite',
        entityId: invite.id,
        metadata: { childId: invite.childId },
      },
    })

    return reply.status(201).send({ ok: true, userId: caregiver.id })
  })

  // ── DELETE /api/invites/:id — Invite intrekken (ouder) ────────
  fastify.delete('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.caregiverInvite.deleteMany({
      where: { id, invitedById: request.user.sub },
    })
    return reply.status(204).send()
  })

  // ── GET /api/invites/caregivers/:childId — Actieve hulpverleners
  fastify.get('/caregivers/:childId', { preHandler: requireParent }, async (request, reply) => {
    const { childId } = request.params as { childId: string }

    const link = await prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId: request.user.sub, childId } },
    })
    if (!link && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Geen toegang' })
    }

    const caregivers = await prisma.caregiverAccess.findMany({
      where: { childId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
    })

    return { caregivers }
  })

  // ── PATCH /api/invites/caregivers/:childId/:userId — Modules wijzigen
  fastify.patch('/caregivers/:childId/:userId', { preHandler: requireParent }, async (request) => {
    const { childId, userId } = request.params as { childId: string; userId: string }
    const { modules, isActive } = request.body as { modules?: string[]; isActive?: boolean }

    return prisma.caregiverAccess.update({
      where: { userId_childId: { userId, childId } },
      data: { modules, isActive },
    })
  })
}
