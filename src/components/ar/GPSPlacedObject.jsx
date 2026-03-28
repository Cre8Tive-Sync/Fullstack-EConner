import { useEffect, useRef } from 'react'
import { useLocationAR } from './hooks/useLocationAR'

/**
 * Places its children at a real-world GPS coordinate in AR space.
 * AR.js converts lat/lng to Three.js world position relative to the user.
 */
export default function GPSPlacedObject({ lat, lng, elevation, children }) {
  const groupRef = useRef()
  const ctx = useLocationAR()
  const addedRef = useRef(false)

  useEffect(() => {
    if (!ctx?.locationBased?.current || !ctx?.gpsReady || !groupRef.current || addedRef.current) return

    try {
      ctx.locationBased.current.add(groupRef.current, lng, lat, elevation)
      addedRef.current = true
    } catch (err) {
      console.warn('GPSPlacedObject: failed to place object:', err.message)
    }
  }, [ctx?.locationBased?.current, ctx?.gpsReady, lat, lng, elevation])

  return <group ref={groupRef}>{children}</group>
}
