# RealWorld Conduit API - Speclog Specifications

This directory contains specifications for the RealWorld Conduit blogging platform API using the **Speclog** language - a pure Datalog-based specification language for concept-driven software.

## Overview

The RealWorld Conduit API is a medium-complexity "real world" example application that demonstrates a blogging platform with social features. It includes user authentication, article management, comments, favoriting, following, and tagging.

This specification is a translation of the conduit-realworld specs (found in `../conduit-realworld/`) into the Speclog language format defined in `/docs/speclog.md`.

## Specification Language: Speclog

**Speclog** structures software as independent **Concepts** orchestrated by **Synchronizations** using pure Datalog semantics:

- **Concepts**: Self-contained services with state (Datalog predicates) and actions
- **Synchronizations**: Declarative event-based rules using pure Datalog queries
- **Actions**: Units of behavior tracked as Datalog facts for provenance and auditing
- **Flows**: Causal chains of actions originating from external requests

### Key Differences from Original Format

1. **State as Predicates**: Instead of arrow notation (`email: U -> string`), uses Datalog predicates (`user_email(user: U, email: string)`)
2. **Synchronizations as Datalog Rules**: Action coordination expressed using `when/where/then` with pure Datalog syntax
3. **Action Tracking**: All actions represented as facts (`action_invoked`, `action_completed`, `action_input`, `action_output`)
4. **Flow Tracking**: Explicit flow constraints ensure actions in the same causal chain are coordinated

## Specification Structure

### Concepts (`concepts/`)

The application is decomposed into 10 independent concepts:

1. **User.speclog** - User account management with unique identities
2. **Password.speclog** - Secure credential storage and validation
3. **JWT.speclog** - Authentication token generation and verification
4. **Profile.speclog** - Public user profile views with social context
5. **Following.speclog** - User-to-user following relationships
6. **Article.speclog** - Blog article CRUD with slug-based identification
7. **Tag.speclog** - Article categorization with tags
8. **Comment.speclog** - Article commenting system
9. **Favorite.speclog** - Article favoriting and count tracking
10. **Web.speclog** - HTTP request/response handling

Each concept includes:
- **Purpose**: User-facing value proposition
- **State**: Datalog predicates with integrity constraints
- **Actions**: Named input/output signatures with error overloads
- **Operational Principle**: Archetypal usage scenario

### Synchronizations (`synchronizations/`)

Synchronizations coordinate between concepts to implement application features:

1. **user-registration.speclog** - User registration flow with password validation (9 syncs)
2. **user-login.speclog** - User authentication and token generation (6 syncs)
3. **user-update.speclog** - User profile updates with authentication (6 syncs)
4. **profiles.speclog** - Profile viewing, following, and unfollowing (11 syncs)
5. **article-create.speclog** - Article creation with tags (6 syncs)
6. **article-get.speclog** - Single article retrieval with context-aware data (5 syncs)
7. **article-update.speclog** - Article updates with ownership verification (8 syncs)
8. **article-delete.speclog** - Article deletion with cascading deletes (7 syncs)
9. **article-list.speclog** - Article listing with filtering and pagination (7 syncs)
10. **article-feed.speclog** - Personalized article feed from followed users (5 syncs)
11. **comments.speclog** - Comment creation, listing, and deletion (15 syncs)
12. **favorites.speclog** - Article favoriting and unfavoriting (10 syncs)
13. **tags.speclog** - Tag listing (2 syncs)

Each synchronization follows the pattern:
```datalog
sync UniqueName
when {
    % Match completed actions via Datalog patterns
    action_completed(?action),
    action_invoked(?action, "Concept", "action", ?flow, _),
    action_input(?action, "param", value),
    action_output(?action, "result", ?var)
}
where {
    % Pure Datalog query over concept states
    user_email(?user, ?email),
    uuid_generate(?newId),
    ?count > 0
}
then {
    % Invoke new actions
    invoke_action("Concept", "action", [param: value])
}
```

## Key Features Implemented

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
- Concepts never reference each other directly (no imports, no calls, no queries)
- All cross-concept coordination via synchronizations
- Type parameters for all external references
- State fully declared as Datalog predicates

### Synchronization Semantics
- One behavioral rule per synchronization
- Action reads only in `when` clause
- State reads only in `where` clause
- Action writes only in `then` clause
- All actions in a sync share the same flow

### Execution Model
1. External action arrives (e.g., Web/request)
2. Engine asserts action_invoked facts
3. Concept processes action, asserts action_completed facts
4. Engine evaluates all syncs via semi-naive bottom-up Datalog
5. Matching syncs produce new action_invoked facts
6. Repeat until fixpoint (no new facts derived)
7. Provenance tracked via sync_triggered facts

## Speclog Language Guarantees

- **Modularity**: New features added via new concepts or synchronizations
- **Auditability**: Complete action provenance tracked as Datalog facts
- **Determinism**: Semi-naive evaluation with stratified negation
- **Declarative**: What the system does, not how it does it
- **LLM-Friendly**: Single consistent query language for AI code generation

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

## Implementation Notes

These specifications describe the behavioral contract of the API without prescribing implementation details. An implementation could use:
- Any database (SQL, NoSQL, in-memory)
- Any authentication library
- Any web framework
- Any programming language

The Speclog language enables:
- LLM-based code generation from pure Datalog specs
- Multiple independent implementations
- Formal verification and testing
- Clear documentation of expected behavior

## Source

Based on:
- **Original Specs**: [Conduit RealWorld Specs](../conduit-realworld/)
- **Implementation**: [AdonisJS TDD TypeScript Example App](https://github.com/giuliana-bezerra/adonisjs-tdd-typescript-example-app)
- **API Specification**: [RealWorld API Spec](https://github.com/gothinkster/realworld/tree/main/api)
- **Language**: Speclog (see `/docs/speclog.md`)
