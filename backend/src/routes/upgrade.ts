/**
 * Upgrade API — admin kan de app updaten vanuit de UI
 * Roept scripts/upgrade.sh aan via child_process
 */
import { FastifyInstance } from 'fastify'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync } from 'fs'
import { requireAuth } from '../middleware/auth'

const execFileAsync = promisify(execFile)
const APP_DIR = process.env.APP_DIR ?? '/opt/adhd'
const UPGRADE_SCRIPT = `${APP_DIR}/scripts/upgrade.sh`
const RESULT_FILE = `${APP_DIR}/.upgrade-result`
const VERSION_FILE = `${APP_DIR}/.version`

async function requireAdmin(request: any, reply: any) {
  await requireAuth(request, reply)
  if (request.user?.role !== 'admin') {
    return reply.status(403).send({ error: 'Alleen admins kunnen upgrades uitvoeren' })
  }
}

export async function upgradeRoutes(fastify: FastifyInstance) {
  // ── GET /api/admin/system/version ─────────────────────────────
  fastify.get('/api/admin/system/version', { preHandler: requireAdmin }, async () => {
    let version = 'unknown'
    let uptime = process.uptime()

    try {
      version = readFileSync(VERSION_FILE, 'utf8').trim()
    } catch {}

    return { version, uptime: Math.floor(uptime) }
  })

  // ── GET /api/admin/system/update-check ───────────────────────
  fastify.get('/api/admin/system/update-check', { preHandler: requireAdmin }, async (_, reply) => {
    if (!existsSync(UPGRADE_SCRIPT)) {
      return { update_available: false, error: 'Upgrade script niet gevonden' }
    }

    try {
      const { stdout } = await execFileAsync('bash', [UPGRADE_SCRIPT, '--check'], { timeout: 30000 })
      return JSON.parse(stdout.trim())
    } catch (err: any) {
      fastify.log.error('Update check fout:', err)
      return reply.status(500).send({ error: 'Kon update check niet uitvoeren' })
    }
  })

  // ── POST /api/admin/system/update-apply ──────────────────────
  // Start de upgrade als background job; client pollt /update-status
  fastify.post('/api/admin/system/update-apply', { preHandler: requireAdmin }, async (_, reply) => {
    if (!existsSync(UPGRADE_SCRIPT)) {
      return reply.status(400).send({ error: 'Upgrade script niet gevonden' })
    }

    // Start als losstaand proces (niet wachten)
    const child = spawn('bash', [UPGRADE_SCRIPT, '--apply'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, APP_DIR },
    })
    child.unref()

    return { ok: true, message: 'Upgrade gestart. Pollt /update-status voor resultaat.' }
  })

  // ── GET /api/admin/system/update-status ─────────────────────
  fastify.get('/api/admin/system/update-status', { preHandler: requireAdmin }, async () => {
    if (!existsSync(RESULT_FILE)) {
      return { status: 'running' }
    }
    try {
      const raw = readFileSync(RESULT_FILE, 'utf8').trim()
      const result = JSON.parse(raw)
      return { status: result.success ? 'success' : 'failed', ...result }
    } catch {
      return { status: 'running' }
    }
  })

  // ── POST /api/admin/system/rollback ─────────────────────────
  fastify.post('/api/admin/system/rollback', { preHandler: requireAdmin }, async (_, reply) => {
    if (!existsSync(UPGRADE_SCRIPT)) {
      return reply.status(400).send({ error: 'Upgrade script niet gevonden' })
    }

    const child = spawn('bash', [UPGRADE_SCRIPT, '--rollback'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, APP_DIR },
    })
    child.unref()

    return { ok: true, message: 'Rollback gestart.' }
  })

  // ── POST /api/admin/system/backup ────────────────────────────
  fastify.post('/api/admin/system/backup', { preHandler: requireAdmin }, async (_, reply) => {
    const backupScript = `${APP_DIR}/scripts/backup.sh`
    if (!existsSync(backupScript)) {
      return reply.status(400).send({ error: 'Backup script niet gevonden' })
    }

    try {
      await execFileAsync('bash', [backupScript], {
        timeout: 120000,
        env: { ...process.env, APP_DIR },
      })
      return { ok: true }
    } catch (err: any) {
      fastify.log.error('Backup fout:', err)
      return reply.status(500).send({ error: 'Backup mislukt' })
    }
  })
}
