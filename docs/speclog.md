# Speclog Specification Language
## A Concept-Based Software Specification with Datalog

### OVERVIEW

**Speclog** structures software as independent **Concepts** orchestrated by **Synchronizations**. This enables modular, legible, and incrementally buildable systems.

**Core Elements:**
- **Concepts**: Self-contained services with state (Datalog predicates) and actions
- **Synchronizations**: Declarative event-based rules using pure Datalog queries
- **Actions**: Units of behavior with invocations and completions
- **Flows**: Causal chains of actions originating from external requests

**Key Principles:**
1. Concepts never reference each other (no imports, no calls, no queries)
2. All inter-concept coordination via synchronizations
3. Synchronizations read action completions (`when`), query state (`where`), invoke actions (`then`)
4. Every action tracked as Datalog facts for provenance and auditing

---

## CONCEPT SPECIFICATION

### Format

```
concept <Name> [<TypeParams>]
purpose
    <one paragraph: user-facing value>
state
    <predicate declarations with types>
    <integrity constraints>
actions
    <action_name> [ <inputs> ] => [ <outputs> ]
    <action_name> [ <inputs> ] => [ error: string ]
operational principle
    <archetypal usage scenario>
```

### State as Datalog Predicates

```
concept User [U]
purpose
    to identify users by username and email
state
    user_exists(user: U)
    user_name(user: U, name: string)
    user_email(user: U, email: string)
    
    % Constraints (integrity rules - these are violations)
    :- user_name(U, N1), user_name(U, N2), N1 != N2.
    :- user_email(U, E1), user_email(U, E2), E1 != E2.
    
    % Derived predicates (computed)
    user_by_name(Name, User) :- user_name(User, Name).
    has_email(User) :- user_email(User, _).
actions
    register [ user: U ; name: string ; email: string ] => [ user: U ]
    register [ user: U ; name: string ; email: string ] => [ error: string ]
    update [ user: U ; name: string ] => [ user: U ]
    update [ user: U ; name: string ] => [ error: string ]
operational principle
    after register [ user: u ; name: "alice" ; email: "a@b.com" ] => [ user: u ]
    then user_name(u, "alice") and user_email(u, "a@b.com")
```

**Rules:**
- Type parameters (e.g., `[U]`) for all external entity types
- Predicates lowercase with underscores: `user_name`, `has_password`
- Arguments typed: `user: U`, `count: int`, `active: bool`
- Integrity constraints with `:-` (violated if body is true)
- Action names camelCase: `register`, `checkPassword`
- Multiple overloads per action (success vs error cases)
- Named arguments and returns only

---

## SYNCHRONIZATION SPECIFICATION

### Format

```
sync <UniqueName>
when {
    <Datalog patterns matching completed actions>
}
where {
    <Pure Datalog query over concept states and built-ins>
}
then {
    <action invocations>
}
```

### Action Representation as Facts

**Base facts the engine maintains:**
```datalog
% Action lifecycle
action_invoked(action_id, concept, action_name, flow_id, timestamp)
action_input(action_id, param_name, value)
action_completed(action_id)
action_output(action_id, param_name, value)
action_error(action_id, error_message)

% Flow tracking
in_flow(action_id, flow_id)

% Synchronization provenance
sync_triggered(sync_id, sync_name, trigger_action_id, invoked_action_id)
```

### Basic Synchronization

```datalog
sync Registration
when {
    % Match completed Web request
    action_completed(?req),
    action_invoked(?req, "Web", "request", ?flow, _),
    action_input(?req, "method", "register"),
    action_input(?req, "username", ?username),
    action_input(?req, "email", ?email)
}
where {
    % Generate UUID (built-in)
    uuid_generate(?user),
    
    % Check availability (standard negation)
    not user_name(_, ?username),
    not user_email(_, ?email)
}
then {
    invoke_action("User", "register", 
        [user: ?user, name: ?username, email: ?email])
}
```

### Pattern Matching Rules

**When clause patterns:**
- `action_completed(?var)` - binds action ID to variable
- `action_invoked(?var, "Concept", "action", ?flow, _)` - match by concept/action
- `action_input(?var, "param", ?value)` - bind input parameter
- `action_output(?var, "param", ?value)` - bind output (success)
- `action_error(?var, ?msg)` - match error case
- Underscore `_` matches any value (ignored)
- All actions in `when` must share same `?flow`

**Partial matching:**
```datalog
sync NewPassword
when {
    % Match on specific inputs only
    action_completed(?req),
    action_input(?req, "method", "register"),
    action_input(?req, "password", ?password),
    % Other req inputs ignored
    
    action_completed(?userReg),
    action_output(?userReg, "user", ?user),
    % userReg inputs ignored
    
    % Flow constraint (must be same flow)
    in_flow(?req, ?flow),
    in_flow(?userReg, ?flow)
}
then {
    invoke_action("Password", "set", [user: ?user, password: ?password])
}
```

### Error Handling

