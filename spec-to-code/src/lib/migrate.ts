/**
 * Database migration script
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

const sqlite = new Database('./database/conduit.db')
const db = drizzle(sqlite)

console.log('Running migrations...')
migrate(db, { migrationsFolder: './database/migrations' })
console.log('✅ Migrations completed successfully')

sqlite.close()
