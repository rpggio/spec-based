# Concept-Driven Software Specification

## OVERVIEW

This specification format structures a program for maximum legibility: each user-facing behavior maps directly to either a Concept (state + actions) or a small Synchronization rule.

**Core mechanism:**
- **Concepts**: Independent services with well-defined user-facing purposes. Each concept manages its own state and exposes actions. Concepts never call or query each other.
- **Synchronizations**: Declarative event-based rules that mediate between concepts. When specified actions complete, synchronizations invoke other actions without creating dependencies between concepts.

**Key benefits:**
- **Legibility**: Direct correspondence between specifications and observed behavior
- **Modularity**: Concepts are fully decoupled; synchronizations make all cross-concept flows explicit
- **Incrementality**: New behaviors added by creating concepts or small synchronizations without modifying existing code
- **LLM-friendly**: Each concept generated independently; synchronizations generated from concept specifications only (no implementation code needed)

**Fundamental principle**: Behavioral features are expressed as granular, declarative synchronizations rather than implicit control flow in monolithic application code.

## SPECIFICATION FORMAT

### Concept Specification

```
concept <Name> [<TypeParams>]
purpose
    <single paragraph stating user-facing value>
state
    <relation declarations>
actions
    <action signatures with overloads>
operational principle
    <archetypal scenario>
```

**Mandatory rules:**
- Type parameters (e.g., `[U]`, `[U, P]`) for all external entity references
- Type parameters remain unconstrained (no constraints on U, P, etc.)
- Named arguments and named returns only
- Multiple overloads per action allowed
- Error cases as explicit overloads: `=> [ error: string ]`
- No references to other concept names in state or actions
- State relations must be declared (no hidden state)

**Example:**
```
concept Password [U]
purpose
    to securely store and validate user credentials
state
    password: U -> string       # Relation: maps user to hashed password
    salt: U -> string          # Relation: maps user to salt
actions
    set [ user: U ; password: string ] => [ user: U ]
        # Success case returns the user reference
    
    set [ user: U ; password: string ] => [ error: string ]
        # Error case returns error description
        # Triggers when password fails requirements
    
    check [ user: U ; password: string ] => [ valid: boolean ]
        # Returns true if password matches, false otherwise
    
    check [ user: U ; password: string ] => [ error: string ]
        # Error case when user doesn't exist
    
    validate [ password: string ] => [ valid: boolean ]
        # Checks password meets requirements without user context
operational principle
    after set [ user: x ; password: "secret" ] => [ user: x ]
    then check [ user: x ; password: "secret" ] => [ valid: true ]
    and check [ user: x ; password: "wrong" ] => [ valid: false ]
```

### Synchronization Specification

```
sync <UniqueName>
when {
    <Concept>/<action> : [ <pattern> ] => [ <pattern> ]
    ...
}
where {
    <bindings and queries>
}
then {
    <Concept>/<action> : [ <invocation> ]
    ...
}
```

**Mandatory rules:**
- Unique name per synchronization
- `when`: matches completed actions (presence of `=>` indicates completion)
- `where`: optional, for state queries and computed bindings
- `then`: invokes new actions
- Variables prefixed with `?` (e.g., `?user`, `?email`)
- Partial matching: specify only needed fields
- All actions in `when` must share same flow context

**Pattern matching:**
- `[]` matches any arguments (empty pattern)
- `[ field: ?var ]` binds field value to variable
- `[ field: literal ]` matches specific value
- `=> []` matches successful completion (any outputs)
- `=> [ error: ?e ]` matches error case specifically

## DESIGN RULES

### Concept Independence
- Concepts MUST NOT call other concepts' actions
- Concepts MUST NOT query other concepts' states
- Concepts MUST NOT reference other concept names in specifications
- Use type parameters for all external entity types
- External references via opaque identifiers (e.g., UUIDs)

### Synchronization Granularity
- One behavioral rule per synchronization
- Avoid combining unrelated behaviors in single sync
- Separate syncs for: auth, validation, cascade, notification, response assembly

### Action Ordering
- Validation actions BEFORE state-changing actions
- Use multiple syncs to enforce ordering via dependencies

**Example - Incorrect ordering:**
```
# BAD: User created before password validated
sync Registration
when { Web/request: [ method: "register" ; ... ] => [] }
then { User/register: [...] }  # Executes first

sync SetPassword  
when { User/register: [] => [ user: ?u ] }
then { Password/set: [ user: ?u ; ... ] }  # May fail after user exists
```

**Example - Correct ordering:**
```
# GOOD: Validate first, then create user
sync ValidatePassword
when { Web/request: [ method: "register" ; password: ?pw ] => [] }
then { Password/validate: [ password: ?pw ] }

sync Registration
when {
    Web/request: [ method: "register" ; username: ?u ; email: ?e ] => []
    Password/validate: [] => [ valid: true ]  # Guard: only if valid
}
where { bind ( uuid() as ?user ) }
then { User/register: [ user: ?user ; name: ?u ; email: ?e ] }
```

