export type BridgeEvent<T = unknown> = CustomEvent<T>

export function emit<T = Record<string, unknown>>(name: string, detail?: T): void
export function on(name: string, handler: (event: Event) => void): void
export function off(name: string, handler: (event: Event) => void): void
export function once(name: string, handler: (event: Event) => void): void

declare const eventBridge: {
  emit: typeof emit
  on: typeof on
  off: typeof off
  once: typeof once
}

export default eventBridge
