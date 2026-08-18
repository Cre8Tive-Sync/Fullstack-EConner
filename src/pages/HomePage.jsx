import { useNavigate } from 'react-router-dom'
import AppShell from '../components/ui/AppShell'
import MapCanvas from '../components/ui/MapCanvas'
import { PlaceRailCard } from '../components/ui/PlaceCard'
import { IconAR, IconChevronRight, IconMap, IconNavigate, IconSearch } from '../components/ui/Icons'
import { useCategories, usePlaceList } from '../hooks/usePlaces'
import { useUserLocation } from '../hooks/useUserLocation'
import { categoryAccent, isCurated, placePath } from '../lib/places'

export default function HomePage() {
  const navigate = useNavigate()
  const categories = useCategories()
  const { results, loading } = usePlaceList()
  const { isReady, status, request } = useUserLocation()

  const nearby = isReady ? results.slice(0, 8) : []
  // Places with real (non-placeholder) data, photos first — they make the
  // better first impression on the home screen.
  const featured = results
    .filter(isCurated)
    .sort((a, b) => (b.images?.length ? 1 : 0) - (a.images?.length ? 1 : 0))
    .slice(0, 8)
  const highlights = featured.length > 0 ? featured : results.slice(0, 8)

  return (
    <AppShell>
      <section className="hero fade-up">
        <p className="hero__eyebrow">Apayao · Philippines</p>
        <h1 className="hero__title">Discover Conner</h1>
        <p className="hero__text">
          Farms, waterfalls, local products and places to stay — browse them all, then find your way there.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--solid" onClick={() => navigate('/map')}>
            <IconMap />
            Open map
          </button>
          <button type="button" className="btn" onClick={() => navigate('/places')}>
            Browse places
          </button>
        </div>
      </section>

      <button
        type="button"
        className="search"
        style={{ marginBottom: 24, cursor: 'pointer' }}
        onClick={() => navigate('/places?focus=1')}
      >
        <IconSearch />
        <span style={{ flex: 1, textAlign: 'left', color: 'var(--c-text-faint)', fontSize: '0.9rem' }}>
          Search destinations, food, farms…
        </span>
      </button>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Categories</h2>
          <button type="button" className="section__link" onClick={() => navigate('/places')}>
            See all
          </button>
        </div>

        <div className="cat-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="cat-tile"
              style={{ '--tile-accent': categoryAccent(category.id) }}
              onClick={() => navigate(`/places?category=${category.id}`)}
            >
              <span className="cat-tile__icon" aria-hidden="true">
                {category.icon}
              </span>
              <span className="cat-tile__label">{category.label}</span>
              <span className="cat-tile__count">
                {category.count} {category.count === 1 ? 'place' : 'places'}
              </span>
            </button>
          ))}

          <button type="button" className="cat-tile cat-tile--wide" style={{ '--tile-accent': '#00ffcc' }} onClick={() => navigate('/ar')}>
            <span className="cat-tile__icon" aria-hidden="true">
              <IconAR style={{ width: 24, height: 24, color: 'var(--c-accent)' }} />
            </span>
            <span style={{ flex: 1 }}>
              <span className="cat-tile__label" style={{ display: 'block' }}>
                AR view
              </span>
              <span className="cat-tile__count">Point your camera and explore in 3D</span>
            </span>
            <IconChevronRight style={{ width: 18, height: 18, color: 'var(--c-text-faint)' }} />
          </button>
        </div>
      </section>

      {isReady ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Nearest to you</h2>
            <button type="button" className="section__link" onClick={() => navigate('/places?sort=distance')}>
              See all
            </button>
          </div>
          <div className="rail">
            {nearby.map((place) => (
              <PlaceRailCard key={place.id} place={place} onClick={() => navigate(placePath(place))} />
            ))}
          </div>
        </section>
      ) : (
        <section className="section">
          <div
            className="place-card"
            style={{ alignItems: 'center', cursor: 'default', padding: 16, gap: 14 }}
          >
            <IconNavigate style={{ width: 22, height: 22, color: 'var(--c-accent)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h3 className="place-card__title">Sort places by distance</h3>
              <p className="place-card__desc">
                {status === 'denied'
                  ? 'Location is blocked for this site — enable it in your browser settings.'
                  : 'Turn on location to see what is closest to you right now.'}
              </p>
            </div>
            {status !== 'denied' && (
              <button type="button" className="btn btn--sm btn--primary" onClick={request}>
                {status === 'locating' ? 'Locating…' : 'Enable'}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">{featured.length > 0 ? 'Featured' : 'All destinations'}</h2>
          <button type="button" className="section__link" onClick={() => navigate('/places')}>
            See all
          </button>
        </div>

        {loading && highlights.length === 0 ? (
          <div className="rail">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ width: 210, height: 188, flex: '0 0 auto' }} />
            ))}
          </div>
        ) : (
          <div className="rail">
            {highlights.map((place) => (
              <PlaceRailCard key={place.id} place={place} onClick={() => navigate(placePath(place))} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">All on one map</h2>
        </div>
        <p className="section__sub">Tap the map to see every destination and get directions.</p>
        <MapCanvas
          className="map--static"
          places={results}
          interactive={false}
          showControls={false}
          onClick={() => navigate('/map')}
        />
      </section>
    </AppShell>
  )
}
