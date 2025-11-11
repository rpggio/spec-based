/**
 * User Concept Implementation
 *
 * Implements IUser interface using Drizzle query builder.
 * Maps to users table in schema with @concept User annotation.
 */

import { eq } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { users } from '../schemas/index.js'
import type { IUser } from '../generated/concept-interfaces.js'

export class UserConcept implements IUser {
  constructor(private db: DB) {}

  async register(args: {
    user: string
    email: string
    username: string
  }): Promise<{ user: string } | { error: string }> {
    try {
      // Validate email format
      if (!this.isValidEmail(args.email)) {
        return { error: 'Invalid email format' }
      }

      // Validate username length
      if (args.username.length < 3) {
        return { error: 'Username must be at least 3 characters' }
      }

      // Check for duplicate email
      const existingEmail = await this.db.query.users.findFirst({
        where: eq(users.email, args.email)
      })
      if (existingEmail) {
        return { error: 'Email already in use' }
      }

      // Check for duplicate username
      const existingUsername = await this.db.query.users.findFirst({
        where: eq(users.username, args.username)
      })
      if (existingUsername) {
        return { error: 'Username already in use' }
      }

      // Create user
      await this.db.insert(users).values({
        id: args.user,
        email: args.email,
        username: args.username,
        bio: '',
        image: ''
      })

      return { user: args.user }
    } catch (error) {
      return { error: `Registration failed: ${error}` }
    }
  }

  async update(args: {
    user: string
    email?: string
    bio?: string
    image?: string
  }): Promise<{ user: string } | { error: string }> {
    try {
      // Validate email if provided
      if (args.email && !this.isValidEmail(args.email)) {
        return { error: 'Invalid email format' }
      }

      // Check if user exists
      const existingUser = await this.db.query.users.findFirst({
        where: eq(users.id, args.user)
      })
      if (!existingUser) {
        return { error: 'User not found' }
      }

      // If email is being updated, check for duplicates
      if (args.email && args.email !== existingUser.email) {
        const duplicateEmail = await this.db.query.users.findFirst({
          where: eq(users.email, args.email)
        })
        if (duplicateEmail) {
          return { error: 'Email already in use' }
        }
      }

      // Update user
      const updateData: any = { updatedAt: new Date() }
      if (args.email !== undefined) updateData.email = args.email
      if (args.bio !== undefined) updateData.bio = args.bio
      if (args.image !== undefined) updateData.image = args.image

      await this.db.update(users)
        .set(updateData)
        .where(eq(users.id, args.user))

      return { user: args.user }
    } catch (error) {
      return { error: `Update failed: ${error}` }
    }
  }

  async getByEmail(args: {
    email: string
  }): Promise<{ user: string } | { error: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, args.email)
    })

    if (!user) {
      return { error: 'User not found' }
    }

    return { user: user.id }
  }

  async getByUsername(args: {
    username: string
  }): Promise<{ user: string } | { error: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, args.username)
    })

    if (!user) {
      return { error: 'User not found' }
    }

    return { user: user.id }
  }

  async exists(args: {
    user: string
  }): Promise<{ exists: boolean }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, args.user)
    })

    return { exists: !!user }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
