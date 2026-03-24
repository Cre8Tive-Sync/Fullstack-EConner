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
