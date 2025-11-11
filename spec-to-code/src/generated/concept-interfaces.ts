/**
 * Generated TypeScript interfaces from concept specifications
 *
 * These interfaces enforce structural correctness at compile-time,
 * ensuring implementations match the behavioral contracts defined in specs.
 */

// ============================================================================
// User Concept Interface
// Source: specs/conduit-realworld/concepts/User.txt
// ============================================================================

export interface IUser {
  // register [ user: U ; email: string ; username: string ] => [ user: U ]
  // register [ user: U ; email: string ; username: string ] => [ error: string ]
  register(args: {
    user: string
    email: string
    username: string
  }): Promise<{ user: string } | { error: string }>

  // update [ user: U ; email: string ; bio: string ; image: string ] => [ user: U ]
  // update [ user: U ; email: string ; bio: string ; image: string ] => [ error: string ]
  update(args: {
    user: string
    email?: string
    bio?: string
    image?: string
  }): Promise<{ user: string } | { error: string }>

  // getByEmail [ email: string ] => [ user: U ]
  // getByEmail [ email: string ] => [ error: string ]
  getByEmail(args: {
    email: string
  }): Promise<{ user: string } | { error: string }>

  // getByUsername [ username: string ] => [ user: U ]
  // getByUsername [ username: string ] => [ error: string ]
  getByUsername(args: {
    username: string
  }): Promise<{ user: string } | { error: string }>

  // exists [ user: U ] => [ exists: boolean ]
  exists(args: {
    user: string
  }): Promise<{ exists: boolean }>
}

// ============================================================================
// Password Concept Interface
// Source: specs/conduit-realworld/concepts/Password.txt
// ============================================================================

export interface IPassword {
  // set [ user: U ; password: string ] => [ user: U ]
  // set [ user: U ; password: string ] => [ error: string ]
  set(args: {
    user: string
    password: string
  }): Promise<{ user: string } | { error: string }>

  // check [ user: U ; password: string ] => [ valid: boolean ]
  // check [ user: U ; password: string ] => [ error: string ]
  check(args: {
    user: string
    password: string
  }): Promise<{ valid: boolean } | { error: string }>

  // validate [ password: string ] => [ valid: boolean ]
  validate(args: {
    password: string
  }): Promise<{ valid: boolean }>
}

// ============================================================================
// JWT Concept Interface
// Source: specs/conduit-realworld/concepts/JWT.txt
// ============================================================================

export interface IJWT {
  // generate [ user: U ] => [ token: string ]
  generate(args: {
    user: string
  }): Promise<{ token: string }>

  // verify [ token: string ] => [ user: U ]
  // verify [ token: string ] => [ error: string ]
  verify(args: {
    token: string
  }): Promise<{ user: string } | { error: string }>
}

// ============================================================================
// Article Concept Interface
// Source: specs/conduit-realworld/concepts/Article.txt
// ============================================================================

export interface IArticle {
  // create [ article: A ; slug: string ; title: string ; description: string ; body: string ; author: U ] => [ article: A ]
  // create [ article: A ; slug: string ; title: string ; description: string ; body: string ; author: U ] => [ error: string ]
  create(args: {
    article: string
    slug: string
    title: string
    description: string
    body: string
    author: string
  }): Promise<{ article: string } | { error: string }>

  // getBySlug [ slug: string ] => [ article: A ; title: string ; description: string ; body: string ; author: U ; createdAt: datetime ; updatedAt: datetime ]
  // getBySlug [ slug: string ] => [ error: string ]
  getBySlug(args: {
    slug: string
  }): Promise<{
    article: string
    title: string
    description: string
    body: string
    author: string
    createdAt: Date
    updatedAt: Date
  } | { error: string }>

  // update [ article: A ; title: string ; description: string ; body: string ] => [ article: A ]
  // update [ article: A ; title: string ; description: string ; body: string ] => [ error: string ]
  update(args: {
    article: string
    title?: string
    description?: string
    body?: string
  }): Promise<{ article: string } | { error: string }>

  // delete [ article: A ] => [ article: A ]
  // delete [ article: A ] => [ error: string ]
  delete(args: {
    article: string
  }): Promise<{ article: string } | { error: string }>

