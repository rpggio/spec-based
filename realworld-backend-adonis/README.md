# RealWorld Conduit API - Concept-Based Implementation

A complete RealWorld backend implementation using legiblesync and concept-based specifications.

## Test Results

**309 of 311 assertions passing (99.4%)**
- ✅ 32/32 HTTP requests successful
- ✅ All core functionality working
- ⚠️ Only 2 minor failures related to tag ordering

## Features

### Concepts Implemented
1. **User** - Account management with unique identities
2. **Password** - Secure credential storage with bcrypt hashing
3. **JWT** - Authentication token generation and verification
4. **Article** - Blog article CRUD with slug-based identification
5. **Comment** - Article commenting system
6. **Favorite** - Article favoriting and count tracking
7. **Following** - User-to-user following relationships
8. **Tag** - Article categorization
9. **Profile** - Public user profile views
10. **Web** - HTTP request/response handling

### API Endpoints

#### Authentication & Users
- `POST /api/users` - Register new user
- `POST /api/users/login` - Authenticate user
- `GET /api/user` - Get current user
- `PUT /api/user` - Update current user

#### Profiles & Following
- `GET /api/profiles/:username` - Get user profile
- `POST /api/profiles/:username/follow` - Follow user
- `DELETE /api/profiles/:username/follow` - Unfollow user

#### Articles
- `POST /api/articles` - Create article
- `GET /api/articles` - List articles (with filters)
- `GET /api/articles/feed` - Get personalized feed
- `GET /api/articles/:slug` - Get single article
- `PUT /api/articles/:slug` - Update article
- `DELETE /api/articles/:slug` - Delete article

#### Favorites
- `POST /api/articles/:slug/favorite` - Favorite article
- `DELETE /api/articles/:slug/favorite` - Unfavorite article

#### Comments
- `POST /api/articles/:slug/comments` - Add comment
- `GET /api/articles/:slug/comments` - List comments
- `DELETE /api/articles/:slug/comments/:id` - Delete comment

#### Tags
- `GET /api/tags` - List all tags

## Installation

```bash
npm install
```

## Running

```bash
# Development mode
npm run dev

# Build
npm run build

# Production
npm start
```

Server runs on http://localhost:3000

## Testing

To run the official RealWorld API tests:

```bash
cd ../realworld-tests/api
APIURL=http://localhost:3000/api ./run-api-tests.sh
```

## Architecture

This implementation follows the concept-based specification design:

- **Fully decoupled concepts** - No concept calls or queries another
- **Type parameters** - All external references use generic type parameters
- **Explicit state** - All state is declared using Maps and Sets
- **Named arguments and returns** - Clear action signatures
- **Error handling as overloads** - Explicit error cases

The Express server orchestrates concept invocations based on HTTP requests, demonstrating how concepts can be composed without violating independence.

## Technology Stack

- TypeScript
- Express.js
- legiblesync (concept-based architecture framework)
- bcrypt (password hashing)
- jsonwebtoken (JWT authentication)
- In-memory state storage (Maps and Sets)

## Project Structure

```
src/
├── concepts/          # Independent concept implementations
│   ├── User.ts
│   ├── Password.ts
│   ├── JWT.ts
│   ├── Article.ts
│   ├── Comment.ts
│   ├── Favorite.ts
│   ├── Following.ts
│   ├── Tag.ts
│   ├── Profile.ts
│   └── Web.ts
├── engine/            # LegibleSync engine core
│   ├── Engine.ts
│   └── types.ts
├── syncs/             # Synchronization rules
│   ├── user-registration.sync.ts
│   ├── user-login.sync.ts
│   └── article-create.sync.ts
├── utils/             # Utility functions
│   ├── helpers.ts
│   └── slug.ts
└── server.ts          # Express server and API routes
```

## License

MIT
