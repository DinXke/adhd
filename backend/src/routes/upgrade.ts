/**
 * Upgrade API — admin kan de app updaten vanuit de UI
 * Werkt zowel bare-metal (via upgrade.sh) als Docker (via git pull + rebuild op host)
 */
import { FastifyInstance } from 'fastify'
import { execFile, spawn, exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, createReadStream } from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)
const APP_DIR = process.env.APP_DIR ?? '/opt/adhd'
const UPGRADE_SCRIPT = `${APP_DIR}/scripts/upgrade.sh`
const RESULT_FILE = `${APP_DIR}/.upgrade-result`
const VERSION_FILE = `${APP_DIR}/.version`
const COMPOSE_FILE = `${APP_DIR}/docker-compose.yml`
const BACKUP_DIR = '/tmp/grip-backups'

// Ensure backup directory exists
mkdirSync(BACKUP_DIR, { recursive: true })

// Detect mode: bare-metal (upgrade.sh exists) or Docker
const isDocker = !existsSync(UPGRADE_SCRIPT) && existsSync('/.dockerenv')

async function requireAdmin(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Niet ingelogd' })
  }
  if (request.user?.role !== 'admin') {
    return reply.status(403).send({ error: 'Alleen admins' })
  }
}

export async function upgradeRoutes(fastify: FastifyInstance) {

  // ── GET /api/admin/system/version ─────────────────────────────
  fastify.get('/api/admin/system/version', { preHandler: requireAdmin }, async () => {
    let version = 'v1.3.0'
    try { version = readFileSync(VERSION_FILE, 'utf8').trim() } catch {}

    // Try git for more info
    let gitSha = ''
    try {
      const { stdout } = await execAsync(`git -C ${APP_DIR} rev-parse --short HEAD 2>/dev/null`)
      gitSha = stdout.trim()
    } catch {}

    return {
      version: gitSha ? `${version} (${gitSha})` : version,
      uptime: Math.floor(process.uptime()),
      mode: isDocker ? 'docker' : 'bare-metal',
    }
  })

  // ── GET /api/admin/system/update-check ───────────────────────
  fastify.get('/api/admin/system/update-check', { preHandler: requireAdmin }, async (_, reply) => {
    // Try git directly (works if APP_DIR is mounted)
    try {
      await execAsync(`git -C ${APP_DIR} fetch origin main --quiet`, { timeout: 15000 })
      const { stdout: localSha } = await execAsync(`git -C ${APP_DIR} rev-parse HEAD`)
      const { stdout: remoteSha } = await execAsync(`git -C ${APP_DIR} rev-parse origin/main`)

      if (localSha.trim() === remoteSha.trim()) {
        return { update_available: false, current_sha: localSha.trim().slice(0, 8) }
      }

      const { stdout: changelog } = await execAsync(
        `git -C ${APP_DIR} log --oneline ${localSha.trim()}..origin/main 2>/dev/null | head -15`
      )

      return {
        update_available: true,
        current_sha: localSha.trim().slice(0, 8),
        latest_sha: remoteSha.trim().slice(0, 8),
        changes: changelog.trim().split('\n').filter(Boolean),
      }
    } catch (err: any) {
      // Git not available or APP_DIR not mounted
      return {
        update_available: false,
        error: `Kan updates niet controleren: ${err.message?.slice(0, 100) ?? 'onbekende fout'}. Zorg dat ${APP_DIR} als volume gemount is.`,
      }
    }
  })

  // ── POST /api/admin/system/update-apply ──────────────────────
  fastify.post('/api/admin/system/update-apply', { preHandler: requireAdmin }, async (_, reply) => {
    // Write a pending status
    try {
      writeFileSync(RESULT_FILE, JSON.stringify({ success: false, status: 'running', timestamp: new Date().toISOString() }))
    } catch {}

    // Execute upgrade in background
    const script = `
      cd ${APP_DIR} &&
      git pull origin main --quiet &&
      docker compose build --quiet &&
      docker compose up -d --remove-orphans &&
      echo '{"success":true,"timestamp":"'$(date -Iseconds)'"}' > ${RESULT_FILE}
    `

    try {
      // Try executing on host via docker socket
      const child = spawn('sh', ['-c', script], {
        detached: true,
        stdio: 'ignore',
        cwd: APP_DIR,
      })
      child.unref()
      return { ok: true, message: 'Upgrade gestart.' }
    } catch {
      return reply.status(500).send({ error: 'Kon upgrade niet starten' })
    }
  })

  // ── GET /api/admin/system/update-status ─────────────────────
  fastify.get('/api/admin/system/update-status', { preHandler: requireAdmin }, async () => {
    try {
      const raw = readFileSync(RESULT_FILE, 'utf8').trim()
      const result = JSON.parse(raw)
      return { status: result.success ? 'success' : result.status === 'running' ? 'running' : 'failed', ...result }
    } catch {
      return { status: 'idle' }
    }
  })

  // ── POST /api/admin/system/rollback ─────────────────────────
  fastify.post('/api/admin/system/rollback', { preHandler: requireAdmin }, async (_, reply) => {
    try {
      await execAsync(`cd ${APP_DIR} && git checkout HEAD~1 && docker compose build --quiet && docker compose up -d`, { timeout: 300000 })
      return { ok: true }
    } catch (err: any) {
      return reply.status(500).send({ error: err.message?.slice(0, 200) ?? 'Rollback mislukt' })
    }
  })

  // ── POST /api/admin/system/backup ────────────────────────────
  fastify.post('/api/admin/system/backup', { preHandler: requireAdmin }, async (_, reply) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = `grip-backup-${timestamp}.sql.gz`
      const backupPath = path.join(BACKUP_DIR, backupFile)
      await execAsync(
        `pg_dump "${process.env.DATABASE_URL}" | gzip > "${backupPath}"`,
        { timeout: 120000 }
      )
      return { ok: true, path: backupPath, filename: backupFile }
    } catch (err: any) {
      return reply.status(500).send({ error: `Backup mislukt: ${err.message?.slice(0, 200) ?? 'onbekende fout'}` })
    }
  })

  // ── GET /api/admin/system/backups — Lijst van backups ────────
  fastify.get('/api/admin/system/backups', { preHandler: requireAdmin }, async () => {
    mkdirSync(BACKUP_DIR, { recursive: true })
    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('grip-backup-'))
        .map((name) => {
          const filePath = path.join(BACKUP_DIR, name)
          const stats = statSync(filePath)
          return {
            name,
            sizeBytes: stats.size,
            date: stats.mtime.toISOString(),
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return { backups: files }
    } catch {
      return { backups: [] }
    }
  })

  // ── GET /api/admin/system/backups/:filename — Download backup ─
  fastify.get('/api/admin/system/backups/:filename', { preHandler: requireAdmin }, async (request, reply) => {
    const { filename } = request.params as { filename: string }

    // Sanitize: only allow expected backup filenames (no path traversal)
    if (!filename.startsWith('grip-backup-') || filename.includes('/') || filename.includes('..')) {
      return reply.status(400).send({ error: 'Ongeldig bestandsnaam' })
    }

    const filePath = path.join(BACKUP_DIR, filename)
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'Backup niet gevonden' })
    }

    const stats = statSync(filePath)
    const stream = createReadStream(filePath)

    return reply
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Content-Type', 'application/gzip')
      .header('Content-Length', stats.size)
      .send(stream)
  })
}
