import * as argon2 from 'argon2'
import { createHash } from 'crypto'

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

export const hashPin = hashPassword
export const verifyPin = verifyPassword

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
