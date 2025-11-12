/**
 * Profiles API Controller
 *
 * Handles profile viewing and follow/unfollow operations.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import type { Router } from '../lib/router.js'
import type { DB } from '../lib/db.js'

export interface Concepts {
  User: any
  Profile: any
  Following: any
  JWT: any
  [key: string]: any
}

export function setupProfileRoutes(router: Router, db: DB, concepts: Concepts): void {
  /**
   * GET /api/profiles/:username - Get user profile
   */
  router.get('/api/profiles/:username', async (req, res, params, body) => {
    try {
      const token = router.extractToken(req)
      let currentUserId: string | undefined

      if (token) {
        const verifyResult = await concepts.JWT.verify({ token })
        if (!('error' in verifyResult)) {
          currentUserId = verifyResult.user
        }
      }

      let profileResult
      if (currentUserId) {
        profileResult = await concepts.Profile.view({ viewer: currentUserId, username: params.username })
      } else {
        profileResult = await concepts.Profile.get({ username: params.username })
        // Add following: false for unauthenticated requests
        if (!('error' in profileResult)) {
          profileResult = { ...profileResult, following: false }
        }
      }

      if ('error' in profileResult) {
        router.sendJSON(res, 404, { errors: { body: ['Profile not found'] } })
        return
      }

      router.sendJSON(res, 200, {
        profile: {
          username: profileResult.username,
          bio: profileResult.bio,
          image: profileResult.image,
          following: profileResult.following
        }
      })
    } catch (error) {
      console.error('Get profile error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * POST /api/profiles/:username/follow - Follow user
   */
  router.post('/api/profiles/:username/follow', async (req, res, params, body) => {
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

      // Get the user to follow
      const userResult = await concepts.User.getByUsername({ username: params.username })
      if ('error' in userResult) {
        router.sendJSON(res, 404, { errors: { body: ['User not found'] } })
        return
      }

      // Follow the user
      await concepts.Following.follow({ follower: verifyResult.user, followee: userResult.user })

      // Get updated profile
      const profileResult = await concepts.Profile.view({ viewer: verifyResult.user, username: params.username })

      if ('error' in profileResult) {
        router.sendJSON(res, 404, { errors: { body: ['Profile not found'] } })
        return
      }

      router.sendJSON(res, 200, {
        profile: {
          username: profileResult.username,
          bio: profileResult.bio,
          image: profileResult.image,
          following: profileResult.following
        }
      })
    } catch (error) {
      console.error('Follow user error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })

  /**
   * DELETE /api/profiles/:username/follow - Unfollow user
   */
  router.delete('/api/profiles/:username/follow', async (req, res, params, body) => {
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

      // Get the user to unfollow
      const userResult = await concepts.User.getByUsername({ username: params.username })
      if ('error' in userResult) {
        router.sendJSON(res, 404, { errors: { body: ['User not found'] } })
        return
      }

      // Unfollow the user
      await concepts.Following.unfollow({ follower: verifyResult.user, followee: userResult.user })

      // Get updated profile
      const profileResult = await concepts.Profile.view({ viewer: verifyResult.user, username: params.username })

      if ('error' in profileResult) {
        router.sendJSON(res, 404, { errors: { body: ['Profile not found'] } })
        return
      }

      router.sendJSON(res, 200, {
        profile: {
          username: profileResult.username,
          bio: profileResult.bio,
          image: profileResult.image,
          following: profileResult.following
        }
      })
    } catch (error) {
      console.error('Unfollow user error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })
}
