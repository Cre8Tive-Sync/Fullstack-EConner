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
  const busy = useRef(false)

  const navigate = (dir) => {
    if (busy.current || count < 2) return
    busy.current = true
    setCurrent(i => (i + dir + count) % count)
    setTimeout(() => { busy.current = false }, 400)
  }

  const handleWheel = (e) => {
    e.stopPropagation()
    if (e.deltaX > 15 || e.deltaY > 15) navigate(1)
    else if (e.deltaX < -15 || e.deltaY < -15) navigate(-1)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 30) navigate(1)
    else if (diff < -30) navigate(-1)
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

      {/* Carousel viewport */}
      {count > 0 && (
        <div
          style={panel.carouselViewport}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Sliding track — each card is 185px, gap 8px, so next card peeks ~43px */}
          <div
            style={{
              ...panel.carouselTrack,
              transform: `translateX(${-current * 193}px)`,
            }}
          >
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                style={panel.carouselImg}
                draggable={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Details Panel ───────────────────────────────────────────────────

function DetailsPanel({ poi }) {
  return (
    <div style={{ ...panel.wrap, padding: '14px', overflowY: 'auto' }}>
      {/* POI name */}
      <h1 style={panel.locationTitle}>{poi.name}</h1>

      {/* Category badges */}
      {poi.relatedActivities?.length > 0 && (
        <div style={panel.badgeRow}>
          {poi.relatedActivities.map((act) => (
            <span key={act} style={panel.badge}>{act}</span>
          ))}
        </div>
      )}

      {/* Description */}
      <p style={panel.locationDesc}>{poi.description}</p>
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
  carouselViewport: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: '14px',
    touchAction: 'pan-x',
    cursor: 'grab',
  },
  carouselTrack: {
    display: 'flex',
    gap: '8px',
    transition: 'transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform',
  },
  carouselImg: {
    width: '185px',
    height: '210px',
    objectFit: 'cover',
    borderRadius: '14px',
    flexShrink: 0,
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
  locationTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 10px',
    lineHeight: 1.15,
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '14px',
  },
  badge: {
    padding: '5px 14px',
    border: '1.5px solid rgba(255,255,255,0.65)',
    borderRadius: '999px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#fff',
  },
  locationDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    color: '#fff',
    lineHeight: 1.65,
    margin: 0,
  },
}
