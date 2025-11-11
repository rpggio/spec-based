/**
 * Spec-to-Code: RealWorld Conduit API
 *
 * Implementation generated from concept specifications.
 * Uses Drizzle ORM with JSDoc annotations for provenance,
 * event-driven synchronizations, and direct TypeScript code.
 */

import { createServer } from 'http'
import { db } from './lib/db.js'
import { Router } from './lib/router.js'
import { eventBus } from './lib/event-bus.js'

// Import concept implementations
import { UserConcept } from './concepts/User.js'
import { PasswordConcept } from './concepts/Password.js'
import { JWTConcept } from './concepts/JWT.js'
import { ArticleConcept } from './concepts/Article.js'
import { CommentConcept } from './concepts/Comment.js'
import { FavoriteConcept } from './concepts/Favorite.js'
import { FollowingConcept } from './concepts/Following.js'
import { TagConcept } from './concepts/Tag.js'
import { ProfileConcept } from './concepts/Profile.js'

// Import synchronizations
import { setupUserRegistrationSyncs } from './syncs/user-registration.js'

// Import controllers
import { setupUserRoutes } from './controllers/users.js'

const PORT = process.env.PORT || 3000

/**
 * Initialize application
 */
async function main() {
  console.log('🚀 Initializing Spec-to-Code RealWorld API...')

  // Initialize concept instances
  const concepts = {
    User: new UserConcept(db),
    Password: new PasswordConcept(db),
    JWT: new JWTConcept(db),
    Article: new ArticleConcept(db),
    Comment: new CommentConcept(db),
    Favorite: new FavoriteConcept(db),
    Following: new FollowingConcept(db),
    Tag: new TagConcept(db),
    Profile: new ProfileConcept(db)
  }

  console.log('✅ Concepts initialized')

  // Setup synchronizations
  setupUserRegistrationSyncs(concepts)
  console.log('✅ Synchronizations registered')

  // Setup router
  const router = new Router()

  // Register routes
  setupUserRoutes(router, db, concepts)
  console.log('✅ Routes registered')

  // Create HTTP server
  const server = createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      })
      res.end()
      return
    }

    // Route request
    const handled = await router.handle(req, res)

    if (!handled) {
      router.sendJSON(res, 404, { error: 'Not found' })
    }
  })

  // Start server
  server.listen(PORT, () => {
    console.log(`\n🌐 Server running on http://localhost:${PORT}`)
    console.log(`\n📚 API Documentation:`)
    console.log(`   POST   /api/users          - Register new user`)
    console.log(`   POST   /api/users/login    - Authenticate user`)
    console.log(`   GET    /api/user           - Get current user`)
    console.log(`   PUT    /api/user           - Update current user`)
    console.log(`\n✨ Implementation Strategy:`)
    console.log(`   - TypeScript interfaces generated from concept specs`)
    console.log(`   - Drizzle schema with @concept annotations for provenance`)
    console.log(`   - Simple procedural code using Drizzle query builder`)
    console.log(`   - Event-driven synchronizations (no runtime rules engine)`)
    console.log(`   - Direct and inspectable implementation\n`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
}

// Run application
main().catch(error => {
  console.error('Failed to start application:', error)
  process.exit(1)
})
