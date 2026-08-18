import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../components/ui/AppShell'
import CategoryChips from '../components/ui/CategoryChips'
import MapCanvas from '../components/ui/MapCanvas'
import { PlaceRailCard } from '../components/ui/PlaceCard'
import { IconClose, IconGrid, IconNavigate } from '../components/ui/Icons'
import { usePlaceList } from '../hooks/usePlaces'
import { useUserLocation } from '../hooks/useUserLocation'
import {
  categoryAccent,
  categoryLabel,
  directionsUrl,
  formatDistance,
  getOpenStatus,
  placePath,
} from '../lib/places'

/** Card that slides up when a destination is picked on the map. */
function SelectedCard({ place, onClose }) {
  const navigate = useNavigate()
  const status = getOpenStatus(place)
  const distance = formatDistance(place.distance)
  const directions = directionsUrl(place)

  return (
    <div className="sheet sheet--inline">
      <div style={{ display: 'flex', gap: 12 }}>
        {place.images?.[0] && (
          <img className="place-card__thumb" src={place.images[0]} alt="" style={{ width: 72, height: 72 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="place-card__title" style={{ fontSize: '1rem' }}>
            {place.name}
          </h2>
          <div className="place-card__meta" style={{ marginTop: 4 }}>
            <span style={{ color: categoryAccent(place.category_id) }}>
              {categoryLabel(place.category_id)}
            </span>
            {distance && <span className="dot-sep">{distance}</span>}
            {status.state !== 'unknown' && (
              <span className={`badge ${status.state === 'open' ? 'badge--open' : 'badge--closed'}`}>
                {status.state === 'open' ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="btn btn--icon btn--ghost" aria-label="Close" onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <div className="btn-row" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn btn--sm btn--solid"
          style={{ flex: 1 }}
          onClick={() => navigate(placePath(place))}
        >
          View details
        </button>
        {directions && (
          <a className="btn btn--sm" href={directions} target="_blank" rel="noreferrer">
            <IconNavigate />
            Directions
          </a>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const categoryId = params.get('category')
  const focusId = params.get('place')

  const { results } = usePlaceList({ categoryId })
  const { coords, isReady, request, status } = useUserLocation()

  const [selected, setSelected] = useState(null)
  const [center, setCenter] = useState(null)
  const awaitingFix = useRef(false)

  // Deep link: /map?place=<id>
  useEffect(() => {
    if (!focusId) return
    const match = results.find((place) => place.id === focusId || place.slug === focusId)
    if (match) setSelected(match)
  }, [focusId, results])

  // Drop a selection that is filtered out of the current category
  useEffect(() => {
    if (selected && !results.some((place) => place.id === selected.id)) setSelected(null)
  }, [results, selected])

  const handleLocate = useCallback(() => {
    if (isReady && coords) {
      setCenter({ lat: coords.latitude, lng: coords.longitude })
    } else {
      awaitingFix.current = true
      request()
    }
  }, [isReady, coords, request])

  // Only jump to the user when they asked for it — otherwise the map keeps
  // showing every destination, which is the more useful default.
  useEffect(() => {
    if (awaitingFix.current && status === 'ready' && coords) {
      awaitingFix.current = false
      setCenter({ lat: coords.latitude, lng: coords.longitude })
    }
  }, [status, coords])

  return (
    <AppShell flush>
      <MapCanvas
        className="map--page"
        places={results}
        selectedId={selected?.id ?? null}
        onSelectPlace={setSelected}
        onClick={() => setSelected(null)}
        onLocate={handleLocate}
        userCoords={coords}
        center={center}
        autoFit={!focusId}
        controlsPosition="top"
      />

      <div className="map-overlay-top">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CategoryChips
              value={categoryId}
              onChange={(id) => {
                const next = new URLSearchParams(params)
                if (id) next.set('category', id)
                else next.delete('category')
                next.delete('place')
                setParams(next, { replace: true })
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Show as list"
            style={{ background: 'rgba(10,13,18,0.85)' }}
            onClick={() => navigate(categoryId ? `/places?category=${categoryId}` : '/places')}
          >
            <IconGrid />
          </button>
        </div>
      </div>

      <div className="map-overlay-bottom">
        {selected ? (
          <SelectedCard place={selected} onClose={() => setSelected(null)} />
        ) : results.length > 0 ? (
          <div className="rail" style={{ margin: 0, padding: '0 12px 4px' }}>
            {results.map((place) => (
              <PlaceRailCard
                key={place.id}
                place={place}
                onClick={() => setSelected(place)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