```datalog
sync RegistrationError
when {
    action_completed(?req),
    action_input(?req, "method", "register"),
    action_output(?req, "request", ?requestId),
    
    action_completed(?userReg),
    action_error(?userReg, ?error),
    
    % Same flow
    in_flow(?req, ?flow),
    in_flow(?userReg, ?flow)
}
then {
    invoke_action("Web", "respond", 
        [request: ?requestId, error: ?error, code: 422])
}
```

---

## ENGINE-PROVIDED BUILT-INS

The synchronization engine provides these built-in predicates for use in `where` clauses:

### Identity & Generation
```datalog
uuid_generate(?id)              % Generate new UUID, bind to ?id
timestamp_now(?ts)              % Current Unix timestamp
hash_string(?input, ?output)    % Hash a string value
```

### Aggregation
```datalog
% Count rows matching pattern
count_rows(pattern, ?count) :- 
    % Pattern is a regular Datalog rule body
    % ?count is bound to the number of solutions

% Example usage:
count_rows((favorited(?item, ?user)), ?count)
```

### Arithmetic
```datalog
?result = ?a + ?b               % Addition
?result = ?a - ?b               % Subtraction
?result = ?a * ?b               % Multiplication
?result = ?a / ?b               % Division
?result = ?a % ?b               % Modulo
```

### Comparison (usable in rule bodies)
```datalog
?a = ?b                         % Equality
?a != ?b                        % Inequality
?a < ?b, ?a > ?b                % Comparison
?a <= ?b, ?a >= ?b              % Comparison
```

### String Operations
```datalog
string_concat(?s1, ?s2, ?result)
string_length(?s, ?len)
string_lowercase(?s, ?lower)
string_uppercase(?s, ?upper)
```

---

## WHERE CLAUSE EXAMPLES

### Join Across Concepts
```datalog
where {
    % User concept state
    user_name(?user, ?username),
    user_email(?user, ?email),
    
    % Profile concept state
    profile_of(?profile, ?user),
    profile_bio(?profile, ?bio),
    profile_image(?profile, ?image),
    
    % JWT concept state
    jwt_token(?user, ?token)
}
```

### Conditional Logic
```datalog
where {
    post_author(?post, ?author),
    
    % Authorization: author must match authenticated user
    ?author = ?authenticatedUser
}
```

### Aggregation with Built-in
```datalog
where {
    % Count how many users favorited this item
    count_rows((favorited(?item, ?user)), ?count)
}
```

### Negation (Stratified)
```datalog
where {
    % Only if user doesn't have a profile
    user_exists(?user),
    not profile_of(_, ?user),
    
    % Generate new ID
    uuid_generate(?profileId)
}
```

### Optional Data (Use Disjunction)
```datalog
where {
    article_slug(?article, ?slug),
    article_title(?article, ?title),
    
    % Either has tags or use empty marker
    (tag_of(?article, ?tag) ; ?tag = "none")
}
```

### Recursion
```datalog
where {
    % Find all transitively nested comments
    reachable_comment(?comment, ?post)
}

% Recursive rule defined in Concept state:
reachable_comment(C, P) :- comment_target(C, P).
reachable_comment(C, P) :- 
    comment_target(C, Mid),
    reachable_comment(Mid, P).
```

---

## DESIGN PATTERNS

### 1. Bootstrap (Entry Point)
```datalog
sync HandleRequest
when {
    action_completed(?req),
    action_invoked(?req, "Web", "request", ?flow, _),
    action_input(?req, "method", "create_item"),
    action_input(?req, "name", ?name)
}
where {
    uuid_generate(?itemId)
}
then {
    invoke_action("Item", "create", [item: ?itemId, name: ?name])
}
```

### 2. Authentication Guard
```datalog
sync VerifyAuth
when {
    action_completed(?req),
    action_input(?req, "method", "delete_post"),
    action_input(?req, "token", ?token)
}
then {
    invoke_action("JWT", "verify", [token: ?token])
}

sync PerformDelete
when {
    action_completed(?req),
    action_input(?req, "method", "delete_post"),
    action_input(?req, "post", ?post),
    
    action_completed(?auth),
    action_output(?auth, "user", ?user),
    
    in_flow(?req, ?flow),
    in_flow(?auth, ?flow)
}
where {
    % Authorization check
    post_author(?post, ?author),
    ?author = ?user
}
then {
    invoke_action("Post", "delete", [post: ?post])
}
```

### 3. Cascade Operations
```datalog
sync CascadeDeleteComments
when {
    action_completed(?del),
    action_output(?del, "post", ?deletedPost)
}
where {
    % Find all comments on this post
    comment_target(?comment, ?deletedPost)
    % When multiple ?comment values match, then clause invoked for each
}
then {
    invoke_action("Comment", "delete", [comment: ?comment])
}
```

### 4. Default Creation
```datalog
sync CreateDefaultProfile
when {
    action_completed(?reg),
    action_output(?reg, "user", ?user)
}
where {
    % Only if no profile exists
    not profile_of(_, ?user),
    uuid_generate(?profileId)
}
then {
    invoke_action("Profile", "create", 
        [profile: ?profileId, user: ?user])
}
```

