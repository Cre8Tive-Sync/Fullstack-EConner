import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../firebaseConfig'
import { POIS, getCategoryForPlace, formatOperatingHours } from '../data/pois'

/**
 * Fetches place documents from the Firestore "pois" collection.
 * Falls back to the static POIS if the collection is empty or unreachable.
 *
 * Firestore docs are enriched with AR-required fields from their category:
 *   sphereColor, sphereEmissive, proximityRadius, images, hours
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
          const docs = snap.docs.map((d) => {
            const data = d.data()
            const cat = getCategoryForPlace(data.category_id)
            return {
              id: data.google_place_id || d.id,
              google_place_id: data.google_place_id,
              name: data.name,
              description: data.description,
              address: data.address,
              municipality: data.municipality,
              province: data.province,
              lat: data.lat,
              lng: data.lng,
              category_id: data.category_id,
              rating: data.rating ?? null,
              total_reviews: data.total_reviews ?? 0,
              phone: data.phone ?? null,
              website: data.website ?? null,
              google_maps_url: data.google_maps_url ?? null,
              slug: data.slug,
              operating_hours: data.operating_hours ?? [],
              tags: data.tags ?? [],
              is_active: data.is_active ?? true,
              // AR-enriched fields from category
              images: data.images || [
                `https://picsum.photos/seed/${data.slug || d.id}-1/400/300`,
                `https://picsum.photos/seed/${data.slug || d.id}-2/400/300`,
              ],
              videoUrl: data.videoUrl ?? null,
              sphereColor: data.sphereColor || cat.sphereColor,
              sphereEmissive: data.sphereEmissive || cat.sphereEmissive,
              proximityRadius: data.proximityRadius || cat.proximityRadius,
              hours: data.hours || formatOperatingHours(data.operating_hours),
            }
          })
          setPois(docs)
        }
        // If empty: keep the static POIS fallback already in state
      })
      .catch((err) => {
        console.warn('[usePOIsFromFirestore] Could not reach Firestore, using static data:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  return { pois, loading }
}