  // list [ limit: int ; offset: int ] => [ articles: set A ; count: int ]
  list(args: {
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }>

  // listByAuthor [ author: U ; limit: int ; offset: int ] => [ articles: set A ; count: int ]
  listByAuthor(args: {
    author: string
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }>

  // listByTag [ tag: string ; limit: int ; offset: int ] => [ articles: set A ; count: int ]
  listByTag(args: {
    tag: string
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }>

  // feed [ user: U ; limit: int ; offset: int ] => [ articles: set A ; count: int ]
  feed(args: {
    user: string
    limit: number
    offset: number
  }): Promise<{ articles: string[]; count: number }>

  // getAuthor [ article: A ] => [ author: U ]
  getAuthor(args: {
    article: string
  }): Promise<{ author: string }>

  // exists [ article: A ] => [ exists: boolean ]
  exists(args: {
    article: string
  }): Promise<{ exists: boolean }>
}

// ============================================================================
// Comment Concept Interface
// Source: specs/conduit-realworld/concepts/Comment.txt
// ============================================================================

export interface IComment {
  // create [ comment: C ; body: string ; article: A ; author: U ] => [ comment: C ]
  // create [ comment: C ; body: string ; article: A ; author: U ] => [ error: string ]
  create(args: {
    comment: string
    body: string
    article: string
    author: string
  }): Promise<{ comment: string } | { error: string }>

  // delete [ comment: C ] => [ comment: C ]
  // delete [ comment: C ] => [ error: string ]
  delete(args: {
    comment: string
  }): Promise<{ comment: string } | { error: string }>

  // listByArticle [ article: A ] => [ comments: set C ]
  listByArticle(args: {
    article: string
  }): Promise<{ comments: string[] }>

  // getAuthor [ comment: C ] => [ author: U ]
  getAuthor(args: {
    comment: string
  }): Promise<{ author: string }>
}

// ============================================================================
// Favorite Concept Interface
// Source: specs/conduit-realworld/concepts/Favorite.txt
// ============================================================================

export interface IFavorite {
  // add [ item: I ; user: U ] => [ item: I ]
  add(args: {
    item: string
    user: string
  }): Promise<{ item: string }>

  // remove [ item: I ; user: U ] => [ item: I ]
  remove(args: {
    item: string
    user: string
  }): Promise<{ item: string }>

  // isFavorited [ item: I ; user: U ] => [ favorited: boolean ]
  isFavorited(args: {
    item: string
    user: string
  }): Promise<{ favorited: boolean }>

  // getCount [ item: I ] => [ count: int ]
  getCount(args: {
    item: string
  }): Promise<{ count: number }>

  // getFavoritedBy [ user: U ] => [ items: set I ]
  getFavoritedBy(args: {
    user: string
  }): Promise<{ items: string[] }>
}

// ============================================================================
// Following Concept Interface
// Source: specs/conduit-realworld/concepts/Following.txt
// ============================================================================

export interface IFollowing {
  // follow [ follower: U ; followee: U ] => [ follower: U ]
  follow(args: {
    follower: string
    followee: string
  }): Promise<{ follower: string }>

  // unfollow [ follower: U ; followee: U ] => [ follower: U ]
  unfollow(args: {
    follower: string
    followee: string
  }): Promise<{ follower: string }>

  // isFollowing [ follower: U ; followee: U ] => [ following: boolean ]
  isFollowing(args: {
    follower: string
    followee: string
  }): Promise<{ following: boolean }>

  // getFollowing [ user: U ] => [ users: set U ]
  getFollowing(args: {
    user: string
  }): Promise<{ users: string[] }>

  // getFollowers [ user: U ] => [ users: set U ]
  getFollowers(args: {
    user: string
  }): Promise<{ users: string[] }>
}

// ============================================================================
// Tag Concept Interface
// Source: specs/conduit-realworld/concepts/Tag.txt
// ============================================================================

export interface ITag {
  // add [ article: A ; tag: string ] => [ article: A ]
  add(args: {
    article: string
    tag: string
  }): Promise<{ article: string }>

  // remove [ article: A ; tag: string ] => [ article: A ]
  remove(args: {
    article: string
    tag: string
  }): Promise<{ article: string }>

  // getByArticle [ article: A ] => [ tags: set string ]
  getByArticle(args: {
    article: string
  }): Promise<{ tags: string[] }>

  // list [] => [ tags: set string ]
  list(): Promise<{ tags: string[] }>
}

// ============================================================================
// Profile Concept Interface
// Source: specs/conduit-realworld/concepts/Profile.txt
// ============================================================================

export interface IProfile {
  // get [ username: string ] => [ username: string ; bio: string ; image: string ]
  // get [ username: string ] => [ error: string ]
  get(args: {
    username: string
  }): Promise<{
    username: string
    bio: string
    image: string
  } | { error: string }>
}
