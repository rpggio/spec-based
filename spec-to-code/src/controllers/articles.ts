/**
 * Articles API Controller
 *
 * Handles article CRUD operations, listing, and feed.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import type { Router } from '../lib/router.js'
import type { DB } from '../lib/db.js'
import { eq } from 'drizzle-orm'
import { users, articles, comments as commentsTable } from '../schemas/index.js'
import { uuid, slugify } from '../lib/utils.js'

export interface Concepts {
  User: any
  Article: any
  Tag: any
  Favorite: any
  Following: any
  Comment: any
  JWT: any
  [key: string]: any
}

export function setupArticleRoutes(router: Router, db: DB, concepts: Concepts): void {
  /**
   * Helper to build article response with author and metadata
   */
  async function buildArticleResponse(articleId: string, currentUserId?: string) {
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId)
    })

    if (!article) return null

    const author = await db.query.users.findFirst({
      where: eq(users.id, article.authorId)
    })

    if (!author) return null

    // Get tags
    const tagsResult = await concepts.Tag.getByArticle({ article: articleId })
    const tagList = tagsResult.tags || []

    // Get favorites count
    const favCountResult = await concepts.Favorite.getCount({ item: articleId })
    const favoritesCount = favCountResult.count || 0

    // Check if current user favorited
    let favorited = false
    if (currentUserId) {
      const favResult = await concepts.Favorite.isFavorited({ item: articleId, user: currentUserId })
      favorited = favResult.favorited || false
    }

    // Check if current user follows author
    let following = false
    if (currentUserId && currentUserId !== author.id) {
      const followResult = await concepts.Following.isFollowing({ follower: currentUserId, followee: author.id })
      following = followResult.following || false
    }

    return {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      tagList,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      favorited,
      favoritesCount,
      author: {
        username: author.username,
        bio: author.bio,
        image: author.image,
        following
      }
    }
  }

  /**
   * GET /api/articles - List articles with filters
   */
  router.get('/api/articles', async (req, res, params, body) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const tag = url.searchParams.get('tag')
      const author = url.searchParams.get('author')
      const favorited = url.searchParams.get('favorited')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      // Get current user if authenticated
      const token = router.extractToken(req)
      let currentUserId: string | undefined
      if (token) {
        const verifyResult = await concepts.JWT.verify({ token })
        if (!('error' in verifyResult)) {
          currentUserId = verifyResult.user
        }
      }

      let articleIds: string[] = []
      let count = 0

      if (tag) {
        const result = await concepts.Article.listByTag({ tag, limit, offset })
        articleIds = result.articles
        count = result.count
      } else if (author) {
        // Get user by username
        const userResult = await concepts.User.getByUsername({ username: author })
        if ('error' in userResult) {
          router.sendJSON(res, 200, { articles: [], articlesCount: 0 })
          return
        }
        const result = await concepts.Article.listByAuthor({ author: userResult.user, limit, offset })
        articleIds = result.articles
        count = result.count
      } else if (favorited) {
        // Get user by username
        const userResult = await concepts.User.getByUsername({ username: favorited })
        if ('error' in userResult) {
          router.sendJSON(res, 200, { articles: [], articlesCount: 0 })
          return
        }
        const favResult = await concepts.Favorite.getFavoritedBy({ user: userResult.user })
        articleIds = favResult.items.slice(offset, offset + limit)
        count = favResult.items.length
      } else {
        const result = await concepts.Article.list({ limit, offset })
        articleIds = result.articles
        count = result.count
      }

      // Build article responses
      const articleResponses = await Promise.all(
        articleIds.map(id => buildArticleResponse(id, currentUserId))
      )

      router.sendJSON(res, 200, {
        articles: articleResponses.filter(a => a !== null),
        articlesCount: count
      })
    } catch (error) {
      console.error('List articles error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * GET /api/articles/feed - Get personalized feed
   */
  router.get('/api/articles/feed', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      if (!token) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const verifyResult = await concepts.JWT.verify({ token })
      if ('error' in verifyResult) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const result = await concepts.Article.feed({ user: verifyResult.user, limit, offset })

      // Build article responses
      const articleResponses = await Promise.all(
        result.articles.map((id: string) => buildArticleResponse(id, verifyResult.user))
      )

      router.sendJSON(res, 200, {
        articles: articleResponses.filter(a => a !== null),
        articlesCount: result.count
      })
    } catch (error) {
      console.error('Feed error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * GET /api/articles/:slug - Get single article
   */
  router.get('/api/articles/:slug', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      let currentUserId: string | undefined
      if (token) {
        const verifyResult = await concepts.JWT.verify({ token })
        if (!('error' in verifyResult)) {
          currentUserId = verifyResult.user
        }
      }

      const articleResult = await concepts.Article.getBySlug({ slug: params.slug })

      if ('error' in articleResult) {
        router.sendJSON(res, 404, { errors: { body: ['Article not found'] } })
        return
      }

      const articleResponse = await buildArticleResponse(articleResult.article, currentUserId)

      if (!articleResponse) {
        router.sendJSON(res, 404, { errors: { body: ['Article not found'] } })
        return
      }

      router.sendJSON(res, 200, { article: articleResponse })
    } catch (error) {
      console.error('Get article error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * POST /api/articles - Create article
   */
  router.post('/api/articles', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      if (!token) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const verifyResult = await concepts.JWT.verify({ token })
      if ('error' in verifyResult) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const { title, description, body: articleBody, tagList } = body?.article || {}

      if (!title || !description || !articleBody) {
        router.sendJSON(res, 422, {
          errors: { body: ['title, description, and body are required'] }
        })
        return
      }

      const articleId = uuid()
      const slug = slugify(title) + '-' + articleId.slice(0, 8)

      const createResult = await concepts.Article.create({
        article: articleId,
        slug,
        title,
        description,
        body: articleBody,
        author: verifyResult.user
      })

      if ('error' in createResult) {
        router.sendJSON(res, 422, { errors: { body: [createResult.error] } })
        return
      }

      // Add tags if provided
      if (tagList && Array.isArray(tagList)) {
        for (const tag of tagList) {
          await concepts.Tag.add({ article: articleId, tag })
        }
      }

      const articleResponse = await buildArticleResponse(articleId, verifyResult.user)

      router.sendJSON(res, 201, { article: articleResponse })
    } catch (error) {
      console.error('Create article error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * PUT /api/articles/:slug - Update article
   */
  router.put('/api/articles/:slug', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      if (!token) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const verifyResult = await concepts.JWT.verify({ token })
      if ('error' in verifyResult) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const articleResult = await concepts.Article.getBySlug({ slug: params.slug })

      if ('error' in articleResult) {
        router.sendJSON(res, 404, { errors: { body: ['Article not found'] } })
        return
      }

      // Check if user is the author
      if (articleResult.author !== verifyResult.user) {
        router.sendJSON(res, 403, { errors: { body: ['Forbidden'] } })
        return
      }

      const { title, description, body: articleBody } = body?.article || {}

      const updateResult = await concepts.Article.update({
        article: articleResult.article,
        title,
        description,
        body: articleBody
      })

      if ('error' in updateResult) {
        router.sendJSON(res, 422, { errors: { body: [updateResult.error] } })
        return
      }

      const articleResponse = await buildArticleResponse(articleResult.article, verifyResult.user)

      router.sendJSON(res, 200, { article: articleResponse })
    } catch (error) {
      console.error('Update article error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * DELETE /api/articles/:slug - Delete article
   */
  router.delete('/api/articles/:slug', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      if (!token) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const verifyResult = await concepts.JWT.verify({ token })
      if ('error' in verifyResult) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const articleResult = await concepts.Article.getBySlug({ slug: params.slug })

      if ('error' in articleResult) {
        router.sendJSON(res, 404, { errors: { body: ['Article not found'] } })
        return
      }

      // Check if user is the author
      if (articleResult.author !== verifyResult.user) {
        router.sendJSON(res, 403, { errors: { body: ['Forbidden'] } })
        return
      }

      const deleteResult = await concepts.Article.delete({ article: articleResult.article })

      if ('error' in deleteResult) {
        router.sendJSON(res, 422, { errors: { body: [deleteResult.error] } })
        return
      }

      router.sendJSON(res, 200, {})
    } catch (error) {
      console.error('Delete article error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * POST /api/articles/:slug/favorite - Favorite article
   */
  router.post('/api/articles/:slug/favorite', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      if (!token) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const verifyResult = await concepts.JWT.verify({ token })
      if ('error' in verifyResult) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const articleResult = await concepts.Article.getBySlug({ slug: params.slug })

      if ('error' in articleResult) {
        router.sendJSON(res, 404, { errors: { body: ['Article not found'] } })
        return
      }

      await concepts.Favorite.add({ item: articleResult.article, user: verifyResult.user })

      const articleResponse = await buildArticleResponse(articleResult.article, verifyResult.user)

      router.sendJSON(res, 200, { article: articleResponse })
    } catch (error) {
      console.error('Favorite article error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * DELETE /api/articles/:slug/favorite - Unfavorite article
   */
  router.delete('/api/articles/:slug/favorite', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      if (!token) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const verifyResult = await concepts.JWT.verify({ token })
      if ('error' in verifyResult) {
        router.sendJSON(res, 401, { errors: { body: ['Unauthorized'] } })
        return
      }

      const articleResult = await concepts.Article.getBySlug({ slug: params.slug })

      if ('error' in articleResult) {
        router.sendJSON(res, 404, { errors: { body: ['Article not found'] } })
        return
      }

      await concepts.Favorite.remove({ item: articleResult.article, user: verifyResult.user })

      const articleResponse = await buildArticleResponse(articleResult.article, verifyResult.user)

      router.sendJSON(res, 200, { article: articleResponse })
    } catch (error) {
      console.error('Unfavorite article error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })
}
