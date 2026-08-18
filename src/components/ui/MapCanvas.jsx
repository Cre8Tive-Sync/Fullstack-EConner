import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { categoryAccent } from '../../lib/places'
import { IconCrosshair } from './Icons'

/**
 * A small slippy map with a destination overlay — no mapping library needed.
 *
 * Raster tiles come from OpenStreetMap; swap TILE_URL for a commercial
 * provider (MapTiler, Mapbox, Google) if usage ever outgrows the OSM tile
 * policy. Attribution must stay visible either way.
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_SIZE = 256
const MIN_ZOOM = 4
const MAX_ZOOM = 18

// Conner, Apayao — used until we know better (no places, no location).
export const DEFAULT_CENTER = { lat: 17.8172, lng: 121.2903 }

function project(lat, lng, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const clampedLat = Math.min(Math.max(lat, -85.05), 85.05)
  const s = Math.sin((clampedLat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  }
}

function unproject(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const n = Math.PI - 2 * Math.PI * (y / scale)
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (x / scale) * 360 - 180,
  }
}

const clampZoom = (z) => Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM)

/** Largest zoom at which every point still fits inside the viewport. */
function fitBounds(points, width, height, padding = 56) {
  if (points.length === 0 || width === 0 || height === 0) return null

  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  }

  if (points.length === 1) return { ...center, zoom: 15 }

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom--) {
    const corners = points.map((p) => project(p.lat, p.lng, zoom))
    const spanX = Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x))
    const spanY = Math.max(...corners.map((c) => c.y)) - Math.min(...corners.map((c) => c.y))
    if (spanX <= width - padding * 2 && spanY <= height - padding * 2) {
      return { ...center, zoom }
    }
  }

  return { ...center, zoom: MIN_ZOOM }
}

function Pin({ color }) {
  return (
    <svg className="map__pin" viewBox="0 0 26 34" aria-hidden="true">
      <path
        d="M13 33.5S24.5 21.6 24.5 13.4A11.5 11.5 0 0 0 1.5 13.4C1.5 21.6 13 33.5 13 33.5Z"
        fill={color}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="1.2"
      />
      <circle cx="13" cy="13" r="4.4" fill="rgba(0,0,0,0.55)" />
    </svg>
  )
}

