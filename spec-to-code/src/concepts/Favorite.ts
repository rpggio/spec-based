/**
 * Favorite Concept Implementation
 *
 * Implements IFavorite interface using Drizzle query builder.
 * Maps to favorites table in schema with @concept Favorite annotation.
 */

import { eq, and, sql } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { favorites } from '../schemas/index.js'
import type { IFavorite } from '../generated/concept-interfaces.js'

export class FavoriteConcept implements IFavorite {
  constructor(private db: DB) {}

  async add(args: {
    item: string
    user: string
  }): Promise<{ item: string }> {
    // Check if already favorited
    const existing = await this.db.query.favorites.findFirst({
      where: and(
        eq(favorites.articleId, args.item),
        eq(favorites.userId, args.user)
      )
    })

    if (!existing) {
      await this.db.insert(favorites).values({
        articleId: args.item,
        userId: args.user
      })
    }

    return { item: args.item }
  }

  async remove(args: {
    item: string
    user: string
  }): Promise<{ item: string }> {
    await this.db.delete(favorites).where(
      and(
        eq(favorites.articleId, args.item),
        eq(favorites.userId, args.user)
      )
    )

    return { item: args.item }
  }

  async isFavorited(args: {
    item: string
    user: string
  }): Promise<{ favorited: boolean }> {
    const favorite = await this.db.query.favorites.findFirst({
      where: and(
        eq(favorites.articleId, args.item),
        eq(favorites.userId, args.user)
      )
    })

    return { favorited: !!favorite }
  }

  async getCount(args: {
    item: string
  }): Promise<{ count: number }> {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(eq(favorites.articleId, args.item))

    return { count: result[0]?.count || 0 }
  }

  async getFavoritedBy(args: {
    user: string
  }): Promise<{ items: string[] }> {
    const userFavorites = await this.db.query.favorites.findMany({
      where: eq(favorites.userId, args.user)
    })

    return {
      items: userFavorites.map(f => f.articleId)
    }
  }
}
