import { useState } from 'react'

export default function PanelContent({ type, poi }) {
  if (type === 'gallery') return <GalleryPanel poi={poi} />
  if (type === 'info')    return <InfoPanel poi={poi} />
  if (type === 'video')   return <VideoPanel poi={poi} />
  return null
}

// --- Gallery Panel ---
const SAMPLE_IMAGES = [
  'https://picsum.photos/seed/ar1/400/300',
  'https://picsum.photos/seed/ar2/400/300',
  'https://picsum.photos/seed/ar3/400/300',
]

function GalleryPanel({ poi }) {
  const images = poi?.images?.length ? poi.images : SAMPLE_IMAGES
  const [current, setCurrent] = useState(0)

  const prev = (e) => {
    e.stopPropagation()
    setCurrent((c) => (c - 1 + images.length) % images.length)
  }

  const next = (e) => {
    e.stopPropagation()
    setCurrent((c) => (c + 1) % images.length)
  }

  return (
    <div style={panel.wrap}>
      <img
        src={images[current]}
        alt="gallery"
        style={panel.image}
        draggable={false}
      />

      {/* Swipe nav */}
      <div style={panel.navRow}>
        <button style={panel.navBtn} onClick={prev}>‹</button>
        <span style={panel.dots}>
          {images.map((_, i) => (
            <span
              key={i}
              style={{ ...panel.dot, opacity: i === current ? 1 : 0.3 }}
            />
          ))}
        </span>
        <button style={panel.navBtn} onClick={next}>›</button>
      </div>
    </div>
  )
}

// --- Info Panel ---
function InfoPanel({ poi }) {
  return (
    <div style={{ ...panel.wrap, padding: '16px', overflowY: 'auto' }}>
      <h2 style={panel.title}>{poi?.name || 'About This Object'}</h2>
      <p style={panel.body}>
        {poi?.description ||
          'This floating marker represents a point of interest in your environment. Move closer to interact or explore the attached media.'}
      </p>
      {poi?.category && <div style={panel.tag}>{poi.category}</div>}
      {poi?.distance != null && (
        <div style={panel.tag}>{Math.round(poi.distance)}m away</div>
      )}
    </div>
  )
}

// --- Video Panel ---
function VideoPanel({ poi }) {
  const videoSrc = poi?.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'

  return (
    <div style={{ ...panel.wrap, display: 'flex', flexDirection: 'column' }}>
      <video
        style={panel.video}
        controls
        playsInline
        preload="metadata"
        onClick={(e) => e.stopPropagation()}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div style={{ padding: '12px' }}>
        <p style={panel.body}>
          {poi?.name ? `Video content for ${poi.name}.` : 'Sample video content.'}
        </p>
      </div>
    </div>
  )
}

// Shared panel styles
const panel = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
  },
  image: {
    width: '100%',
    height: '220px',
    objectFit: 'cover',
    display: 'block',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.6rem',
    cursor: 'pointer',
    padding: '0 8px',
  },
  dots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#fff',
    display: 'inline-block',
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    marginBottom: '10px',
    color: '#fff',
  },
  body: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.6,
    marginBottom: '14px',
  },
  tag: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px',
  },
  video: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    background: '#000',
  },
}