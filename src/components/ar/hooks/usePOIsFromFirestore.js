import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../firebaseConfig'
import { POIS, getCategoryForPlace, formatOperatingHours } from '../data/pois'

function normalizePoiKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildPoiLookup(pois) {
  const lookup = new Map()

  pois.forEach((poi, index) => {
    ;[poi.id, poi.slug, poi.google_place_id, poi.name].forEach((value) => {
      const key = normalizePoiKey(value)
      if (key && !lookup.has(key)) {
        lookup.set(key, index)
      }
    })
  })

  return lookup
}

function mergePoiData(basePoi, incoming, docId) {
  const categoryId = incoming.category_id || basePoi.category_id
  const category = getCategoryForPlace(categoryId)
  const operatingHours = incoming.operating_hours ?? basePoi.operating_hours ?? []
  const incomingImages = Array.isArray(incoming.images) ? incoming.images.filter(Boolean) : []

  return {
    ...basePoi,
    google_place_id: incoming.google_place_id ?? basePoi.google_place_id ?? docId ?? null,
    name: incoming.name ?? basePoi.name,
    description: incoming.description ?? basePoi.description,
    address: incoming.address ?? basePoi.address,
    municipality: incoming.municipality ?? basePoi.municipality,
    province: incoming.province ?? basePoi.province,
    lat: incoming.lat ?? basePoi.lat,
    lng: incoming.lng ?? basePoi.lng,
    category_id: categoryId,
    rating: incoming.rating ?? basePoi.rating ?? null,
    total_reviews: incoming.total_reviews ?? basePoi.total_reviews ?? 0,
    phone: incoming.phone ?? basePoi.phone ?? null,
    website: incoming.website ?? basePoi.website ?? null,
    google_maps_url: incoming.google_maps_url ?? basePoi.google_maps_url ?? null,
    slug: incoming.slug ?? basePoi.slug,
    operating_hours: operatingHours,
    tags: incoming.tags ?? basePoi.tags ?? [],
    is_active: incoming.is_active ?? basePoi.is_active ?? true,
    images: incomingImages.length > 0 ? incomingImages : basePoi.images,
    videoUrl: incoming.videoUrl ?? basePoi.videoUrl ?? null,
    sphereColor: incoming.sphereColor || category.sphereColor || basePoi.sphereColor,
    sphereEmissive: incoming.sphereEmissive || category.sphereEmissive || basePoi.sphereEmissive,
    proximityRadius: incoming.proximityRadius || category.proximityRadius || basePoi.proximityRadius,
    hours: incoming.hours || formatOperatingHours(operatingHours) || basePoi.hours,
  }
}

/**
 * Fetches place documents from the Firestore "pois" collection.
 * Uses the media-backed static POIS as the base catalog and overlays matching
 * Firestore fields when they become available.
 *
 * Unknown Firestore docs are ignored so older place records do not reappear
 * after the catalog has been curated locally.
 *
 * Expected Firestore document shape:
 *   { google_place_id, name, description, lat, lng, category_id, rating,
 *     total_reviews, phone, website, google_maps_url, slug, address,
 *     municipality, province, operating_hours[], tags[], is_active }
 */
export function usePOIsFromFirestore() {
  const [pois, setPois] = useState(POIS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'pois'))
      .then((snap) => {
        if (!snap.empty) {
          const nextPois = POIS.map((poi) => ({ ...poi }))
          const lookup = buildPoiLookup(nextPois)

          snap.docs.forEach((doc) => {
            const data = doc.data()
            const matchIndex = [
              data.slug,
              data.google_place_id,
              data.id,
              doc.id,
              data.name,
            ]
              .map((value) => lookup.get(normalizePoiKey(value)))
              .find((index) => index != null)

            if (matchIndex == null) {
              return
            }

            nextPois[matchIndex] = mergePoiData(nextPois[matchIndex], data, doc.id)
          })

          setPois(nextPois)
        }
        // If empty: keep the curated static POIS fallback already in state
      })
      .catch((err) => {
        console.warn('[usePOIsFromFirestore] Could not reach Firestore, using static data:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  return { pois, loading }
}
