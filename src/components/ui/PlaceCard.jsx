import {
  categoryAccent,
  categoryLabel,
  formatDistance,
  getCategoryForPlace,
  getOpenStatus,
} from '../../lib/places'
import { IconStar } from './Icons'

function Meta({ place }) {
  const distance = formatDistance(place.distance)
  const status = getOpenStatus(place)

  return (
    <div className="place-card__meta">
      <span style={{ color: categoryAccent(place.category_id) }}>{categoryLabel(place.category_id)}</span>
      {distance && <span className="dot-sep">{distance}</span>}
      {place.rating != null && place.rating > 0 && (
        <span className="dot-sep" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <IconStar style={{ width: 12, height: 12, color: 'var(--c-warn)' }} />
          {place.rating}
        </span>
      )}
      {status.state !== 'unknown' && (
        <span className={`badge ${status.state === 'open' ? 'badge--open' : 'badge--closed'}`}>
          {status.state === 'open' ? 'Open' : 'Closed'}
        </span>
      )}
    </div>
  )
}

/** Full-width row used in lists and search results. */
export function PlaceCard({ place, onClick }) {
  const image = place.images?.[0]
  const category = getCategoryForPlace(place.category_id)

  return (
    <button type="button" className="place-card" onClick={onClick}>
      {image ? (
        <img className="place-card__thumb" src={image} alt="" loading="lazy" />
      ) : (
        <div className="place-card__thumb place-card__thumb--empty" aria-hidden="true">
          {category.icon}
        </div>
      )}
      <div className="place-card__body">
        <h3 className="place-card__title">{place.name}</h3>
        <Meta place={place} />
        {place.address && <p className="place-card__desc">{place.address}</p>}
      </div>
    </button>
  )
}

/** Compact card used in horizontally scrolling rails. */
export function PlaceRailCard({ place, onClick }) {
  const image = place.images?.[0]
  const category = getCategoryForPlace(place.category_id)

  return (
    <button type="button" className="rail-card" onClick={onClick}>
      {image ? (
        <img className="rail-card__img" src={image} alt="" loading="lazy" />
      ) : (
        <div
          className="rail-card__img"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}
          aria-hidden="true"
        >
          {category.icon}
        </div>
      )}
      <div className="rail-card__body">
        <h3 className="place-card__title">{place.name}</h3>
        <Meta place={place} />
      </div>
    </button>
  )
}

export default PlaceCard
