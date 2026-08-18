import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/ui/AppShell'
import MapCanvas from '../components/ui/MapCanvas'
import MediaViewer from '../components/ui/MediaViewer'
import {
  IconAR,
  IconClock,
  IconGlobe,
  IconImages,
  IconNavigate,
  IconPhone,
  IconPin,
  IconPlay,
  IconStar,
} from '../components/ui/Icons'
import { usePlace } from '../hooks/usePlaces'
import {
  categoryAccent,
  categoryLabel,
  directionsUrl,
  formatDistance,
  getCategoryForPlace,
  getMediaItems,
  getOpenStatus,
  parseVideoSource,
} from '../lib/places'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const GALLERY_PREVIEW = 6

function WeeklyHours({ hours }) {
  const today = new Date().getDay()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      {[...hours]
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map((day) => (
          <div
            key={day.day_of_week}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: day.day_of_week === today ? 'var(--c-text)' : 'var(--c-text-dim)',
              fontWeight: day.day_of_week === today ? 700 : 500,
            }}
          >
            <span>{DAYS[day.day_of_week]}</span>
            <span>
              {day.is_closed
                ? 'Closed'
                : day.open_time && day.close_time
                  ? `${day.open_time} – ${day.close_time}`
                  : 'Open 24 hours'}
            </span>
          </div>
        ))}
    </div>
  )
}

