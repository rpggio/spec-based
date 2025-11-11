/**
 * Database connection and Drizzle ORM instance
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../schemas/index.js'

const sqlite = new Database('./database/conduit.db')
export const db = drizzle(sqlite, { schema })

export type DB = typeof db
