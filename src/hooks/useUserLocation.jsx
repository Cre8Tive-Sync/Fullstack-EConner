import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * App-wide geolocation, shared through context so only one watch is ever open.
 *
 * Unlike the AR scene — where location is mandatory — the generic UI treats it
 * as opt-in: the permission prompt only fires when the user taps something that
 * needs it, or automatically if permission was already granted before.
 */

const LocationContext = createContext(null)

const DEFAULT_STATE = { coords: null, status: 'idle', error: null }

export function LocationProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE)
  const watchId = useRef(null)

  const stop = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ coords: null, status: 'unsupported', error: 'Geolocation is not supported' })
      return
    }
    if (watchId.current != null) return

    setState((prev) => ({ ...prev, status: prev.coords ? 'ready' : 'locating' }))

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          status: 'ready',
          error: null,
        })
      },
      (err) => {
        setState({
          coords: null,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
          error: err.message,
        })
        stop()
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
  }, [stop])

  // Resume silently when the user has already granted permission in this browser.
  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ coords: null, status: 'unsupported', error: null })
      return
    }

    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        if (!cancelled && result.state === 'granted') request()
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [request])

  useEffect(() => stop, [stop])

  const value = useMemo(
    () => ({ ...state, request, isReady: state.status === 'ready' && state.coords != null }),
    [state, request]
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useUserLocation() {
  return useContext(LocationContext) ?? { ...DEFAULT_STATE, request: () => {}, isReady: false }
}
