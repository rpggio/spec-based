/**
 * Article Concept Implementation
 *
 * Implements IArticle interface using Drizzle query builder.
 * Maps to articles table in schema with @concept Article annotation.
 */

import { eq, desc, and, inArray, sql } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { articles, articleTags, follows } from '../schemas/index.js'
import type { IArticle } from '../generated/concept-interfaces.js'

export class ArticleConcept implements IArticle {
  constructor(private db: DB) {}

  async create(args: {
    article: string
    slug: string
    title: string
    description: string
    body: string
    author: string
  }): Promise<{ article: string } | { error: string }> {
    try {
      // Validate title
      if (args.title.length < 1) {
        return { error: 'Title is required' }
      }

      // Check for duplicate slug
      const existing = await this.db.query.articles.findFirst({
        where: eq(articles.slug, args.slug)
      })
      if (existing) {
        return { error: 'Article with this slug already exists' }
      }

      // Create article
      await this.db.insert(articles).values({
        id: args.article,
        slug: args.slug,
        title: args.title,
        description: args.description,
        body: args.body,
        authorId: args.author
      })

      return { article: args.article }
    } catch (error) {
      return { error: `Failed to create article: ${error}` }
    }
  }

  async getBySlug(args: {
    slug: string
  }): Promise<{
    article: string
    title: string
    description: string
    body: string
    author: string
    createdAt: Date
    updatedAt: Date
  } | { error: string }> {
    const article = await this.db.query.articles.findFirst({
      where: eq(articles.slug, args.slug)
    })

    if (!article) {
      return { error: 'Article not found' }
    }

    return {
      article: article.id,
      title: article.title,
      description: article.description,
      body: article.body,
      author: article.authorId,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    }
  }

  async update(args: {
    article: string
    title?: string
    description?: string
    body?: string
  }): Promise<{ article: string } | { error: string }> {
    try {
      // Validate title if provided
      if (args.title !== undefined && args.title.length < 1) {
        return { error: 'Title cannot be empty' }
      }

      // Check if article exists
      const existing = await this.db.query.articles.findFirst({
        where: eq(articles.id, args.article)
      })
      if (!existing) {
        return { error: 'Article not found' }
      }

      // Update article
      const updateData: any = { updatedAt: new Date() }
      if (args.title !== undefined) updateData.title = args.title
      if (args.description !== undefined) updateData.description = args.description
      if (args.body !== undefined) updateData.body = args.body

      await this.db.update(articles)
        .set(updateData)
        .where(eq(articles.id, args.article))

      return { article: args.article }
    } catch (error) {
      return { error: `Failed to update article: ${error}` }
    }
  }

  async delete(args: {
    article: string
  }): Promise<{ article: string } | { error: string }> {
    try {
      const existing = await this.db.query.articles.findFirst({
        where: eq(articles.id, args.article)
      })
      if (!existing) {
        return { error: 'Article not found' }
      }

      await this.db.delete(articles).where(eq(articles.id, args.article))
      return { article: args.article }
    } catch (error) {
      return { error: `Failed to delete article: ${error}` }
    }
  }

  async list(args: {
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }> {
    const allArticles = await this.db.query.articles.findMany({
      orderBy: desc(articles.createdAt),
      limit: args.limit,
      offset: args.offset
    })

    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(articles)

    return {
      articles: allArticles.map(a => a.id),
      count: countResult[0]?.count || 0
    }
  }

  async listByAuthor(args: {
    author: string
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }> {
    const authorArticles = await this.db.query.articles.findMany({
      where: eq(articles.authorId, args.author),
      orderBy: desc(articles.createdAt),
      limit: args.limit,
      offset: args.offset
    })

    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.authorId, args.author))

    return {
      articles: authorArticles.map(a => a.id),
      count: countResult[0]?.count || 0
    }
  }

  async listByTag(args: {
    tag: string
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }> {
    const taggedArticles = await this.db.query.articleTags.findMany({
      where: eq(articleTags.tagName, args.tag),
      with: {
        article: true
      },
      limit: args.limit,
      offset: args.offset
    })

    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(articleTags)
      .where(eq(articleTags.tagName, args.tag))

    return {
      articles: taggedArticles.map(at => at.article.id),
      count: countResult[0]?.count || 0
    }
  }

  async feed(args: {
    user: string
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }> {
    // Get users that the current user follows
    const following = await this.db.query.follows.findMany({
      where: eq(follows.followerId, args.user)
    })

    if (following.length === 0) {
      return { articles: [], count: 0 }
    }

    const followingIds = following.map(f => f.followingId)

    // Get articles from followed users
    const feedArticles = await this.db.query.articles.findMany({
      where: inArray(articles.authorId, followingIds),
      orderBy: desc(articles.createdAt),
      limit: args.limit,
      offset: args.offset
    })

    const countResult = await this.db.select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(inArray(articles.authorId, followingIds))

    return {
      articles: feedArticles.map(a => a.id),
      count: countResult[0]?.count || 0
    }
  }

  async getAuthor(args: {
    article: string
  }): Promise<{ author: string }> {
    const article = await this.db.query.articles.findFirst({
      where: eq(articles.id, args.article)
    })

    return { author: article?.authorId || '' }
  }

  async exists(args: {
    article: string
  }): Promise<{ exists: boolean }> {
    const article = await this.db.query.articles.findFirst({
      where: eq(articles.id, args.article)
    })

    return { exists: !!article }
  }
}
