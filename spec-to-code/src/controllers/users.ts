/**
 * Users API Controller
 *
 * Handles user registration, login, and profile management.
 * Routes trigger Web/request events that are coordinated by synchronizations.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { eventBus } from '../lib/event-bus.js'
import { uuid } from '../lib/utils.js'
import type { Router } from '../lib/router.js'
import type { DB } from '../lib/db.js'
import { eq } from 'drizzle-orm'
import { users } from '../schemas/index.js'
import type { UserConcept } from '../concepts/User.js'
import type { JWTConcept } from '../concepts/JWT.js'

export interface Concepts {
  User: UserConcept
  JWT: JWTConcept
  [key: string]: any
}

export function setupUserRoutes(router: Router, db: DB, concepts: Concepts): void {
  /**
   * POST /api/users - Register new user
   */
  router.post('/api/users', async (req, res, params, body) => {
    const flowId = uuid()

    try {
      // Start flow
      eventBus.startFlow(flowId, { method: 'POST', path: '/api/users' })

      // Emit Web/request event
      eventBus.emitAction({
        flowId,
        concept: 'Web',
        action: 'request',
        args: {
          method: 'POST',
          path: '/api/users',
          body
        },
        result: { request: flowId },
        timestamp: new Date()
      })

      // Wait for synchronizations to complete
      await waitForCompletion(flowId, 500)

      // Check for JWT token generation (success case)
      const jwtEvent = eventBus.getFlowEvents(flowId).find(
        e => e.concept === 'JWT' && e.action === 'generate'
      )

      if (jwtEvent && jwtEvent.result.token) {
        const userId = jwtEvent.args.user

        // Query user data
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        })

        if (user) {
          router.sendJSON(res, 201, {
            user: {
              email: user.email,
              username: user.username,
              bio: user.bio,
              image: user.image,
              token: jwtEvent.result.token
            }
          })
          eventBus.endFlow(flowId)
          return
        }
      }

      // Check for validation errors
      const userEvent = eventBus.getFlowEvents(flowId).find(
        e => e.concept === 'User' && e.action === 'register'
      )

      if (userEvent && 'error' in userEvent.result) {
        router.sendJSON(res, 422, {
          errors: { body: [userEvent.result.error] }
        })
        eventBus.endFlow(flowId)
        return
      }

      const passwordEvent = eventBus.getFlowEvents(flowId).find(
        e => e.concept === 'Password' && e.action === 'validate'
      )

      if (passwordEvent && !passwordEvent.result.valid) {
        router.sendJSON(res, 422, {
          errors: { body: ['password must meet minimum requirements'] }
        })
        eventBus.endFlow(flowId)
        return
      }

      // Generic error
      router.sendJSON(res, 422, {
        errors: { body: ['Registration failed'] }
      })
      eventBus.endFlow(flowId)
    } catch (error) {
      console.error('Registration error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
      eventBus.endFlow(flowId)
    }
  })

  /**
   * POST /api/users/login - Authenticate user
   */
  router.post('/api/users/login', async (req, res, params, body) => {
    const flowId = uuid()

    try {
      eventBus.startFlow(flowId, { method: 'POST', path: '/api/users/login' })

      const email = body?.user?.email
      const password = body?.user?.password

      if (!email || !password) {
        router.sendJSON(res, 422, {
          errors: { body: ['email and password are required'] }
        })
        return
      }

      // Get user by email
      const userResult = await concepts.User.getByEmail({ email })
      if ('error' in userResult) {
        router.sendJSON(res, 422, {
          errors: { body: ['email or password is invalid'] }
        })
        return
      }

      // Check password
      const passwordResult = await concepts.Password.check({
        user: userResult.user,
        password
      })

      if ('error' in passwordResult || !passwordResult.valid) {
        router.sendJSON(res, 422, {
          errors: { body: ['email or password is invalid'] }
        })
        return
      }

      // Generate token
      const tokenResult = await concepts.JWT.generate({ user: userResult.user })

      // Get user data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userResult.user)
      })

      if (!user) {
        router.sendJSON(res, 422, {
          errors: { body: ['User not found'] }
        })
        return
      }

      router.sendJSON(res, 200, {
        user: {
          email: user.email,
          username: user.username,
          bio: user.bio,
          image: user.image,
          token: tokenResult.token
        }
      })
      eventBus.endFlow(flowId)
    } catch (error) {
      console.error('Login error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
      eventBus.endFlow(flowId)
    }
  })

  /**
   * GET /api/user - Get current user
   */
  router.get('/api/user', async (req, res, params, body) => {
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

    const user = await db.query.users.findFirst({
      where: eq(users.id, verifyResult.user)
    })

    if (!user) {
      router.sendJSON(res, 404, { errors: { body: ['User not found'] } })
      return
    }

    router.sendJSON(res, 200, {
      user: {
        email: user.email,
        username: user.username,
        bio: user.bio,
        image: user.image,
        token
      }
    })
  })

  /**
   * PUT /api/user - Update current user
   */
  router.put('/api/user', async (req, res, params, body) => {
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

    const updateData = body?.user || {}
    const updateResult = await concepts.User.update({
      user: verifyResult.user,
      email: updateData.email,
      bio: updateData.bio,
      image: updateData.image
    })

    if ('error' in updateResult) {
      router.sendJSON(res, 422, {
        errors: { body: [updateResult.error] }
      })
      return
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, verifyResult.user)
    })

    if (!user) {
      router.sendJSON(res, 404, { errors: { body: ['User not found'] } })
      return
    }

    router.sendJSON(res, 200, {
      user: {
        email: user.email,
        username: user.username,
        bio: user.bio,
        image: user.image,
        token
      }
    })
  })
}

/**
 * Wait for synchronizations to complete
 * In production, this would use proper event-driven async patterns
 */
function waitForCompletion(flowId: string, ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
