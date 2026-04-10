import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'

// Fastify JWT verrijkt request met user-payload na verify
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: Role; sessionId: string }
    user: { sub: string; role: Role; sessionId: string }
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Niet ingelogd' })
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Niet ingelogd' })
    }
    if (!request.user?.role || !roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Geen toegang' })
    }
  }
}

export const requireParent = requireRole(Role.parent, Role.admin)
export const requireAdmin = requireRole(Role.admin)
export const requireCaregiverOrParent = requireRole(Role.caregiver, Role.parent, Role.admin)
