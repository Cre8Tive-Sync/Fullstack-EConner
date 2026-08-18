// Shared, UI-agnostic helpers for working with place (POI) records.
// The AR feature and the generic UI both read the same catalog, so anything
// that formats or derives values from a place lives here.

import { CATEGORIES, getCategoryForPlace } from '../components/ar/data/pois'

export { CATEGORIES, getCategoryForPlace }

/** Accent colour for a category — falls back to the app accent. */
export function categoryAccent(categoryId) {
  return getCategoryForPlace(categoryId)?.sphereColor || '#00ffcc'
}

export function categoryLabel(categoryId) {
  return getCategoryForPlace(categoryId)?.label || 'Destination'
}

/** 480 → "480 m", 2400 → "2.4 km" */
export function formatDistance(meters) {
  if (meters == null || !Number.isFinite(meters)) return null
  if (meters < 1000) return `${Math.round(meters)} m`
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters / 1000)} km`
}

// ─── Media ───────────────────────────────────────────────────────────

const VIDEO_FILE = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i

/**
 * Works out how a video URL should be presented.
 * Returns { kind: 'file' | 'embed' | 'link', src }.
 */
export function parseVideoSource(url) {
  if (!url) return null

  if (VIDEO_FILE.test(url) || url.startsWith('/')) {
    return { kind: 'file', src: url }
  }

  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i)
  if (youtube) {
    return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}` }
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) {
    return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}` }
  }

  if (/facebook\.com|fb\.watch/i.test(url)) {
    return {
      kind: 'embed',
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    }
  }

  return { kind: 'link', src: url }
}

/**
 * Flattens a place's images + video into one ordered list the media viewer
 * can page through: [{ type, src, poster, kind }].
 */
export function getMediaItems(poi) {
  if (!poi) return []

  const items = (poi.images || []).filter(Boolean).map((src) => ({ type: 'image', src }))
  const video = parseVideoSource(poi.videoUrl)

  if (video && video.kind !== 'link') {
    items.unshift({
      type: 'video',
      src: video.src,
      kind: video.kind,
      poster: poi.images?.[0] || null,
    })
  }

  return items
}

// ─── Opening hours ───────────────────────────────────────────────────

function toMinutes(time) {
  if (!time) return null
  const [h, m] = String(time).split(':')
  const hours = Number(h)
  const mins = Number(m ?? 0)
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null
  return hours * 60 + mins
}

/**
 * Derives an "Open now" / "Closed" state from operating_hours.
 * Returns { state: 'open' | 'closed' | 'unknown', label }.
 */
export function getOpenStatus(poi, now = new Date()) {
  const hours = poi?.operating_hours
  if (!Array.isArray(hours) || hours.length === 0) {
    return { state: 'unknown', label: poi?.hours || 'Hours not listed' }
  }

  const today = hours.find((d) => d.day_of_week === now.getDay())
  if (!today || today.is_closed) {
    return { state: 'closed', label: 'Closed today' }
  }

  const open = toMinutes(today.open_time)
  const close = toMinutes(today.close_time)

  // No times recorded but not flagged closed → treated as always open.
  if (open == null || close == null) {
    return { state: 'open', label: 'Open 24 hours' }
  }

  const minutes = now.getHours() * 60 + now.getMinutes()
  // Ranges that run past midnight (e.g. 18:00–02:00) wrap around.
  const isOpen = close > open
    ? minutes >= open && minutes < close
    : minutes >= open || minutes < close

  return {
    state: isOpen ? 'open' : 'closed',
    label: isOpen
      ? `Open until ${today.close_time}`
      : `Closed · opens ${today.open_time}`,
  }
}

// ─── Links + search ──────────────────────────────────────────────────

/** Deep link that opens turn-by-turn directions in the device's map app. */
export function directionsUrl(poi) {
  if (!poi) return null
  if (poi.google_maps_url) return poi.google_maps_url
  if (poi.lat != null && poi.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`
  }
  return null
}

export function placePath(poi) {
  return `/place/${encodeURIComponent(poi.slug || poi.id)}`
}

export function matchesQuery(poi, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return [
    poi.name,
    poi.description,
    poi.address,
    poi.municipality,
    categoryLabel(poi.category_id),
    ...(poi.tags || []),
  ]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(q))
}

/** Places worth showing on the home screen — real data first, then the rest. */
export function isCurated(poi) {
  return !(poi.tags || []).includes('placeholder')
}
