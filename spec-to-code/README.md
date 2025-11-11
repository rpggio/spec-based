# Spec-to-Code: RealWorld Conduit API

A self-contained RealWorld backend implementation using concept specifications as source for code generation and static validation.

## Implementation Strategy

This implementation follows a distinct architectural approach:

### Design Philosophy

**Concept specifications define logical behavior exclusively** in the established DSL, remaining independent of implementation concerns. A separate **Drizzle TypeScript schema layer** maps logical concepts to physical storage using **JSDoc annotations** (`@concept`, `@state`, `@type_binding`) to maintain provenance. **Generated TypeScript interfaces** enforce structural correctness at compile-time, while **simple procedural code** implements the actual behavior.

This separation ensures:
- ✅ **Specs remain the authoritative source** of behavioral truth
- ✅ **Database schemas handle storage concerns** through proven tooling (migrations, type generation, query builders)
- ✅ **Implementation code stays direct and inspectable** rather than framework-heavy or interpreted

### Implementation Mechanics

1. **From concept specs → TypeScript interfaces** defining action signatures and overloaded return types
2. **Concepts implemented as simple classes** using Drizzle's type-safe query builder against annotated schema
3. **Synchronizations compiled into direct event-driven TypeScript functions**:
   - Each sync becomes a function that pattern-matches on completed action events
   - Checks concept, action name, and result shape
   - Extracts variable bindings
   - Optionally queries concept state using Drizzle queries for `where` clauses
   - Directly invokes subsequent concept actions
   - Propagates flow tokens for provenance tracking