### 5. Multi-Concept Response Assembly
```datalog
sync AssembleResponse
when {
    action_completed(?req),
    action_output(?req, "request", ?reqId),
    action_completed(?userReg),
    action_output(?userReg, "user", ?u),
    action_completed(?profReg),
    action_output(?profReg, "profile", ?p),
    
    % All in same flow
    in_flow(?req, ?flow),
    in_flow(?userReg, ?flow),
    in_flow(?profReg, ?flow)
}
where {
    % Query multiple concept states
    user_name(?u, ?username),
    user_email(?u, ?email),
    profile_bio(?p, ?bio),
    profile_image(?p, ?image)
}
then {
    invoke_action("Web", "respond", 
        [request: ?reqId, 
         body: [username: ?username, email: ?email, 
                bio: ?bio, image: ?image]])
}
```

### 6. Computed Values
```datalog
sync UpdateFavoriteCount
when {
    action_completed(?fav),
    action_output(?fav, "item", ?item)
}
where {
    % Use built-in aggregation
    count_rows((favorited(?item, ?u)), ?count)
}
then {
    invoke_action("Favorite", "update_count", 
        [item: ?item, count: ?count])
}
```

---

## MANDATORY RULES

**Concept Level:**
- ✓ No references to other concept names (except in type params)
- ✓ Type parameters unconstrained
- ✓ State fully declared as predicates
- ✓ Actions use named arguments/returns only
- ✓ Error cases as explicit overloads

**Synchronization Level:**
- ✓ Unique sync names
- ✓ One behavioral rule per sync
- ✓ Action reads only in `when` clause
- ✓ State reads only in `where` clause
- ✓ Action writes only in `then` clause
- ✓ Variables prefixed with `?`
- ✓ Underscore `_` for ignored values

**Flow Constraints:**
- ✓ All `when` actions must share same `?flow`
- ✓ All `then` actions inherit same `?flow`
- ✓ Flows start at external actions (e.g., Web/request)

**Where Clause:**
- ✓ Pure Datalog only (no SPARQL syntax)
- ✓ Use built-ins for UUID, aggregation, arithmetic
- ✓ Stratified negation only (no cycles through negation)

**Ordering:**
- ✓ Validation before state changes
- ✓ Use multiple syncs for sequencing

---

## NAMING CONVENTIONS

- **Concepts**: PascalCase (`Password`, `UserProfile`)
- **Actions**: camelCase (`register`, `checkPassword`)
- **Syncs**: PascalCase descriptive (`ValidateRegistrationPassword`)
- **Predicates**: lowercase_underscore (`user_name`, `has_password`)
- **Variables**: `?` prefix (`?user`, `?email`)
- **Constants**: underscore for ignored (`_`)
- **Fields**: camelCase (`user`, `email`, `error`)

---

## EXECUTION MODEL

1. **External action** arrives (e.g., Web/request)
2. **Engine** asserts action_invoked facts
3. **Concept** processes action, asserts action_completed facts
4. **Engine** evaluates all syncs via semi-naive bottom-up Datalog
5. **Matching syncs** produce new action_invoked facts
6. **Repeat** steps 3-5 until fixpoint (no new facts derived)
7. **Provenance** tracked via sync_triggered facts

**Idempotency**: Each sync fires at most once per trigger action (enforced via sync_triggered check).

**Stratification**: Synchronizations are evaluated in strata to handle negation correctly. The engine automatically determines stratification based on dependency analysis.

---

## COMPLETE EXAMPLE

```datalog
concept Password [U]
purpose
    to securely store and validate user credentials
state
    password(user: U, hash: string)
    salt(user: U, value: string)
    
    :- password(U, H1), password(U, H2), H1 != H2.
    has_password(User) :- password(User, _).
actions
    set [ user: U ; password: string ] => [ user: U ]
    set [ user: U ; password: string ] => [ error: string ]
    check [ user: U ; password: string ] => [ valid: boolean ]
operational principle
    after set [ user: x ; password: "secret" ] => [ user: x ]
    then check [ user: x ; password: "secret" ] => [ valid: true ]

sync ValidatePassword
when {
    action_completed(?req),
    action_input(?req, "method", "register"),
    action_input(?req, "password", ?password)
}
where {
    string_length(?password, ?len),
    ?len >= 8  % Minimum length check
}
then {
    invoke_action("Password", "validate", [password: ?password])
}

sync SetNewPassword
when {
    action_completed(?req),
    action_input(?req, "password", ?password),
    action_completed(?userReg),
    action_output(?userReg, "user", ?user),
    action_completed(?valid),
    
    in_flow(?req, ?flow),
    in_flow(?userReg, ?flow),
    in_flow(?valid, ?flow)
}
then {
    invoke_action("Password", "set", [user: ?user, password: ?password])
}
```

This pure Datalog specification enables LLMs to generate modular, auditable, and incrementally extensible software with a single consistent query language.