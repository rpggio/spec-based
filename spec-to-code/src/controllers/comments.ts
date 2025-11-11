/**
 * Comments API Controller
 *
 * Handles comment creation, listing, and deletion.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import type { Router } from '../lib/router.js'
import type { DB } from '../lib/db.js'
import { eq } from 'drizzle-orm'
import { users, comments as commentsTable, articles } from '../schemas/index.js'
import { uuid } from '../lib/utils.js'

export interface Concepts {
  User: any
  Article: any
  Comment: any
  Following: any
  JWT: any
  [key: string]: any
}

export function setupCommentRoutes(router: Router, db: DB, concepts: Concepts): void {
  /**
   * Helper to build comment response with author
   */
  async function buildCommentResponse(commentId: string, currentUserId?: string) {
    const comment = await db.query.comments.findFirst({
      where: eq(commentsTable.id, commentId)
    })

    if (!comment) return null

    const author = await db.query.users.findFirst({
      where: eq(users.id, comment.authorId)
    })

    if (!author) return null

    // Check if current user follows author
    let following = false
    if (currentUserId && currentUserId !== author.id) {
      const followResult = await concepts.Following.isFollowing({ follower: currentUserId, followee: author.id })
      following = followResult.following || false
    }

    return {
      id: comment.id,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      body: comment.body,
      author: {
        username: author.username,
        bio: author.bio,
        image: author.image,
        following
      }
    }
  }

  /**
   * GET /api/articles/:slug/comments - Get comments for an article
   */
  router.get('/api/articles/:slug/comments', async (req, res, params, body) => {
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

      const commentsResult = await concepts.Comment.listByArticle({ article: articleResult.article })

      // Build comment responses
      const commentResponses = await Promise.all(
        commentsResult.comments.map((id: string) => buildCommentResponse(id, currentUserId))
      )

      router.sendJSON(res, 200, {
        comments: commentResponses.filter(c => c !== null)
      })
    } catch (error) {
      console.error('List comments error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * POST /api/articles/:slug/comments - Add comment to an article
   */
  router.post('/api/articles/:slug/comments', async (req, res, params, body) => {
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

      const { body: commentBody } = body?.comment || {}

      if (!commentBody) {
        router.sendJSON(res, 422, { errors: { body: ['Comment body is required'] } })
        return
      }

      const commentId = uuid()

      const createResult = await concepts.Comment.create({
        comment: commentId,
        body: commentBody,
        article: articleResult.article,
        author: verifyResult.user
      })

      if ('error' in createResult) {
        router.sendJSON(res, 422, { errors: { body: [createResult.error] } })
        return
      }

      const commentResponse = await buildCommentResponse(commentId, verifyResult.user)

      router.sendJSON(res, 201, { comment: commentResponse })
    } catch (error) {
      console.error('Create comment error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * DELETE /api/articles/:slug/comments/:id - Delete a comment
   */
  router.delete('/api/articles/:slug/comments/:id', async (req, res, params, body) => {
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

      // Check if comment exists and belongs to user
      const authorResult = await concepts.Comment.getAuthor({ comment: params.id })

      if (!authorResult.author) {
        router.sendJSON(res, 404, { errors: { body: ['Comment not found'] } })
        return
      }

      if (authorResult.author !== verifyResult.user) {
        router.sendJSON(res, 403, { errors: { body: ['Forbidden'] } })
        return
      }

      const deleteResult = await concepts.Comment.delete({ comment: params.id })

      if ('error' in deleteResult) {
        router.sendJSON(res, 422, { errors: { body: [deleteResult.error] } })
        return
      }

      router.sendJSON(res, 200, {})
    } catch (error) {
      console.error('Delete comment error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })
}
