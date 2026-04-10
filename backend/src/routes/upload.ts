/**
 * Bestandsupload naar MinIO via multipart/form-data.
 * Scant bestanden met ClamAV voor opslag.
 */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireAuth, requireParent } from '../middleware/auth'
import { uploadFile, BUCKET, getMinioClient, getPresignedUrl } from '../lib/minio'
import { randomUUID } from 'crypto'
import path from 'path'
import net from 'net'

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

// ── ClamAV scanner via INSTREAM protocol ─────────────────────────
async function scanWithClamAV(buffer: Buffer): Promise<{ clean: boolean; result: string }> {
  const host = process.env.CLAMAV_HOST || 'clamav'
  const port = parseInt(process.env.CLAMAV_PORT || '3310', 10)

  return new Promise((resolve) => {
    const socket = new net.Socket()
    let response = ''
    let settled = false

    const finish = (clean: boolean, result: string) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({ clean, result })
    }

    socket.setTimeout(10_000) // 10s timeout

    socket.on('connect', () => {
      // Send INSTREAM command (null-terminated)
      socket.write('zINSTREAM\0')

      // Send file data in chunks with 4-byte big-endian length prefix
      const CHUNK_SIZE = 8192
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length))
        const lengthBuf = Buffer.alloc(4)
        lengthBuf.writeUInt32BE(chunk.length, 0)
        socket.write(lengthBuf)
        socket.write(chunk)
      }

      // Send zero-length chunk to signal end of stream
      const endBuf = Buffer.alloc(4)
      endBuf.writeUInt32BE(0, 0)
      socket.write(endBuf)
    })

    socket.on('data', (data) => {
      response += data.toString()
    })

    socket.on('end', () => {
      const trimmed = response.trim()
      const isMalware = trimmed.includes('FOUND')
      finish(!isMalware, trimmed)
    })

    socket.on('error', (err) => {
      // ClamAV not available — log warning and allow
      finish(true, `ClamAV unavailable: ${err.message}`)
    })

    socket.on('timeout', () => {
      finish(true, 'ClamAV timeout')
    })

    socket.connect(port, host)
  })
}

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

    // Scan met ClamAV
    const scanResult = await scanWithClamAV(buffer)
    if (!scanResult.clean) {
      request.log.warn({ scanResult: scanResult.result, filename }, 'ClamAV: malware gedetecteerd')
      return reply.status(400).send({
        error: 'Bestand geweigerd: bevat mogelijk schadelijke inhoud.',
      })
    }
    if (scanResult.result.startsWith('ClamAV unavailable') || scanResult.result === 'ClamAV timeout') {
      request.log.warn({ scanResult: scanResult.result }, 'ClamAV niet beschikbaar — upload wordt doorgelaten')
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

    // Optioneel linken aan message of dossier via query params
    const query = request.query as { messageId?: string; dossierId?: string }

    // Sla attachment-record op
    const attachment = await prisma.attachment.create({
      data: {
        filename: filename.replace(/[<>:"/\\|?*]/g, '_'), // sanitize
        mimeType: mimetype,
        storageKey,
        sizeBytes: buffer.length,
        uploadedById: request.user.sub,
        messageId: query.messageId || undefined,
        dossierId: query.dossierId || undefined,
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

  // ── GET /api/upload/documents — Alle bijlagen overzicht ──────────
  fastify.get('/documents', { preHandler: requireParent }, async (request) => {
    const attachments = await prisma.attachment.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: {
        message: {
          select: {
            id: true,
            channelId: true,
            channel: { select: { name: true, type: true } },
          },
        },
        dossierEntry: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    })

    // Enrich with uploader name
    const uploaderIds = [...new Set(attachments.map(a => a.uploadedById))]
    const uploaders = await prisma.user.findMany({
      where: { id: { in: uploaderIds } },
      select: { id: true, name: true, role: true },
    })
    const uploaderMap = new Map(uploaders.map(u => [u.id, u]))

    const documents = attachments.map(a => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      storageKey: a.storageKey,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt.toISOString(),
      uploader: uploaderMap.get(a.uploadedById) ?? { id: a.uploadedById, name: 'Onbekend', role: 'unknown' },
      linkedTo: a.messageId
        ? { type: 'message' as const, id: a.messageId, channelName: a.message?.channel?.name, channelType: a.message?.channel?.type }
        : a.dossierId
          ? { type: 'dossier' as const, id: a.dossierId, title: a.dossierEntry?.title, category: a.dossierEntry?.category }
          : null,
    }))

    return { documents }
  })

  // ── GET /api/upload/download/:id — Bestand downloaden ────────────
  fastify.get('/download/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const attachment = await prisma.attachment.findUnique({ where: { id } })
    if (!attachment) {
      return reply.status(404).send({ error: 'Bijlage niet gevonden' })
    }

    const url = await getPresignedUrl(attachment.storageKey)
    return { url, filename: attachment.filename, mimeType: attachment.mimeType }
  })
}
