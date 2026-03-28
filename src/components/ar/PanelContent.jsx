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

// ─── Gallery Panel ───────────────────────────────────────────────────

function GalleryPanel({ poi }) {
  return (
    <div style={{ ...panel.wrap, padding: '12px', overflowY: 'auto', gap: '10px' }}>
      <h2 style={panel.title}>Gallery</h2>

      {/* Video if available */}
      {poi.videoUrl && (
        <video
          src={poi.videoUrl}
          controls
          playsInline
          style={panel.video}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Images */}
      {poi.images?.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${poi.name} ${i + 1}`}
          style={panel.galleryImg}
          draggable={false}
        />
      ))}
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
  video: {
    width: '100%',
    borderRadius: '10px',
    maxHeight: '140px',
    objectFit: 'cover',
  },
  galleryImg: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '10px',
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
