/**
 * Tag Concept Implementation
 *
 * Implements ITag interface using Drizzle query builder.
 * Maps to tags and article_tags tables in schema with @concept Tag annotation.
 */

import { eq, and } from 'drizzle-orm'
import type { DB } from '../lib/db.js'
import { tags, articleTags } from '../schemas/index.js'
import type { ITag } from '../generated/concept-interfaces.js'

export class TagConcept implements ITag {
  constructor(private db: DB) {}

  async add(args: {
    article: string
    tag: string
  }): Promise<{ article: string }> {
    // Ensure tag exists
    const existingTag = await this.db.query.tags.findFirst({
      where: eq(tags.name, args.tag)
    })

    if (!existingTag) {
      await this.db.insert(tags).values({
        name: args.tag
      })
    }

    // Check if article-tag relationship already exists
    const existingRelation = await this.db.query.articleTags.findFirst({
      where: and(
        eq(articleTags.articleId, args.article),
        eq(articleTags.tagName, args.tag)
      )
    })

    if (!existingRelation) {
      await this.db.insert(articleTags).values({
        articleId: args.article,
        tagName: args.tag
      })
    }

    return { article: args.article }
  }

  async remove(args: {
    article: string
    tag: string
  }): Promise<{ article: string }> {
    await this.db.delete(articleTags).where(
      and(
        eq(articleTags.articleId, args.article),
        eq(articleTags.tagName, args.tag)
      )
    )

    return { article: args.article }
  }

  async getByArticle(args: {
    article: string
  }): Promise<{ tags: string[] }> {
    const articleTagsList = await this.db.query.articleTags.findMany({
      where: eq(articleTags.articleId, args.article)
    })

    return {
      tags: articleTagsList.map(at => at.tagName)
    }
  }

  async list(): Promise<{ tags: string[] }> {
    const allTags = await this.db.query.tags.findMany()
    return {
      tags: allTags.map(t => t.name)
    }
  }
}
