/**
 * JWT Concept Implementation
 *
 * Implements IJWT interface using jsonwebtoken library.
 * Maps to tokens table in schema with @concept JWT annotation.
 */

import * as jwt from 'jsonwebtoken'
import type { DB } from '../lib/db.js'
import type { IJWT } from '../generated/concept-interfaces.js'

const JWT_SECRET = process.env.JWT_SECRET || 'conduit-secret-key-change-in-production'
const JWT_EXPIRATION = '7d'

export class JWTConcept implements IJWT {
  constructor(private db: DB) {}

  async generate(args: {
    user: string
  }): Promise<{ token: string }> {
    const token = jwt.sign(
      { userId: args.user },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    )

    return { token }
  }

  async verify(args: {
    token: string
  }): Promise<{ user: string } | { error: string }> {
    try {
      const decoded = jwt.verify(args.token, JWT_SECRET) as { userId: string }
      return { user: decoded.userId }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { error: 'Token expired' }
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { error: 'Invalid token' }
      }
      return { error: 'Token verification failed' }
    }
  }
}
