/**
 * Drizzle Schema with Concept Provenance Annotations
 *
 * JSDoc annotations maintain traceability to concept specifications:
 * @concept - Maps table to concept name
 * @state - Maps column to concept state relation
 * @type_binding - Maps generic type parameters to concrete implementations
 */

import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

/**
 * @concept User
 * @state users: set U
 * @state email: U -> string
 * @state username: U -> string
 * @state bio: U -> string
 * @state image: U -> string
 * @type_binding U = string (UUID)
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // U
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  bio: text('bio').notNull().default(''),
  image: text('image').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

/**
 * @concept Password
 * @state password: U -> string (hashed)
 * @state salt: U -> string
 * @type_binding U = string (foreign key to users.id)
 */
export const passwords = sqliteTable('passwords', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

/**
 * @concept JWT
 * @state tokens: U -> string
 * @type_binding U = string (foreign key to users.id)
 * Note: Tokens are stateless in practice, this table is for audit/revocation if needed
 */
export const tokens = sqliteTable('tokens', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.token] })
}))

/**
 * @concept Article
 * @state articles: set A
 * @state slug: A -> string
 * @state title: A -> string
 * @state description: A -> string
 * @state body: A -> string
 * @state author: A -> U
 * @type_binding A = string (UUID)
 * @type_binding U = string (foreign key to users.id)
 */
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(), // A
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  body: text('body').notNull(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

/**
 * @concept Tag
 * @state tags: set T
 * @state name: T -> string
 * @state articles: T -> set A (many-to-many via article_tags)
 * @type_binding T = string (tag name as primary key)
 * @type_binding A = string (foreign key to articles.id)
 */
export const tags = sqliteTable('tags', {
  name: text('name').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

/**
 * @concept Tag (continuation)
 * @state Tag/articles: many-to-many relationship
 */
export const articleTags = sqliteTable('article_tags', {
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagName: text('tag_name').notNull().references(() => tags.name, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  pk: primaryKey({ columns: [table.articleId, table.tagName] })
}))

/**
 * @concept Comment
 * @state comments: set C
 * @state body: C -> string
 * @state author: C -> U
 * @state article: C -> A
 * @type_binding C = string (UUID)
 * @type_binding U = string (foreign key to users.id)
 * @type_binding A = string (foreign key to articles.id)
 */
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(), // C
  body: text('body').notNull(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

/**
 * @concept Favorite
 * @state favorites: I -> set U (items to users who favorited)
 * @state count: I -> int
 * @type_binding I = string (foreign key to articles.id)
 * @type_binding U = string (foreign key to users.id)
 */
export const favorites = sqliteTable('favorites', {
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  pk: primaryKey({ columns: [table.articleId, table.userId] })
}))

/**
 * @concept Following
 * @state following: U -> set U (follower to followees)
 * @type_binding U = string (foreign key to users.id)
 */
export const follows = sqliteTable('follows', {
  followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followingId] })
}))

// Relations for Drizzle query builder
export const usersRelations = relations(users, ({ many, one }) => ({
  password: one(passwords, {
    fields: [users.id],
    references: [passwords.userId]
  }),
  articles: many(articles),
  comments: many(comments),
  favorites: many(favorites),
  following: many(follows, { relationName: 'follower' }),
  followers: many(follows, { relationName: 'following' })
}))

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id]
  }),
  tags: many(articleTags),
  comments: many(comments),
  favorites: many(favorites)
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id]
  }),
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id]
  })
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  articles: many(articleTags)
}))

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id]
  }),
  tag: one(tags, {
    fields: [articleTags.tagName],
    references: [tags.name]
  })
}))

export const favoritesRelations = relations(favorites, ({ one }) => ({
  article: one(articles, {
    fields: [favorites.articleId],
    references: [articles.id]
  }),
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id]
  })
}))

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower'
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following'
  })
}))
