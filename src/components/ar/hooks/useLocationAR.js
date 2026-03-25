import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import {
  LocationBased,
  DeviceOrientationControls,
} from '@ar-js-org/ar.js/three.js/build/ar-threex-location-only.mjs'

const LocationARContext = createContext(null)

export function useLocationAR() {
  return useContext(LocationARContext)
}

export { LocationARContext }

/**
 * Hook that initializes the AR.js location-based AR system.
 * Must be called inside R3F's Canvas (needs useThree).
 */
export function useLocationARSetup({ onError }) {
  const { scene, camera } = useThree()
  const locationRef = useRef(null)
  const orientRef = useRef(null)
  const [gpsReady, setGpsReady] = useState(false)
  const [gpsError, setGpsError] = useState(null)

  useEffect(() => {
    try {
      // Initialize AR.js location-based system
      const locationBased = new LocationBased(scene, camera, {
        gpsMinDistance: 5,
        gpsMinAccuracy: 100,
        initialPositionAsOrigin: true,
      })

      // Initialize device orientation controls (handles compass + gyro)
      const orientControls = new DeviceOrientationControls(camera)
      orientControls.smoothingFactor = 0.3

      locationRef.current = locationBased
      orientRef.current = orientControls

      // Listen for GPS updates
      locationBased.on('gpsupdate', () => {
        setGpsReady(true)
        setGpsError(null)
      })

      locationBased.on('gpserror', (code) => {
        setGpsError(`GPS error: code ${code}`)
        onError?.(`GPS error: code ${code}`)
      })

      // Start GPS tracking
      locationBased.startGps()
    } catch (err) {
      console.error('AR.js initialization failed:', err)
      setGpsError(err.message)
      onError?.(err.message)
    }

    return () => {
      locationRef.current?.stopGps()
      orientRef.current?.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    locationBased: locationRef,
    orientControls: orientRef,
    gpsReady,
    gpsError,
  }
}
