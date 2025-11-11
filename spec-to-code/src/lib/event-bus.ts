/**
 * Event Bus for Synchronization Coordination
 *
 * Compiles declarative synchronizations into event-driven TypeScript functions.
 * Each sync becomes a function that:
 * 1. Pattern-matches on completed action events
 * 2. Checks concept, action name, and result shape
 * 3. Extracts variable bindings
 * 4. Optionally queries concept state for where clauses
 * 5. Invokes subsequent concept actions
 * 6. Propagates flow tokens for provenance tracking
 */

import { EventEmitter } from 'events'

export interface ActionEvent {
  flowId: string // Provenance token for tracking request flow
  concept: string
  action: string
  args: Record<string, any>
  result: Record<string, any>
  timestamp: Date
}

export interface FlowContext {
  flowId: string
  events: ActionEvent[]
  metadata: Record<string, any>
}

export class EventBus extends EventEmitter {
  private flows: Map<string, FlowContext> = new Map()

  /**
   * Start a new flow context (typically for a new HTTP request)
   */
  startFlow(flowId: string, metadata: Record<string, any> = {}): void {
    this.flows.set(flowId, {
      flowId,
      events: [],
      metadata
    })
  }

  /**
   * Emit an action completion event
   */
  emitAction(event: ActionEvent): void {
    const flow = this.flows.get(event.flowId)
    if (flow) {
      flow.events.push(event)
    }

    // Emit event for synchronization listeners
    this.emit('action', event)

    // Emit specific event for this concept/action
    this.emit(`${event.concept}/${event.action}`, event)
  }

  /**
   * Get all events for a flow
   */
  getFlowEvents(flowId: string): ActionEvent[] {
    return this.flows.get(flowId)?.events || []
  }

  /**
   * Get flow context
   */
  getFlow(flowId: string): FlowContext | undefined {
    return this.flows.get(flowId)
  }

  /**
   * Clean up flow after completion
   */
  endFlow(flowId: string): void {
    this.flows.delete(flowId)
  }

  /**
   * Pattern match helper for synchronizations
   * Checks if an event matches a pattern and extracts bindings
   */
  matchPattern(
    event: ActionEvent,
    pattern: {
      concept?: string
      action?: string
      args?: Record<string, any>
      result?: Record<string, any>
    }
  ): { matched: boolean; bindings: Record<string, any> } {
    const bindings: Record<string, any> = {}

    // Match concept
    if (pattern.concept && event.concept !== pattern.concept) {
      return { matched: false, bindings }
    }

    // Match action
    if (pattern.action && event.action !== pattern.action) {
      return { matched: false, bindings }
    }

    // Match args patterns and extract bindings
    if (pattern.args) {
      for (const [key, value] of Object.entries(pattern.args)) {
        if (typeof value === 'string' && value.startsWith('?')) {
          // Variable binding
          bindings[value] = event.args[key]
        } else if (event.args[key] !== value) {
          // Literal match failed
          return { matched: false, bindings }
        }
      }
    }

    // Match result patterns and extract bindings
    if (pattern.result) {
      for (const [key, value] of Object.entries(pattern.result)) {
        if (typeof value === 'string' && value.startsWith('?')) {
          // Variable binding
          bindings[value] = event.result[key]
        } else if (event.result[key] !== value) {
          // Literal match failed
          return { matched: false, bindings }
        }
      }
    }

    return { matched: true, bindings }
  }

  /**
   * Check if all required events exist in a flow
   */
  checkFlowConditions(
    flowId: string,
    conditions: Array<{
      concept: string
      action: string
      args?: Record<string, any>
      result?: Record<string, any>
    }>
  ): { matched: boolean; bindings: Record<string, any> } {
    const flow = this.flows.get(flowId)
    if (!flow) {
      return { matched: false, bindings: {} }
    }

    const allBindings: Record<string, any> = {}

    for (const condition of conditions) {
      let found = false

      for (const event of flow.events) {
        const { matched, bindings } = this.matchPattern(event, condition)
        if (matched) {
          Object.assign(allBindings, bindings)
          found = true
          break
        }
      }

      if (!found) {
        return { matched: false, bindings: {} }
      }
    }

    return { matched: true, bindings: allBindings }
  }
}

// Global event bus instance
export const eventBus = new EventBus()
