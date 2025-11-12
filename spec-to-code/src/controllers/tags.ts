/**
 * Tags API Controller
 *
 * Handles tag listing.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import type { Router } from '../lib/router.js'
import type { DB } from '../lib/db.js'

export interface Concepts {
  Tag: any
  [key: string]: any
}

export function setupTagRoutes(router: Router, db: DB, concepts: Concepts): void {
  /**
   * GET /api/tags - Get all tags
   */
  router.get('/api/tags', async (req, res, params, body) => {
    try {
      const result = await concepts.Tag.list()

      router.sendJSON(res, 200, {
        tags: result.tags
      })
    } catch (error) {
      console.error('List tags error:', error)
      router.sendJSON(res, 500, { errors: { body: ['Internal server error'] } })
    }
  })
}
