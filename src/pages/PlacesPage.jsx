import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../components/ui/AppShell'
import CategoryChips from '../components/ui/CategoryChips'
import { PlaceCard } from '../components/ui/PlaceCard'
import { IconClose, IconSearch } from '../components/ui/Icons'
import { usePlaceList, usePlaces } from '../hooks/usePlaces'
import { useUserLocation } from '../hooks/useUserLocation'
import { categoryLabel, placePath } from '../lib/places'

export default function PlacesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef(null)

  const query = params.get('q') ?? ''
  const categoryId = params.get('category')
  const sort = params.get('sort') ?? 'auto'

  const { places } = usePlaces()
  const { results, loading } = usePlaceList({ query, categoryId, sort })
  const { isReady, request, status } = useUserLocation()

  const counts = useMemo(() => {
    const map = {}
    places.forEach((place) => {
      map[place.category_id] = (map[place.category_id] ?? 0) + 1
    })
    return map
  }, [places])

  // Arriving from the home search box: focus straight away (mount only)
  useEffect(() => {
    if (params.get('focus')) inputRef.current?.focus()
  }, [params])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    })
    next.delete('focus')
    setParams(next, { replace: true })
  }

  const sortByDistance = sort === 'distance' || (sort === 'auto' && isReady)

  return (
    <AppShell title={categoryId ? categoryLabel(categoryId) : 'Places'}>
      <div className="search" style={{ marginBottom: 12 }}>
        <IconSearch />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search destinations, food, farms…"
          aria-label="Search places"
          onChange={(e) => update({ q: e.target.value })}
        />
        {query && (
          <button type="button" className="search__clear" aria-label="Clear search" onClick={() => update({ q: null })}>
            <IconClose style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <CategoryChips value={categoryId} counts={counts} onChange={(id) => update({ category: id })} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--c-text-faint)', fontWeight: 600 }}>
          {loading && results.length === 0
            ? 'Loading…'
            : `${results.length} ${results.length === 1 ? 'place' : 'places'}`}
        </span>

        <div className="btn-row">
          <button
            type="button"
            className={`btn btn--sm${sortByDistance ? ' btn--primary' : ''}`}
            onClick={() => {
              if (!isReady) request()
              update({ sort: 'distance' })
            }}
          >
            Nearest
          </button>
          <button
            type="button"
            className={`btn btn--sm${!sortByDistance ? ' btn--primary' : ''}`}
            onClick={() => update({ sort: 'name' })}
          >
            A–Z
          </button>
        </div>
      </div>

      {sort === 'distance' && !isReady && status !== 'denied' && (
        <p className="section__sub">Waiting for your location…</p>
      )}
      {sort === 'distance' && status === 'denied' && (
        <p className="section__sub">Location is blocked, so places are listed alphabetically.</p>
      )}

      {results.length === 0 && !loading ? (
        <div className="empty">
          <span className="empty__title">Nothing found</span>
          <span className="empty__text">
            Try a different search term or clear the category filter.
          </span>
          <button type="button" className="btn btn--sm" onClick={() => update({ q: null, category: null })}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className="place-list">
          {results.map((place) => (
            <PlaceCard key={place.id} place={place} onClick={() => navigate(placePath(place))} />
          ))}
        </div>
      )}
    </AppShell>
  )
}
