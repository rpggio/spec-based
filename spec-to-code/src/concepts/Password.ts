/**
 * Password Concept Implementation
 *
 * Implements IPassword interface using Drizzle query builder and bcrypt.
 * Maps to passwords table in schema with @concept Password annotation.
 */

import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import type { DB } from '../lib/db.js'
import { passwords } from '../schemas/index.js'
import type { IPassword } from '../generated/concept-interfaces.js'

const SALT_ROUNDS = 10
const MIN_PASSWORD_LENGTH = 6

export class PasswordConcept implements IPassword {
  constructor(private db: DB) {}

  async set(args: {
    user: string
    password: string
  }): Promise<{ user: string } | { error: string }> {
    try {
      // Validate password
      const validation = await this.validate({ password: args.password })
      if (!validation.valid) {
        return { error: 'Password must be at least 6 characters' }
      }

      // Generate salt and hash
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = await bcrypt.hash(args.password, SALT_ROUNDS)

      // Check if password exists for user
      const existing = await this.db.query.passwords.findFirst({
        where: eq(passwords.userId, args.user)
      })

      if (existing) {
        // Update existing password
        await this.db.update(passwords)
          .set({ hash, salt })
          .where(eq(passwords.userId, args.user))
      } else {
        // Insert new password
        await this.db.insert(passwords).values({
          userId: args.user,
          hash,
          salt
        })
      }

      return { user: args.user }
    } catch (error) {
      return { error: `Failed to set password: ${error}` }
    }
  }

  async check(args: {
    user: string
    password: string
  }): Promise<{ valid: boolean } | { error: string }> {
    try {
      const passwordRecord = await this.db.query.passwords.findFirst({
        where: eq(passwords.userId, args.user)
      })

      if (!passwordRecord) {
        return { error: 'User not found' }
      }

      const valid = await bcrypt.compare(args.password, passwordRecord.hash)
      return { valid }
    } catch (error) {
      return { error: `Password check failed: ${error}` }
    }
  }

  async validate(args: {
    password: string
  }): Promise<{ valid: boolean }> {
    const valid = args.password.length >= MIN_PASSWORD_LENGTH
    return { valid }
  }
}
