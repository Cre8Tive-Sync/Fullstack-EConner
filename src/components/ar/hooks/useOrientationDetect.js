import { useEffect, useRef, useState } from 'react'

/**
 * Detects device orientation (portrait vs landscape).
 * Uses Screen Orientation API with window.orientation fallback for iOS Safari.
 * Includes debounce to avoid flicker during rotation.
 */
export function useOrientationDetect() {
  const [isLandscape, setIsLandscape] = useState(() => {
    return window.innerWidth > window.innerHeight
  })
  const timer = useRef(null)

  useEffect(() => {
    const update = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        const angle = screen.orientation?.angle ?? window.orientation ?? 0
        const landscape = angle === 90 || angle === -90 || angle === 270
        // Fallback: also check dimensions in case angle API is unreliable
        const dimLandscape = window.innerWidth > window.innerHeight
        setIsLandscape(landscape || dimLandscape)
      }, 400)
    }

    // Standard API
    screen.orientation?.addEventListener('change', update)
    // Legacy iOS
    window.addEventListener('orientationchange', update)
    // Resize fallback
    window.addEventListener('resize', update)

    return () => {
      clearTimeout(timer.current)
      screen.orientation?.removeEventListener('change', update)
      window.removeEventListener('orientationchange', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return { isLandscape }
}
