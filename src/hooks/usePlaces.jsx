import { createContext, useContext, useMemo } from 'react'
import { usePOIsFromFirestore } from '../components/ar/hooks/usePOIsFromFirestore'
import { getDistanceMeters } from '../components/ar/hooks/useNearbyPOIs'
import { useUserLocation } from './useUserLocation'
import { CATEGORIES, isCurated, matchesQuery } from '../lib/places'

/**
 * Loads the place catalog once for the whole app and decorates every record
 * with its live distance from the user (when location is available).
 */

const PlacesContext = createContext(null)

export function PlacesProvider({ children }) {
  const { pois, loading } = usePOIsFromFirestore()
  const { coords } = useUserLocation()

  const places = useMemo(() => {
    if (!coords) return pois.map((poi) => ({ ...poi, distance: null }))

    return pois.map((poi) => ({
      ...poi,
      distance: getDistanceMeters(coords.latitude, coords.longitude, poi.lat, poi.lng),
    }))
  }, [pois, coords?.latitude, coords?.longitude])

  const value = useMemo(() => ({ places, loading, hasLocation: coords != null }), [places, loading, coords])

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
}

export function usePlaces() {
  return useContext(PlacesContext) ?? { places: [], loading: true, hasLocation: false }
}

/** Category list with a live count of the places in each. */
export function useCategories() {
  const { places } = usePlaces()

  return useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        count: places.filter((poi) => poi.category_id === category.id).length,
      })),
    [places]
  )
}

/**
 * Filtered + sorted view of the catalog.
 * sort: 'distance' | 'name' | 'auto' (distance when known, else curated first)
 */
export function usePlaceList({ query = '', categoryId = null, sort = 'auto' } = {}) {
  const { places, loading, hasLocation } = usePlaces()

  const results = useMemo(() => {
    const filtered = places.filter(
      (poi) =>
        poi.is_active !== false &&
        (!categoryId || poi.category_id === categoryId) &&
        matchesQuery(poi, query)
    )

    const byName = (a, b) => a.name.localeCompare(b.name)
    const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)

    if (sort === 'name') return [...filtered].sort(byName)
    if (sort === 'distance') return [...filtered].sort(byDistance)

    // auto
    if (hasLocation) return [...filtered].sort(byDistance)
    return [...filtered].sort((a, b) => {
      const curated = Number(isCurated(b)) - Number(isCurated(a))
      return curated !== 0 ? curated : byName(a, b)
    })
  }, [places, query, categoryId, sort, hasLocation])

  return { results, loading, hasLocation }
}

/** Single place by slug or id. */
export function usePlace(slugOrId) {
  const { places, loading } = usePlaces()

  const place = useMemo(
    () => places.find((poi) => poi.slug === slugOrId || poi.id === slugOrId) ?? null,
    [places, slugOrId]
  )

  return { place, loading }
}
