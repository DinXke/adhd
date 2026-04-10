/**
 * Bestandsupload naar MinIO via multipart/form-data.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { uploadFile, BUCKET } from '../lib/minio'
import { randomUUID } from 'crypto'
import path from 'path'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export async function uploadRoutes(fastify: FastifyInstance) {

  // ── POST /api/upload — Bestand uploaden ───────────────────────
  fastify.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Geen bestand ontvangen' })

    const { mimetype, filename, file } = data

    // Valideer MIME type
    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      return reply.status(400).send({
        error: `Bestandstype niet toegestaan: ${mimetype}. Toegestaan: PDF, Word, Excel, afbeeldingen.`,
      })
    }

    // Buffer inlezen
    const chunks: Buffer[] = []
    for await (const chunk of file) {
      chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(400).send({ error: 'Bestand te groot (max 25MB)' })
    }

    // Sla op in MinIO met UUID als naam (veilig, geen path traversal)
    const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '')
    const storageKey = `uploads/${randomUUID()}${ext}`

    await uploadFile({
      key: storageKey,
      buffer,
      mimeType: mimetype,
      sizeBytes: buffer.length,
    })

    // Sla attachment-record op
    const attachment = await prisma.attachment.create({
      data: {
        filename: filename.replace(/[<>:"/\\|?*]/g, '_'), // sanitize
        mimeType: mimetype,
        storageKey,
        sizeBytes: buffer.length,
        uploadedById: request.user.sub,
      },
    })

    return reply.status(201).send({ attachment })
  })

  // ── POST /api/upload/link-message — Bijlage koppelen aan bericht ─
  fastify.post('/link-message', { preHandler: requireAuth }, async (request) => {
    const { attachmentId, messageId } = request.body as { attachmentId: string; messageId: string }
    return prisma.attachment.update({
      where: { id: attachmentId },
      data: { messageId },
    })
  })

  // ── POST /api/upload/link-dossier — Bijlage koppelen aan dossier ─
  fastify.post('/link-dossier', { preHandler: requireAuth }, async (request) => {
    const { attachmentId, dossierId } = request.body as { attachmentId: string; dossierId: string }
    return prisma.attachment.update({
      where: { id: attachmentId },
      data: { dossierId },
    })
  })
}
