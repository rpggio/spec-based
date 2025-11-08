# RealWorld Conduit API - Concept-Based Specifications

This directory contains concept-based specifications for the RealWorld Conduit blogging platform API, generated from the [AdonisJS TDD TypeScript example app](https://github.com/giuliana-bezerra/adonisjs-tdd-typescript-example-app).

## Overview

The RealWorld Conduit API is a medium-complexity "real world" example application that demonstrates a blogging platform with social features. It includes user authentication, article management, comments, favoriting, following, and tagging.

## Specification Structure

### Concepts (`concepts/`)

The application is decomposed into 10 independent concepts:

1. **User** - User account management with unique identities
2. **Password** - Secure credential storage and validation
3. **JWT** - Authentication token generation and verification
4. **Profile** - Public user profile views with social context
5. **Following** - User-to-user following relationships
6. **Article** - Blog article CRUD with slug-based identification
7. **Tag** - Article categorization with tags
8. **Comment** - Article commenting system
9. **Favorite** - Article favoriting and count tracking
10. **Web** - HTTP request/response handling

Each concept is fully independent with:
- Type parameters for external entity references
- Named arguments and returns
- Explicit error handling as overloads
- Complete state declarations
- Operational principles

### Synchronizations (`synchronizations/`)

Synchronizations coordinate between concepts to implement application features:

1. **user-registration.txt** - User registration flow with password validation
2. **user-login.txt** - User authentication and token generation
3. **user-update.txt** - User profile updates with authentication
4. **profiles.txt** - Profile viewing, following, and unfollowing
5. **article-create.txt** - Article creation with tags
6. **article-get.txt** - Single article retrieval with context-aware data
7. **article-update.txt** - Article updates with ownership verification
8. **article-delete.txt** - Article deletion with cascading deletes
9. **article-list.txt** - Article listing with filtering and pagination
10. **article-feed.txt** - Personalized article feed from followed users
11. **comments.txt** - Comment creation, listing, and deletion
12. **favorites.txt** - Article favoriting and unfavoriting
13. **tags.txt** - Tag listing

## API Endpoints Covered

### Authentication & Users
- `POST /api/users` - Register new user (201)
- `POST /api/users/login` - Authenticate user (200)
- `PUT /api/user` - Update current user (200, requires auth)

### Profiles & Following
- `GET /api/profiles/:username` - Get user profile (200)
- `POST /api/profiles/:username/follow` - Follow user (200, requires auth)
- `DELETE /api/profiles/:username/follow` - Unfollow user (200, requires auth)

### Articles
- `POST /api/articles` - Create article (201, requires auth)
- `GET /api/articles` - List articles with filters (200)
- `GET /api/articles/:slug` - Get single article (200)
- `PUT /api/articles/:slug` - Update article (200, requires auth + ownership)
- `DELETE /api/articles/:slug` - Delete article (204, requires auth + ownership)
- `GET /api/articles/feed` - Get personalized feed (200, requires auth)

### Favorites
- `POST /api/articles/:slug/favorite` - Favorite article (200, requires auth)
- `DELETE /api/articles/:slug/favorite` - Unfavorite article (200, requires auth)

### Comments
- `POST /api/articles/:slug/comments` - Add comment (201, requires auth)
- `GET /api/articles/:slug/comments` - List comments (200)
- `DELETE /api/articles/:slug/comments/:id` - Delete comment (204, requires auth + ownership)

### Tags
- `GET /api/tags` - List all tags (200)

## Key Features

### Authentication & Authorization
- JWT-based bearer token authentication
- Three authorization levels:
  - **Public**: No authentication required
  - **Authenticated**: Valid token required
  - **Ownership**: Authenticated + resource ownership verification
- Context-aware responses (authenticated users see personalized `following` and `favorited` flags)

### Data Models & Relationships
- **User** → Articles, Comments, Favorites, Following
- **Article** → Tags, Comments, Favorites, Author
- **Comment** → Article, Author
- **Tag** → Articles

### Validation & Error Handling
- Field validation (email format, min lengths, required fields)
- HTTP status codes: 200, 201, 204, 400, 403, 404, 422
- Structured error responses with field-level details

### Advanced Features
- Article slug generation from titles
- Cascade deletion (deleting article deletes comments and favorites)
- Pagination support (limit/offset)
- Multi-criteria filtering (by tag, author, favorited user)
- Personalized feed based on followed users
- Favorite count tracking

## Design Principles

### Concept Independence
- Concepts never call or query other concepts directly
- All cross-concept coordination via synchronizations
- Type parameters for all external references
- No hidden state or implicit dependencies

### Synchronization Granularity
- One behavioral rule per synchronization
- Separate syncs for: auth, validation, business logic, response assembly
- Validation before state-changing actions
- Explicit error handling flows

### Modularity
- New features added via new concepts or synchronizations
- Existing code never modified when adding features
- Each sync can be enabled/disabled independently
- Clear separation of concerns

## Test Coverage

The specifications are validated against comprehensive test scenarios including:
- User registration and login flows
- Profile viewing and social features
- Article CRUD operations with ownership checks
- Comment management
- Favorite tracking and counts
- Tag management
- Feed personalization
- Error cases and validation failures
- Authentication and authorization
- Cascade deletions

## Implementation Notes

These specifications describe the behavioral contract of the API without prescribing implementation details. An implementation could use:
- Any database (SQL, NoSQL, in-memory)
- Any authentication library
- Any web framework
- Any programming language

The specifications focus on WHAT the system does, not HOW it does it, enabling:
- LLM-based code generation
- Multiple independent implementations
- Easy testing and verification
- Clear documentation of expected behavior

## Source

Based on:
- **Implementation**: [AdonisJS TDD TypeScript Example App](https://github.com/giuliana-bezerra/adonisjs-tdd-typescript-example-app)
- **API Specification**: [RealWorld API Spec](https://github.com/gothinkster/realworld/tree/main/api)
- **DSL**: Concept-Driven Software Specification (see `/docs/concept-based-specs.md`)