### Concept Factoring
- Factor by purpose, not by entity type
- One concept per user-facing purpose
- Avoid splitting related behaviors across concepts
- Keep concepts minimal to their stated purpose

**Example - Correct factoring:**
```
concept Favorite [I, U]
purpose
    to allow users to mark items as favorites
state
    favorites: I -> set U     # Items to users who favorited
    count: I -> int          # Favorite count per item
actions
    add [ item: I ; user: U ] => [ item: I ]
    remove [ item: I ; user: U ] => [ item: I ]
    # Encapsulates all favoriting logic in one place
```

## COMMON PATTERNS

### Bootstrap (Web Request Entry Point)
```
sync HandleRequest
when {
    Web/request: [
        method: "create_user" ;
        username: ?username ;
        email: ?email ]
    => [ request: ?request ]  # Binds request identifier for later response
}
where { bind ( uuid() as ?userId ) }
then {
    User/create: [ user: ?userId ; name: ?username ; email: ?email ]
}
```

### Error Handling
```
sync HandleRegistrationError
when {
    Web/request: [ method: "register" ]
    => [ request: ?request ]  # Need request ID for response
    User/register: []  # Empty pattern: matches any inputs
    => [ error: ?error ]  # Match on error output only
}
then {
    Web/respond: [
        request: ?request ;
        error: ?error ;
        code: 422 ]
}
```

### Authentication with Authorization
```
sync VerifyAuth
when {
    Web/request: [ method: "delete_post" ; token: ?token ] => []
}
then {
    JWT/verify: [ token: ?token ]  # Must complete before deletion
}

sync PerformAuthorizedDelete
when {
    Web/request: [ method: "delete_post" ; post: ?p ] => []
    JWT/verify: [] => [ user: ?authenticatedUser ]  # Requires successful auth
}
where {
    Post: { ?p author: ?author }  # Query: get post author from state
    FILTER ( ?author = ?authenticatedUser )  # Guard: verify ownership
}
then {
    Post/delete: [ post: ?p ]
}
```

### Cascade Actions
```
sync CascadeDeleteComments
when {
    Post/delete: [] => [ post: ?deletedPost ]
}
where {
    Comment: { ?comment target: ?deletedPost }  # Query: find all comments on post
    # May match multiple ?comment values, invoking then clause for each
}
then {
    Comment/delete: [ comment: ?comment ]  # Invoked once per matched comment
}
```

### Default Entity Creation
```
sync CreateDefaultProfile
when {
    User/register: [] => [ user: ?user ]
}
where {
    bind ( uuid() as ?profileId )  # Generate new identifier
}
then {
    Profile/create: [ profile: ?profileId ; user: ?user ]
}
```

### Multi-Concept Response Assembly
```
sync AssembleUserResponse
when {
    Web/request: [ method: "register" ] => [ request: ?req ]
    User/register: [] => [ user: ?u ]
    Profile/create: [] => [ profile: ?p ]
    Password/set: [] => [ user: ?u ]
    # All actions must be in same flow (same user request)
}
where {
    User: { ?u name: ?username ; email: ?email }
    Profile: { ?p bio: ?bio ; image: ?image }
    JWT: { ?u token: ?token }
    # Multiple concept states queried and joined
}
then {
    Web/respond: [
        request: ?req ;
        body: [
            username: ?username ;
            email: ?email ;
            bio: ?bio ;
            image: ?image ;
            token: ?token ] ]
}
```

## SPECIFICATION CONSTRAINTS

### Concept Level
- No calls to other concept actions
- No queries of other concept states  
- No concept name references except in type parameters
- All external types via type parameters only
- State fully declared (no hidden/implicit state)
- Actions return named fields only

### Synchronization Level
- Reads of actions only in `when` clause
- Reads of concept states only in `where` clause
- Writes (action invocations) only in `then` clause
- One behavioral rule per synchronization
- Unique synchronization names within application

### Naming Conventions
- Concept names: PascalCase (e.g., `Password`, `UserProfile`)
- Action names: camelCase (e.g., `register`, `checkPassword`)
- Sync names: PascalCase descriptive (e.g., `ValidateRegistrationPassword`)
- Variables: prefixed with `?` (e.g., `?user`, `?email`)
- Field names: camelCase (e.g., `user`, `email`, `error`)

## VALIDATION CHECKLIST

For each concept specification:
- [ ] Has type parameters for all external references
- [ ] Type parameters are unconstrained
- [ ] All actions use named arguments and returns
- [ ] Error cases as explicit overloads
- [ ] No references to other concept names
- [ ] State relations fully declared
- [ ] Purpose is user-facing (not implementation detail)

For each synchronization:
- [ ] Unique name
- [ ] One behavioral rule only
- [ ] Actions in `when` from same flow
- [ ] State queries in `where` only
- [ ] Action invocations in `then` only
- [ ] Variables bound before use
- [ ] Partial matching used (only needed fields)

For overall design:
- [ ] No concept-to-concept dependencies
- [ ] Validation before state changes
- [ ] Related behaviors factored into single concept
- [ ] Cross-concept composition via syncs only
- [ ] Each sync enables/disables one behavior independently