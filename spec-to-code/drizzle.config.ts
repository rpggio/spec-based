import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schemas/index.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './database/conduit.db'
  }
})