export default function MapCanvas({
  places = [],
  selectedId = null,
  onSelectPlace,
  onLocate,
  userCoords = null,
  center,
  zoom: initialZoom,
  interactive = true,
  showLabels = false,
  showControls = true,
  controlsPosition = 'bottom',
  autoFit = true,
  className = '',
  onClick,
}) {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState(() => ({
    lat: center?.lat ?? DEFAULT_CENTER.lat,
    lng: center?.lng ?? DEFAULT_CENTER.lng,
    zoom: initialZoom ?? 13,
  }))
  const [dragging, setDragging] = useState(false)

  const pointers = useRef(new Map())
  const pinchStart = useRef(null)
  const dragMoved = useRef(0)
  const fittedTo = useRef(null)

  // Which destinations are on the map — distance updates from GPS change the
  // array identity every few seconds, so re-framing keys off the ids instead.
  const placeSignature = useMemo(() => places.map((place) => place.id).join('|'), [places])

  // Track container size
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Frame every destination once we have a size — and again whenever the set
  // of destinations itself changes (e.g. a category filter).
  useEffect(() => {
    if (!autoFit || size.width === 0 || places.length === 0) return
    if (fittedTo.current === placeSignature) return

    const next = fitBounds(places, size.width, size.height)
    if (next) {
      fittedTo.current = placeSignature
      setView(next)
    }
  }, [autoFit, places, placeSignature, size])

  // Follow the externally selected place
  useEffect(() => {
    if (!selectedId) return
    const target = places.find((p) => p.id === selectedId)
    if (target) {
      setView((v) => ({ lat: target.lat, lng: target.lng, zoom: Math.max(v.zoom, 15) }))
    }
  }, [selectedId, places])

  // Recentre whenever the parent hands us a new centre object. Identity —
  // not lat/lng — is the trigger, so "centre on me" works even when the
  // coordinates have not changed since the last press.
  useEffect(() => {
    if (!center) return
    setView((v) => ({ ...v, lat: center.lat, lng: center.lng }))
  }, [center])

  const geometry = useMemo(() => {
    const { width, height } = size
    const centerPx = project(view.lat, view.lng, view.zoom)
    return {
      originX: centerPx.x - width / 2,
      originY: centerPx.y - height / 2,
      width,
      height,
    }
  }, [size, view])

  const toScreen = useCallback(
    (lat, lng) => {
      const p = project(lat, lng, view.zoom)
      return { left: p.x - geometry.originX, top: p.y - geometry.originY }
    },
    [geometry, view.zoom]
  )

  const zoomBy = useCallback(
    (delta, anchorX, anchorY) => {
      setView((v) => {
        const nextZoom = clampZoom(v.zoom + delta)
        if (nextZoom === v.zoom) return v

        const { width, height } = size
        const ax = anchorX ?? width / 2
        const ay = anchorY ?? height / 2

        const centerPx = project(v.lat, v.lng, v.zoom)
        const anchorGeo = unproject(centerPx.x - width / 2 + ax, centerPx.y - height / 2 + ay, v.zoom)
        const anchorPx = project(anchorGeo.lat, anchorGeo.lng, nextZoom)
        const nextCenterPx = {
          x: anchorPx.x - (ax - width / 2),
          y: anchorPx.y - (ay - height / 2),
        }
        const nextCenter = unproject(nextCenterPx.x, nextCenterPx.y, nextZoom)

        return { ...nextCenter, zoom: nextZoom }
      })
    },
    [size]
  )

  const panBy = useCallback((dx, dy) => {
    setView((v) => {
      const centerPx = project(v.lat, v.lng, v.zoom)
      const next = unproject(centerPx.x - dx, centerPx.y - dy, v.zoom)
      return { ...next, zoom: v.zoom }
    })
  }, [])

  // ─── Pointer handling: drag to pan, two fingers to zoom ───────────

  const onPointerDown = (e) => {
    if (!interactive) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragMoved.current = 0

    if (pointers.current.size === 1) {
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom }
    }
  }

  const onPointerMove = (e) => {
    if (!interactive) return
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      dragMoved.current += Math.abs(dx) + Math.abs(dy)
      panBy(dx, dy)
      return
    }

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const ratio = distance / pinchStart.current.distance
      const steps = Math.round(Math.log2(ratio))

      if (steps !== 0) {
        const rect = ref.current.getBoundingClientRect()
        zoomBy(steps, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
        pinchStart.current = { distance, zoom: view.zoom }
      }
    }
  }

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) setDragging(false)
  }

  const onWheel = (e) => {
    if (!interactive) return
    const rect = ref.current.getBoundingClientRect()
    zoomBy(e.deltaY < 0 ? 1 : -1, e.clientX - rect.left, e.clientY - rect.top)
  }

  const handleClick = (e) => {
    // Ignore the click that ends a drag gesture
    if (dragMoved.current > 8) return
    onClick?.(e)
  }

  // ─── Tiles ────────────────────────────────────────────────────────

  const tiles = useMemo(() => {
    const { width, height, originX, originY } = geometry
    if (width === 0 || height === 0) return []

    const z = view.zoom
    const count = 2 ** z
    const list = []

    const minX = Math.floor(originX / TILE_SIZE)
    const maxX = Math.floor((originX + width) / TILE_SIZE)
    const minY = Math.max(Math.floor(originY / TILE_SIZE), 0)
    const maxY = Math.min(Math.floor((originY + height) / TILE_SIZE), count - 1)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const wrappedX = ((x % count) + count) % count
        list.push({
          key: `${z}/${x}/${y}`,
          url: TILE_URL.replace('{z}', z).replace('{x}', wrappedX).replace('{y}', y),
          left: x * TILE_SIZE - originX,
          top: y * TILE_SIZE - originY,
        })
      }
    }

    return list
  }, [geometry, view.zoom])

  const visibleMarkers = useMemo(() => {
    const { width, height } = geometry
    if (width === 0) return []

    return places
      .map((place) => ({ place, ...toScreen(place.lat, place.lng) }))
      .filter((m) => m.left > -80 && m.left < width + 80 && m.top > -80 && m.top < height + 80)
  }, [places, geometry, toScreen])

  const me = userCoords ? toScreen(userCoords.latitude, userCoords.longitude) : null

  return (
    <div
      ref={ref}
      className={`map${dragging ? ' map--dragging' : ''} ${className}`.trim()}
      style={interactive ? undefined : { cursor: onClick ? 'pointer' : 'default', touchAction: 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      onClick={handleClick}
      onDoubleClick={(e) => {
        if (!interactive) return
        const rect = ref.current.getBoundingClientRect()
        zoomBy(1, e.clientX - rect.left, e.clientY - rect.top)
      }}
    >
      <div className="map__tiles">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className="map__tile"
            src={tile.url}
            alt=""
            loading="lazy"
            draggable={false}
            style={{ left: tile.left, top: tile.top }}
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden'
            }}
          />
        ))}
      </div>

      {me && (
        <div className="map__me" style={{ left: me.left, top: me.top }} aria-label="Your location" />
      )}

      {visibleMarkers.map(({ place, left, top }) => (
        <button
          key={place.id}
          type="button"
          className={`map__marker${place.id === selectedId ? ' map__marker--active' : ''}`}
          style={{ left, top, zIndex: place.id === selectedId ? 3 : 2 }}
          aria-label={place.name}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onSelectPlace?.(place)
          }}
        >
          <Pin color={categoryAccent(place.category_id)} />
          {showLabels && <span className="map__marker-label">{place.name}</span>}
        </button>
      ))}

      {showControls && interactive && (
        <div className={`map__ctrls${controlsPosition === 'top' ? ' map__ctrls--top' : ''}`}>
          {onLocate && (
            <button type="button" className="map__ctrl" aria-label="Centre on my location" onClick={onLocate}>
              <IconCrosshair style={{ width: 19, height: 19 }} />
            </button>
          )}
          <button type="button" className="map__ctrl" aria-label="Zoom in" onClick={() => zoomBy(1)}>
            +
          </button>
          <button type="button" className="map__ctrl" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
            −
          </button>
        </div>
      )}

      <span className="map__attrib">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
      </span>
    </div>
  )
}
