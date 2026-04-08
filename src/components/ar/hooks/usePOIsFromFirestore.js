import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../firebaseConfig'
import { POIS } from '../data/pois'

/**
 * Fetches place documents from the Firestore "pois" collection.
 * Falls back to the static POIS if the collection is empty or unreachable.
 *
 * Expected Firestore document shape:
 *   { name, description, lat, lng, category, images[], hours, tips,
 *     relatedActivities[], sphereColor, sphereEmissive, proximityRadius }
 * category must match one of the CATEGORIES[].category keys.
 */
export function usePOIsFromFirestore() {
  const [pois, setPois] = useState(POIS)
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