4. **Event bus coordinates execution** without requiring a runtime rules engine—syncs are just functions registered as listeners
5. **Bidirectional validation** ensures implementations conform to interfaces (TypeScript compiler) and behavioral semantics align with specs

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Concept Specifications                    │
│              (specs/conduit-realworld/*.txt)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────────┐
        │    Generated TypeScript Interfaces        │
        │     (src/generated/concept-interfaces.ts) │
        └──────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ Drizzle Schema   │            │ Concept Classes  │
    │ with JSDoc       │◄───────────│ (implements      │
    │ Annotations      │            │  interfaces)     │
    └──────────────────┘            └──────────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ SQLite Database  │            │ Event-Driven     │
    │ (migrations)     │            │ Synchronizations │
    └──────────────────┘            └──────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ HTTP Controllers │
                                    │ & Router         │
                                    └──────────────────┘
```

## Project Structure

```
spec-to-code/
├── src/
│   ├── concepts/              # Concept implementations (simple classes)
│   │   ├── User.ts           # @concept User - Account management
│   │   ├── Password.ts       # @concept Password - Credential storage
│   │   ├── JWT.ts            # @concept JWT - Authentication tokens
│   │   ├── Article.ts        # @concept Article - Blog articles
│   │   ├── Comment.ts        # @concept Comment - Article comments
│   │   ├── Favorite.ts       # @concept Favorite - Article favoriting
│   │   ├── Following.ts      # @concept Following - User following
│   │   ├── Tag.ts            # @concept Tag - Article tags
│   │   └── Profile.ts        # @concept Profile - User profiles
│   │
│   ├── schemas/              # Drizzle schema with provenance
│   │   └── index.ts         # @concept, @state, @type_binding annotations
│   │
│   ├── generated/            # Code generated from specs
│   │   └── concept-interfaces.ts  # TypeScript interfaces from concepts
│   │
│   ├── syncs/                # Event-driven synchronization functions
│   │   └── user-registration.ts   # Compiled from sync specs
│   │
│   ├── controllers/          # HTTP request handlers
│   │   └── users.ts         # User registration, login, profile
│   │
│   ├── lib/                  # Core infrastructure
│   │   ├── db.ts            # Drizzle database connection
│   │   ├── event-bus.ts     # Event coordination system
│   │   ├── router.ts        # Simple HTTP router
│   │   ├── migrate.ts       # Database migration script
│   │   └── utils.ts         # Utility functions
│   │
│   └── index.ts             # Application entry point
│
├── database/
│   ├── migrations/          # Drizzle migrations
│   └── conduit.db          # SQLite database
│
├── drizzle.config.ts       # Drizzle configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## Key Differences from Existing Implementation

This implementation (`spec-to-code`) differs significantly from the existing `realworld-backend-adonis`:

| Aspect | realworld-backend-adonis | spec-to-code (this) |
|--------|--------------------------|---------------------|
| **Framework** | legiblesync runtime | Direct TypeScript code |
| **Storage** | In-memory (Maps/Sets) | SQLite via Drizzle ORM |
| **Migrations** | None | Drizzle migrations |
| **Type Safety** | Runtime | Compile-time + Runtime |
| **Provenance** | Implicit | Explicit JSDoc annotations |
| **Synchronizations** | Runtime interpreter | Compiled event functions |
| **Query Pattern** | Map lookups | SQL via Drizzle query builder |
| **Code Generation** | None | Interfaces from specs |

## Installation

```bash
npm install
```

## Database Setup

```bash
# Generate and run migrations
npm run migrate

# Or manually:
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations

# Optional: Explore database with Drizzle Studio
npm run db:studio
```

## Running

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Authentication & Users
- `POST /api/users` - Register new user (201)
- `POST /api/users/login` - Authenticate user (200)
- `GET /api/user` - Get current user (200, requires auth)
- `PUT /api/user` - Update current user (200, requires auth)

### Profiles & Following (Coming Soon)
- `GET /api/profiles/:username` - Get user profile
- `POST /api/profiles/:username/follow` - Follow user
- `DELETE /api/profiles/:username/follow` - Unfollow user

### Articles (Coming Soon)
- `POST /api/articles` - Create article
- `GET /api/articles` - List articles with filters
- `GET /api/articles/feed` - Get personalized feed
- `GET /api/articles/:slug` - Get single article
- `PUT /api/articles/:slug` - Update article
- `DELETE /api/articles/:slug` - Delete article

### Other Endpoints (Coming Soon)
- Favorites, Comments, Tags

## Implementation Examples

### 1. Concept with Interface

**Spec** (`specs/conduit-realworld/concepts/User.txt`):
```
concept User [U]
actions
    register [ user: U ; email: string ; username: string ] => [ user: U ]
    register [ user: U ; email: string ; username: string ] => [ error: string ]
```

**Generated Interface** (`src/generated/concept-interfaces.ts`):
```typescript
export interface IUser {
  register(args: {
    user: string
    email: string
    username: string
  }): Promise<{ user: string } | { error: string }>
}
```

**Implementation** (`src/concepts/User.ts`):
```typescript
export class UserConcept implements IUser {
  constructor(private db: DB) {}

  async register(args: {
    user: string
    email: string
    username: string
  }): Promise<{ user: string } | { error: string }> {
    // Direct Drizzle query builder usage
    await this.db.insert(users).values({
      id: args.user,
      email: args.email,
      username: args.username
    })
    return { user: args.user }
  }
}
```

### 2. Schema with Provenance

**Schema** (`src/schemas/index.ts`):
```typescript
/**
 * @concept User
 * @state users: set U
 * @state email: U -> string
 * @state username: U -> string
 * @type_binding U = string (UUID)
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // U
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  // ...
})
```

### 3. Event-Driven Synchronization

**Spec** (`specs/conduit-realworld/synchronizations/user-registration.txt`):
```
sync RegisterUser
when {
    Web/request: [ method: "POST" ; path: "/api/users" ] => []
    Password/validate: [] => [ valid: true ]
}
then {
    User/register: [ user: ?userId ; email: ?email ; username: ?username ]
}
```

**Compiled Function** (`src/syncs/user-registration.ts`):
```typescript
export function setupRegisterUser(concepts: Concepts): void {
  eventBus.on('Password/validate', async (event: ActionEvent) => {
    if (!event.result.valid) return

    const { matched } = eventBus.checkFlowConditions(event.flowId, [
      { concept: 'Web', action: 'request', args: { method: 'POST', path: '/api/users' } },
      { concept: 'Password', action: 'validate', result: { valid: true } }
    ])

    if (!matched) return

    // Extract bindings and invoke User/register
    const result = await concepts.User.register({ user: userId, email, username })

    // Emit event for next sync
    eventBus.emitAction({ flowId, concept: 'User', action: 'register', result, ... })
  })
}
```

## Testing

```bash
# Run the official RealWorld API tests (when fully implemented)
# Requires backend server running on http://localhost:3000
cd ../realworld-tests/api
APIURL=http://localhost:3000/api ./run-api-tests.sh
```

## Validation Tools

The implementation includes bidirectional validation:

1. **Compile-time validation**: TypeScript compiler ensures implementations match generated interfaces
2. **Runtime validation**: Event bus verifies action signatures and flow semantics
3. **Schema validation**: Drizzle enforces database constraints matching concept state declarations

```bash
# Run validation tool (to be implemented)
npm run validate
```

## Technology Stack

- **TypeScript** - Type-safe implementation language
- **Drizzle ORM** - Type-safe SQL query builder with migrations
- **better-sqlite3** - Embedded SQL database
- **Node.js HTTP** - Built-in HTTP server (simple, inspectable)
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication

## Design Principles

### 1. Specs as Source of Truth
All behavior is defined in concept specifications. Code generation and validation ensure implementations stay aligned with specs.

### 2. Provenance Through Annotations
JSDoc annotations (`@concept`, `@state`, `@type_binding`) maintain traceability from schema to spec.

### 3. Direct and Inspectable Code
No magic, no runtime interpretation. Every sync is a function you can read and debug.

### 4. Type Safety Throughout
- Compile-time: TypeScript interfaces from specs
- Query-time: Drizzle type-safe queries
- Runtime: Event pattern matching with type guards

### 5. Separation of Concerns
- **Specs**: Define WHAT (behavior)
- **Schema**: Define WHERE (storage)
- **Concepts**: Define HOW (implementation)
- **Syncs**: Define WHEN (coordination)

## Development Roadmap

- [x] Project structure and dependencies
- [x] TypeScript interface generation from specs
- [x] Drizzle schema with JSDoc annotations
- [x] Core concept implementations (User, Password, JWT)
- [x] Event bus for synchronization coordination
- [x] User registration synchronization
- [x] HTTP server and routing
- [x] User authentication endpoints
- [ ] Article management synchronizations
- [ ] Comment and favorite synchronizations
- [ ] Profile and following synchronizations
- [ ] Tag management synchronizations
- [ ] Bidirectional validation tooling
- [ ] Code generator automation
- [ ] Comprehensive test suite
- [ ] Performance benchmarks

## License

MIT

## Related Projects

- [RealWorld API Spec](https://github.com/gothinkster/realworld/tree/main/api)
- [Concept-Based Specifications](../specs/conduit-realworld/)
- [Alternative Implementation](../realworld-backend-adonis/) - Using legiblesync framework

---

**Note**: This is a demonstration implementation showcasing the spec-to-code strategy. It currently implements user registration and authentication endpoints. Additional endpoints will be added following the same patterns.
