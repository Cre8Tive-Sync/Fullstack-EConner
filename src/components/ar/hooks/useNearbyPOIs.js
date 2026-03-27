import { useMemo } from 'react'

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export { getDistanceMeters }

/**
 * Compute the initial bearing (forward azimuth) from point 1 to point 2.
 * Returns degrees 0–360.
 */
function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/**
 * Given a start point, bearing (degrees) and distance (meters),
 * return the destination {lat, lng}.
 */
function destinationPoint(lat, lng, bearing, distanceMeters) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const d = distanceMeters / R
  const brng = toRad(bearing)
  const lat1 = toRad(lat)
  const lng1 = toRad(lng)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

/**
 * Returns clamped GPS coords for a POI relative to user position.
 * - If user is within the POI's proximityRadius → true coords
 * - Otherwise → clamp to maxDistance meters along the correct bearing
 */
export function getClampedCoords(userLat, userLng, poi, maxDistance = 200) {
  const dist = getDistanceMeters(userLat, userLng, poi.lat, poi.lng)

  if (dist <= poi.proximityRadius) {
    return { lat: poi.lat, lng: poi.lng, clamped: false, distance: dist }
  }

  if (dist <= maxDistance) {
    return { lat: poi.lat, lng: poi.lng, clamped: false, distance: dist }
  }

  const bearing = getBearing(userLat, userLng, poi.lat, poi.lng)
  const dest = destinationPoint(userLat, userLng, bearing, maxDistance)
  return { lat: dest.lat, lng: dest.lng, clamped: true, distance: dist }
}

export function useNearbyPOIs(coords, pois) {
  const result = useMemo(() => {
    if (!coords) {
      return { closestPOI: null, nearbyPOIs: [], allPOIs: pois }
    }

    const withDistance = pois.map((poi) => ({
      ...poi,
      distance: getDistanceMeters(coords.latitude, coords.longitude, poi.lat, poi.lng),
    }))

    withDistance.sort((a, b) => a.distance - b.distance)

    const nearby = withDistance.filter((poi) => poi.distance <= poi.proximityRadius)

    return {
      closestPOI: nearby.length > 0 ? nearby[0] : null,
      nearbyPOIs: nearby,
      allPOIs: withDistance,
    }
  }, [coords?.latitude, coords?.longitude, pois])

  return result
}
