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
import { setupArticleRoutes } from './controllers/articles.js'
import { setupCommentRoutes } from './controllers/comments.js'
import { setupProfileRoutes } from './controllers/profiles.js'
import { setupTagRoutes } from './controllers/tags.js'

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
  setupArticleRoutes(router, db, concepts)
  setupCommentRoutes(router, db, concepts)
  setupProfileRoutes(router, db, concepts)
  setupTagRoutes(router, db, concepts)
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
    console.log(`\n   Authentication:`)
    console.log(`   POST   /api/users                        - Register new user`)
    console.log(`   POST   /api/users/login                  - Authenticate user`)
    console.log(`   GET    /api/user                         - Get current user`)
    console.log(`   PUT    /api/user                         - Update current user`)
    console.log(`\n   Profiles:`)
    console.log(`   GET    /api/profiles/:username           - Get user profile`)
    console.log(`   POST   /api/profiles/:username/follow    - Follow user`)
    console.log(`   DELETE /api/profiles/:username/follow    - Unfollow user`)
    console.log(`\n   Articles:`)
    console.log(`   GET    /api/articles                     - List articles`)
    console.log(`   GET    /api/articles/feed                - Get personalized feed`)
    console.log(`   GET    /api/articles/:slug               - Get single article`)
    console.log(`   POST   /api/articles                     - Create article`)
    console.log(`   PUT    /api/articles/:slug               - Update article`)
    console.log(`   DELETE /api/articles/:slug               - Delete article`)
    console.log(`\n   Favorites:`)
    console.log(`   POST   /api/articles/:slug/favorite      - Favorite article`)
    console.log(`   DELETE /api/articles/:slug/favorite      - Unfavorite article`)
    console.log(`\n   Comments:`)
    console.log(`   GET    /api/articles/:slug/comments      - Get comments`)
    console.log(`   POST   /api/articles/:slug/comments      - Add comment`)
    console.log(`   DELETE /api/articles/:slug/comments/:id  - Delete comment`)
    console.log(`\n   Tags:`)
    console.log(`   GET    /api/tags                         - Get all tags`)
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