export default function PlaceDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { place, loading } = usePlace(slug)
  const [viewerIndex, setViewerIndex] = useState(null)
  const [showHours, setShowHours] = useState(false)

  if (!place) {
    return (
      <AppShell title={loading ? 'Loading…' : 'Not found'} back>
        {loading ? (
          <div className="place-list">
            <div className="skeleton" style={{ height: 180 }} />
            <div className="skeleton" style={{ height: 90 }} />
            <div className="skeleton" style={{ height: 90 }} />
          </div>
        ) : (
          <div className="empty">
            <span className="empty__title">We couldn&apos;t find that place</span>
            <span className="empty__text">It may have been removed from the catalog.</span>
            <button type="button" className="btn btn--sm" onClick={() => navigate('/places')}>
              Browse all places
            </button>
          </div>
        )}
      </AppShell>
    )
  }

  const media = getMediaItems(place)
  const images = place.images ?? []
  const video = parseVideoSource(place.videoUrl)
  const status = getOpenStatus(place)
  const distance = formatDistance(place.distance)
  const directions = directionsUrl(place)
  const accent = categoryAccent(place.category_id)
  const category = getCategoryForPlace(place.category_id)
  const hero = images[0]

  const preview = media.slice(0, GALLERY_PREVIEW)
  const remaining = media.length - preview.length

  return (
    <AppShell back floatBar padded={false}>
      <button
        type="button"
        className="detail__hero"
        aria-label={media.length > 0 ? `Open photos of ${place.name}` : place.name}
        onClick={() => media.length > 0 && setViewerIndex(media.findIndex((m) => m.type === 'image') || 0)}
      >
        {hero ? (
          <img src={hero} alt={place.name} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3.5rem',
              background: `linear-gradient(160deg, ${accent}33, var(--c-bg-soft))`,
            }}
          >
            {category.icon}
          </div>
        )}
        <span className="detail__hero-fade" />
        {media.length > 0 && (
          <span className="detail__hero-cue">
            <IconImages style={{ width: 14, height: 14 }} />
            {media.length}
          </span>
        )}
      </button>

      <div className="detail__body">
        <span className="badge badge--cat" style={{ '--badge-accent': accent }}>
          {categoryLabel(place.category_id)}
        </span>

        <h1 className="detail__title">{place.name}</h1>

        <div className="detail__meta">
          {status.state !== 'unknown' && (
            <span className={`badge ${status.state === 'open' ? 'badge--open' : 'badge--closed'}`}>
              {status.state === 'open' ? 'Open now' : 'Closed'}
            </span>
          )}
          {place.rating != null && place.rating > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconStar style={{ width: 13, height: 13, color: 'var(--c-warn)' }} />
              {place.rating}
              {place.total_reviews > 0 && (
                <span style={{ color: 'var(--c-text-faint)' }}>({place.total_reviews})</span>
              )}
            </span>
          )}
          {distance && <span>{distance} away</span>}
          {place.municipality && <span>{place.municipality}</span>}
        </div>

        <div className="btn-row" style={{ marginBottom: 20 }}>
          {directions && (
            <a className="btn btn--solid" href={directions} target="_blank" rel="noreferrer">
              <IconNavigate />
              Directions
            </a>
          )}
          <button type="button" className="btn" onClick={() => navigate(`/map?place=${place.id}`)}>
            <IconPin />
            On map
          </button>
          <button type="button" className="btn" onClick={() => navigate('/ar')}>
            <IconAR />
            AR view
          </button>
        </div>

        {place.description && <p className="detail__text">{place.description}</p>}

        {place.tags?.length > 0 && (
          <div className="chips" style={{ marginBottom: 22, flexWrap: 'wrap' }}>
            {place.tags.map((tag) => (
              <span key={tag} className="chip" style={{ cursor: 'default' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {media.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Photos &amp; video</h2>
              <button type="button" className="section__link" onClick={() => setViewerIndex(0)}>
                View all
              </button>
            </div>

            <div className="gallery">
              {preview.map((item, i) => (
                <button
                  type="button"
                  key={`${item.src}-${i}`}
                  className="gallery__cell"
                  aria-label={item.type === 'video' ? 'Play video' : `Open photo ${i + 1}`}
                  onClick={() => setViewerIndex(i)}
                >
                  {item.type === 'video' ? (
                    <>
                      {item.poster && <img src={item.poster} alt="" loading="lazy" />}
                      <span className="gallery__play">
                        <IconPlay style={{ width: 26, height: 26 }} />
                      </span>
                    </>
                  ) : (
                    <img src={item.src} alt="" loading="lazy" />
                  )}

                  {i === preview.length - 1 && remaining > 0 && (
                    <span className="gallery__more">+{remaining}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {video?.kind === 'link' && (
          <a
            className="btn btn--block"
            style={{ marginBottom: 22 }}
            href={video.src}
            target="_blank"
            rel="noreferrer"
          >
            <IconPlay />
            Watch video
          </a>
        )}

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 12 }}>
            Details
          </h2>

          <div className="info-list">
            {place.address && (
              <div className="info-row">
                <IconPin />
                <span>
                  <span className="info-row__label">Address</span>
                  <span className="info-row__value">{place.address}</span>
                </span>
              </div>
            )}

            <button
              type="button"
              className="info-row"
              onClick={() => setShowHours((open) => !open)}
              aria-expanded={showHours}
            >
              <IconClock />
              <span style={{ flex: 1 }}>
                <span className="info-row__label">Hours</span>
                <span className="info-row__value">{status.label}</span>
                {showHours && place.operating_hours?.length > 0 && (
                  <WeeklyHours hours={place.operating_hours} />
                )}
              </span>
            </button>

            {place.phone && (
              <a className="info-row" href={`tel:${place.phone.replace(/\s+/g, '')}`}>
                <IconPhone />
                <span>
                  <span className="info-row__label">Phone</span>
                  <span className="info-row__value">{place.phone}</span>
                </span>
              </a>
            )}

            {place.website && (
              <a className="info-row" href={place.website} target="_blank" rel="noreferrer">
                <IconGlobe />
                <span>
                  <span className="info-row__label">Website</span>
                  <span className="info-row__value">{place.website}</span>
                </span>
              </a>
            )}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 12 }}>
            Location
          </h2>
          <MapCanvas
            className="map--static"
            places={[place]}
            selectedId={place.id}
            center={{ lat: place.lat, lng: place.lng }}
            zoom={15}
            autoFit={false}
            interactive={false}
            showControls={false}
            onClick={() => navigate(`/map?place=${place.id}`)}
          />
          {directions && (
            <a
              className="btn btn--block"
              style={{ marginTop: 12 }}
              href={directions}
              target="_blank"
              rel="noreferrer"
            >
              <IconNavigate />
              Get directions
            </a>
          )}
        </section>
      </div>

      {viewerIndex !== null && (
        <MediaViewer
          items={media}
          startIndex={Math.max(viewerIndex, 0)}
          title={place.name}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </AppShell>
  )
}
