/**
 * Following Concept Implementation
 *
 * Implements IFollowing interface using Drizzle query builder.
 * Maps to follows table in schema with @concept Following annotation.
 */

import { eq, and } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { follows } from '../schemas/index.js'
import type { IFollowing } from '../generated/concept-interfaces.js'

export class FollowingConcept implements IFollowing {
  constructor(private db: DB) {}

  async follow(args: {
    follower: string
    followee: string
  }): Promise<{ follower: string }> {
    // Prevent self-following
    if (args.follower === args.followee) {
      return { follower: args.follower }
    }

    // Check if already following
    const existing = await this.db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, args.follower),
        eq(follows.followingId, args.followee)
      )
    })

    if (!existing) {
      await this.db.insert(follows).values({
        followerId: args.follower,
        followingId: args.followee
      })
    }

    return { follower: args.follower }
  }

  async unfollow(args: {
    follower: string
    followee: string
  }): Promise<{ follower: string }> {
    await this.db.delete(follows).where(
      and(
        eq(follows.followerId, args.follower),
        eq(follows.followingId, args.followee)
      )
    )

    return { follower: args.follower }
  }

  async isFollowing(args: {
    follower: string
    followee: string
  }): Promise<{ following: boolean }> {
    const follow = await this.db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, args.follower),
        eq(follows.followingId, args.followee)
      )
    })

    return { following: !!follow }
  }

  async getFollowing(args: {
    user: string
  }): Promise<{ users: string[] }> {
    const following = await this.db.query.follows.findMany({
      where: eq(follows.followerId, args.user)
    })

    return {
      users: following.map(f => f.followingId)
    }
  }

  async getFollowers(args: {
    user: string
  }): Promise<{ users: string[] }> {
    const followers = await this.db.query.follows.findMany({
      where: eq(follows.followingId, args.user)
    })

    return {
      users: followers.map(f => f.followerId)
    }
  }
}
