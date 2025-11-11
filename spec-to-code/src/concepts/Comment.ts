/**
 * Comment Concept Implementation
 *
 * Implements IComment interface using Drizzle query builder.
 * Maps to comments table in schema with @concept Comment annotation.
 */

import { eq, desc } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { comments } from '../schemas/index.js'
import type { IComment } from '../generated/concept-interfaces.js'

export class CommentConcept implements IComment {
  constructor(private db: DB) {}

  async create(args: {
    comment: string
    body: string
    article: string
    author: string
  }): Promise<{ comment: string } | { error: string }> {
    try {
      if (!args.body || args.body.trim().length === 0) {
        return { error: 'Comment body is required' }
      }

      await this.db.insert(comments).values({
        id: args.comment,
        body: args.body,
        articleId: args.article,
        authorId: args.author
      })

      return { comment: args.comment }
    } catch (error) {
      return { error: `Failed to create comment: ${error}` }
    }
  }

  async delete(args: {
    comment: string
  }): Promise<{ comment: string } | { error: string }> {
    try {
      const existing = await this.db.query.comments.findFirst({
        where: eq(comments.id, args.comment)
      })

      if (!existing) {
        return { error: 'Comment not found' }
      }

      await this.db.delete(comments).where(eq(comments.id, args.comment))
      return { comment: args.comment }
    } catch (error) {
      return { error: `Failed to delete comment: ${error}` }
    }
  }

  async listByArticle(args: {
    article: string
  }): Promise<{ comments: string[] }> {
    const articleComments = await this.db.query.comments.findMany({
      where: eq(comments.articleId, args.article),
      orderBy: desc(comments.createdAt)
    })

    return {
      comments: articleComments.map(c => c.id)
    }
  }

  async getAuthor(args: {
    comment: string
  }): Promise<{ author: string }> {
    const comment = await this.db.query.comments.findFirst({
      where: eq(comments.id, args.comment)
    })

    return { author: comment?.authorId || '' }
  }
}
