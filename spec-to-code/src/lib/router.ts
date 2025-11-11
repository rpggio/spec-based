/**
 * Simple HTTP Router
 *
 * Direct and inspectable routing without heavy framework dependencies.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { parse } from 'url'

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  body: any
) => Promise<void>

interface Route {
  method: string
  pattern: RegExp
  paramNames: string[]
  handler: RouteHandler
}

export class Router {
  private routes: Route[] = []

  /**
   * Register a route with URL pattern matching
   */
  register(method: string, pattern: string, handler: RouteHandler): void {
    // Convert Express-style params (:id) to regex
    const paramNames: string[] = []
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })

    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${regexPattern}$`),
      paramNames,
      handler
    })
  }

  get(pattern: string, handler: RouteHandler): void {
    this.register('GET', pattern, handler)
  }

  post(pattern: string, handler: RouteHandler): void {
    this.register('POST', pattern, handler)
  }

  put(pattern: string, handler: RouteHandler): void {
    this.register('PUT', pattern, handler)
  }

  delete(pattern: string, handler: RouteHandler): void {
    this.register('DELETE', pattern, handler)
  }

  /**
   * Handle incoming request
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const method = req.method?.toUpperCase() || 'GET'
    const pathname = parse(req.url || '').pathname || '/'

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) continue

      const match = pathname.match(route.pattern)
      if (!match) continue

      // Extract params
      const params: Record<string, string> = {}
      route.paramNames.forEach((name, index) => {
        params[name] = match[index + 1]
      })

      // Parse body for POST/PUT
      let body: any = null
      if (method === 'POST' || method === 'PUT') {
        body = await this.parseBody(req)
      }

      // Call handler
      try {
        await route.handler(req, res, params, body)
        return true
      } catch (error) {
        console.error('Route handler error:', error)
        this.sendJSON(res, 500, { error: 'Internal server error' })
        return true
      }
    }

    return false
  }

  /**
   * Parse JSON body from request
   */
  private parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = ''
      req.on('data', chunk => {
        data += chunk.toString()
      })
      req.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve(parsed)
        } catch (error) {
          resolve(null)
        }
      })
      req.on('error', reject)
    })
  }

  /**
   * Helper to send JSON response
   */
  sendJSON(res: ServerResponse, status: number, data: any): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    })
    res.end(JSON.stringify(data))
  }

  /**
   * Extract JWT token from Authorization header
   */
  extractToken(req: IncomingMessage): string | null {
    const auth = req.headers.authorization
    if (!auth) return null

    const match = auth.match(/^Token (.+)$/)
    return match ? match[1] : null
  }
}
