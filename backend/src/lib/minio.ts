/**
 * MinIO client voor bestandsopslag.
 * Beheert upload, download (pre-signed URLs) en verwijdering.
 */
import * as Minio from 'minio'

let _client: Minio.Client | null = null

export function getMinioClient(): Minio.Client {
  if (!_client) {
    const url = new URL(process.env.MINIO_URL ?? 'http://minio:9000')
    _client = new Minio.Client({
      endPoint: url.hostname,
      port: parseInt(url.port || (url.protocol === 'https:' ? '443' : '9000')),
      useSSL: url.protocol === 'https:',
      accessKey: process.env.MINIO_USER ?? 'grip',
      secretKey: process.env.MINIO_PASS ?? 'changeme',
    })
  }
  return _client
}

export const BUCKET = process.env.MINIO_BUCKET ?? 'grip-files'

/** Bucket aanmaken als die nog niet bestaat */
export async function ensureBucket(): Promise<void> {
  const client = getMinioClient()
  const exists = await client.bucketExists(BUCKET)
  if (!exists) {
    await client.makeBucket(BUCKET, 'eu-west-1')
  }
}

/** Bestand uploaden — geeft storageKey terug */
export async function uploadFile(opts: {
  key: string
  buffer: Buffer
  mimeType: string
  sizeBytes: number
}): Promise<string> {
  const client = getMinioClient()
  await ensureBucket()
  await client.putObject(BUCKET, opts.key, opts.buffer, opts.sizeBytes, {
    'Content-Type': opts.mimeType,
  })
  return opts.key
}

/** Pre-signed download URL (5 minuten geldig) */
export async function getPresignedUrl(key: string, expirySeconds = 300): Promise<string> {
  const client = getMinioClient()
  return client.presignedGetObject(BUCKET, key, expirySeconds)
}

/** Bestand verwijderen */
export async function deleteFile(key: string): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(BUCKET, key)
}
