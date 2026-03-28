// Lightweight cross-framework event bridge using window CustomEvent
// Usage:
//  import { emit, on, off, once } from '../eventBridge'
//  emit('ar:targeted', { targeted: true })
//  on('ar:select', (e) => console.log(e.detail))

export function emit(name, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch (err) {
    console.warn('emit failed', name, err)
  }
}

export function on(name, handler) {
  window.addEventListener(name, handler)
}

export function off(name, handler) {
  window.removeEventListener(name, handler)
}

export function once(name, handler) {
  const wrapper = (e) => {
    try {
      handler(e)
    } finally {
      off(name, wrapper)
    }
  }
  on(name, wrapper)
}

export default { emit, on, off, once }
