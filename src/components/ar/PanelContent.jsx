import { useState, useRef } from 'react'

export default function PanelContent({ type, poi }) {
  if (type === 'overview') return <OverviewPanel poi={poi} />
  if (type === 'gallery')  return <GalleryPanel poi={poi} />
  if (type === 'details')  return <DetailsPanel poi={poi} />
  return null
}

// ─── Overview Panel ──────────────────────────────────────────────────

function OverviewPanel({ poi }) {
  return (
    <div style={{ ...panel.wrap, padding: '12px', overflowY: 'auto' }}>
      {/* Category badge */}
      <div style={{ ...panel.categoryBadge, borderColor: poi.sphereColor, color: poi.sphereColor }}>
        {poi.category}
      </div>

      {/* Hero image */}
      {poi.images?.[0] && (
        <img
          src={poi.images[0]}
          alt={poi.name}
          style={panel.heroImg}
          draggable={false}
        />
      )}

      {/* Name */}
      <h2 style={panel.title}>{poi.name}</h2>

      {/* Description */}
      <p style={panel.description}>{poi.description}</p>

      {/* Related activities */}
      {poi.relatedActivities?.length > 0 && (
        <div style={panel.tagsRow}>
          {poi.relatedActivities.map((activity) => (
            <span key={activity} style={panel.tag}>{activity}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Gallery / Media Panel ───────────────────────────────────────────

function FacebookIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="12" stroke="white" strokeWidth="1.4" />
      <path d="M14.5 9.2h-1.6a.4.4 0 0 0-.4.4V11H11v2.2h1.5V19h2.2v-5.8h1.6l.4-2.2H14.5V9.2z" fill="white" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="12" stroke="white" strokeWidth="1.4" />
      <path d="M18 9c-.5.2-1.1.4-1.7.5.6-.4 1.1-1 1.3-1.7-.6.3-1.2.6-1.8.7a2.8 2.8 0 0 0-4.8 2.6c-2.3-.1-4.4-1.2-5.7-3-.3.4-.4 1-.4 1.5 0 1 .5 1.9 1.3 2.4-.4 0-.9-.1-1.3-.4v.1c0 1.4 1 2.6 2.3 2.9-.2.1-.5.1-.8.1l-.5-.1c.4 1.1 1.4 2 2.6 2-.9.8-2.2 1.2-3.4 1.2H5c1.2.8 2.7 1.2 4.2 1.2 5 0 7.8-4.2 7.8-7.8v-.4c.5-.4 1-.9 1.4-1.4l-.4.1z" fill="white" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="white" strokeWidth="1.4">
      <rect x="4" y="4" width="18" height="18" rx="5" />
      <circle cx="13" cy="13" r="4.2" />
      <circle cx="18.5" cy="7.5" r="1.1" fill="white" stroke="none" />
    </svg>
  )
}

function GalleryPanel({ poi }) {
  const images = poi.images || []
  const count = images.length
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(null)

  const next = () => setCurrent(i => (i + 1) % count)
  const prev = () => setCurrent(i => (i - 1 + count) % count)
  const nextIdx = (current + 1) % count

  const handleWheel = (e) => {
    e.stopPropagation()
    if (e.deltaX > 10 || e.deltaY > 10) next()
    else if (e.deltaX < -10 || e.deltaY < -10) prev()
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 30) next()
    else if (diff < -30) prev()
    touchStartX.current = null
  }

  return (
    <div style={{ ...panel.wrap, padding: '12px 12px 10px', overflow: 'hidden' }}>
      <h2 style={panel.mediaTitle}>Media</h2>

      {/* Social icons */}
      <div style={panel.socialRow}>
        <FacebookIcon />
        <TwitterIcon />
        <InstagramIcon />
      </div>

      {/* Carousel */}
      {count > 0 && (
        <div
          style={panel.carousel}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            key={current}
            src={images[current]}
            alt=""
            style={panel.carouselMain}
            draggable={false}
          />
          {count > 1 && (
            <img
              key={nextIdx + '-peek'}
              src={images[nextIdx]}
              alt=""
              style={panel.carouselPeek}
              draggable={false}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Details Panel ───────────────────────────────────────────────────

function DetailsPanel({ poi }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`

  return (
    <div style={{ ...panel.wrap, padding: '12px', overflowY: 'auto' }}>
      <h2 style={panel.title}>Details</h2>

      {/* Hours */}
      {poi.hours && (
        <div style={panel.detailRow}>
          <span style={panel.detailLabel}>Hours</span>
          <span style={panel.detailValue}>{poi.hours}</span>
        </div>
      )}

      {/* Coordinates */}
      <div style={panel.detailRow}>
        <span style={panel.detailLabel}>Location</span>
        <span style={panel.detailValue}>{poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}</span>
      </div>

      {/* Category */}
      <div style={panel.detailRow}>
        <span style={panel.detailLabel}>Category</span>
        <span style={panel.detailValue}>{poi.category}</span>
      </div>

      {/* Tips */}
      {poi.tips && (
        <div style={{ marginTop: '12px' }}>
          <span style={panel.detailLabel}>Tips</span>
          <p style={{ ...panel.description, marginTop: '4px' }}>{poi.tips}</p>
        </div>
      )}

      {/* Directions button */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={panel.directionsBtn}
        onClick={(e) => e.stopPropagation()}
      >
        Get Directions
      </a>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────

const panel = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#fff',
    letterSpacing: '0.02em',
  },
  description: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.5,
    margin: 0,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    padding: '3px 10px',
    borderRadius: '999px',
    border: '1px solid',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.6rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '10px',
  },
  heroImg: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '10px',
  },
  tag: {
    padding: '3px 8px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.2)',
    borderRadius: '6px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.58rem',
    fontWeight: 600,
    color: '#00ffcc',
  },
  mediaTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 8px',
    letterSpacing: '-0.01em',
  },
  socialRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '14px',
  },
  carousel: {
    flex: 1,
    display: 'flex',
    gap: '8px',
    overflow: 'hidden',
    alignItems: 'flex-start',
    touchAction: 'pan-x',
    cursor: 'grab',
  },
  carouselMain: {
    width: '68%',
    height: '210px',
    objectFit: 'cover',
    borderRadius: '14px',
    flexShrink: 0,
  },
  carouselPeek: {
    width: '30%',
    height: '185px',
    objectFit: 'cover',
    borderRadius: '14px',
    flexShrink: 0,
    alignSelf: 'flex-end',
    opacity: 0.85,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  detailLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.65rem',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  detailValue: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.7rem',
    fontWeight: 500,
    color: '#fff',
    textAlign: 'right',
  },
  directionsBtn: {
    display: 'block',
    marginTop: '16px',
    padding: '10px',
    background: 'rgba(0, 255, 204, 0.15)',
    border: '1px solid rgba(0, 255, 204, 0.3)',
    borderRadius: '10px',
    color: '#00ffcc',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 700,
    textAlign: 'center',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  },
}
