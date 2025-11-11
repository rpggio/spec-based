/**
 * Profile Concept Implementation
 *
 * Implements IProfile interface using Drizzle query builder.
 * Maps to users table in schema (Profile is a view of User data).
 */

import { eq } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { users } from '../schemas/index.js'
import type { IProfile } from '../generated/concept-interfaces.js'

export class ProfileConcept implements IProfile {
  constructor(private db: DB) {}

  async get(args: {
    username: string
  }): Promise<{
    username: string
    bio: string
    image: string
  } | { error: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, args.username)
    })

    if (!user) {
      return { error: 'Profile not found' }
    }

    return {
      username: user.username,
      bio: user.bio,
      image: user.image
    }
  }
}
