import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../firebaseConfig'
import { CATEGORY_POIS } from '../data/pois'

/**
 * Fetches POI documents from the Firestore "pois" collection.
 * Falls back to the static CATEGORY_POIS if the collection is empty or unreachable.
 *
 * Expected Firestore document shape matches the CATEGORY_POIS structure:
 *   { name, description, lat, lng, category, images[], hours, tips,
 *     relatedActivities[], sphereColor, sphereEmissive, proximityRadius }
 */
export function usePOIsFromFirestore() {
  const [pois, setPois] = useState(CATEGORY_POIS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'pois'))
      .then((snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          setPois(docs)
        }
        // If empty: keep the static CATEGORY_POIS fallback already in state
      })
      .catch((err) => {
        console.warn('[usePOIsFromFirestore] Could not reach Firestore, using static data:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  return { pois, loading }
}
