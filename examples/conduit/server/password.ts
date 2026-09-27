import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>

const KEY_LENGTH = 64

/** Hashes a password with scrypt, as `salt:hash` (hex) */
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)

  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')

  if (!salt || !hash) {
    return false
  }

  const expected = Buffer.from(hash, 'hex')
  const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), expected.length)

  return timingSafeEqual(actual, expected)
}
