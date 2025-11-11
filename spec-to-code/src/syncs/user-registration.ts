/**
 * User Registration Synchronizations
 *
 * Compiled from specs/conduit-realworld/synchronizations/user-registration.txt
 * Each sync is a direct function that listens to action events and invokes subsequent actions.
 */

import { eventBus, type ActionEvent } from '../lib/event-bus.js'
import type { UserConcept } from '../concepts/User.js'
import type { PasswordConcept } from '../concepts/Password.js'
import type { JWTConcept } from '../concepts/JWT.js'
import { uuid } from '../lib/utils.js'

export interface Concepts {
  User: UserConcept
  Password: PasswordConcept
  JWT: JWTConcept
}

/**
 * sync ValidateRegistrationPassword
 * when {
 *   Web/request: [ method: "POST" ; path: "/api/users" ; body: ?body ] => [ request: ?req ]
 * }
 * where {
 *   bind ( ?body["user"]["password"] as ?password )
 * }
 * then {
 *   Password/validate: [ password: ?password ]
 * }
 */
export function setupValidateRegistrationPassword(concepts: Concepts): void {
  eventBus.on('Web/request', async (event: ActionEvent) => {
    // Pattern match
    const { matched, bindings } = eventBus.matchPattern(event, {
      concept: 'Web',
      action: 'request',
      args: { method: 'POST', path: '/api/users' }
    })

    if (!matched) return

    // Extract password from body
    const body = event.args.body
    if (!body?.user?.password) return

    const password = body.user.password

    // Invoke Password/validate
    const result = await concepts.Password.validate({ password })

    // Emit action event
    eventBus.emitAction({
      flowId: event.flowId,
      concept: 'Password',
      action: 'validate',
      args: { password },
      result,
      timestamp: new Date()
    })
  })
}

/**
 * sync RegisterUser
 * when {
 *   Web/request: [ method: "POST" ; path: "/api/users" ; body: ?body ] => [ request: ?req ]
 *   Password/validate: [] => [ valid: true ]
 * }
 * where {
 *   bind ( uuid() as ?userId )
 *   bind ( ?body["user"]["email"] as ?email )
 *   bind ( ?body["user"]["username"] as ?username )
 * }
 * then {
 *   User/register: [ user: ?userId ; email: ?email ; username: ?username ]
 * }
 */
export function setupRegisterUser(concepts: Concepts): void {
  eventBus.on('Password/validate', async (event: ActionEvent) => {
    // Only proceed if password is valid
    if (!event.result.valid) return

    // Check flow conditions: need Web/request in same flow
    const { matched, bindings } = eventBus.checkFlowConditions(event.flowId, [
      { concept: 'Web', action: 'request', args: { method: 'POST', path: '/api/users' } },
      { concept: 'Password', action: 'validate', result: { valid: true } }
    ])

    if (!matched) return

    // Get request event to extract body
    const flow = eventBus.getFlow(event.flowId)
    const requestEvent = flow?.events.find(e => e.concept === 'Web' && e.action === 'request')
    if (!requestEvent) return

    const body = requestEvent.args.body
    if (!body?.user) return

    // Generate user ID and extract email/username
    const userId = uuid()
    const email = body.user.email
    const username = body.user.username

    if (!email || !username) return

    // Invoke User/register
    const result = await concepts.User.register({ user: userId, email, username })

    // Emit action event
    eventBus.emitAction({
      flowId: event.flowId,
      concept: 'User',
      action: 'register',
      args: { user: userId, email, username },
      result,
      timestamp: new Date()
    })
  })
}

/**
 * sync SetUserPassword
 * when {
 *   Web/request: [ method: "POST" ; path: "/api/users" ; body: ?body ] => [ request: ?req ]
 *   User/register: [] => [ user: ?userId ]
 * }
 * where {
 *   bind ( ?body["user"]["password"] as ?password )
 * }
 * then {
 *   Password/set: [ user: ?userId ; password: ?password ]
 * }
 */
export function setupSetUserPassword(concepts: Concepts): void {
  eventBus.on('User/register', async (event: ActionEvent) => {
    // Only proceed if registration succeeded
    if ('error' in event.result) return

    const userId = event.result.user

    // Get request event to extract password
    const flow = eventBus.getFlow(event.flowId)
    const requestEvent = flow?.events.find(e => e.concept === 'Web' && e.action === 'request')
    if (!requestEvent) return

    const body = requestEvent.args.body
    const password = body?.user?.password
    if (!password) return

    // Invoke Password/set
    const result = await concepts.Password.set({ user: userId, password })

    // Emit action event
    eventBus.emitAction({
      flowId: event.flowId,
      concept: 'Password',
      action: 'set',
      args: { user: userId, password },
      result,
      timestamp: new Date()
    })
  })
}

/**
 * sync GenerateRegistrationToken
 * when {
 *   User/register: [] => [ user: ?userId ]
 *   Password/set: [ user: ?userId ] => []
 * }
 * then {
 *   JWT/generate: [ user: ?userId ]
 * }
 */
export function setupGenerateRegistrationToken(concepts: Concepts): void {
  eventBus.on('Password/set', async (event: ActionEvent) => {
    // Only proceed if password set succeeded
    if ('error' in event.result) return

    const userId = event.args.user

    // Check that User/register succeeded in same flow
    const { matched } = eventBus.checkFlowConditions(event.flowId, [
      { concept: 'User', action: 'register', result: { user: userId } },
      { concept: 'Password', action: 'set', args: { user: userId } }
    ])

    if (!matched) return

    // Invoke JWT/generate
    const result = await concepts.JWT.generate({ user: userId })

    // Emit action event
    eventBus.emitAction({
      flowId: event.flowId,
      concept: 'JWT',
      action: 'generate',
      args: { user: userId },
      result,
      timestamp: new Date()
    })
  })
}

/**
 * Initialize all user registration synchronizations
 */
export function setupUserRegistrationSyncs(concepts: Concepts): void {
  setupValidateRegistrationPassword(concepts)
  setupRegisterUser(concepts)
  setupSetUserPassword(concepts)
  setupGenerateRegistrationToken(concepts)
}
