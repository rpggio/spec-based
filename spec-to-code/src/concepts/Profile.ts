/**
 * Profile Concept Implementation
 *
 * Implements IProfile interface using Drizzle query builder.
 * Maps to users table in schema (Profile is a view of User data).
 */

import { eq, and } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { users, follows } from '../schemas/index.js'
import type { IProfile } from '../generated/concept-interfaces.js'

export class ProfileConcept implements IProfile {
  constructor(private db: DB) {}

  async get(args: {
    username: string
  }): Promise<{
    user: string
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
      user: user.id,
      username: user.username,
      bio: user.bio,
      image: user.image
    }
  }

  async view(args: {
    viewer: string
    username: string
  }): Promise<{
    user: string
    username: string
    bio: string
    image: string
    following: boolean
  } | { error: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, args.username)
    })

    if (!user) {
      return { error: 'Profile not found' }
    }

    // Check if viewer is following this user
    const follow = await this.db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, args.viewer),
        eq(follows.followingId, user.id)
      )
    })

    return {
      user: user.id,
      username: user.username,
      bio: user.bio,
      image: user.image,
      following: !!follow
    }
  }
}
