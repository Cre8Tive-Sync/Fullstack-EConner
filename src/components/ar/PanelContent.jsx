import { useState } from 'react'

export default function PanelContent({ type }) {
  if (type === 'gallery') return <GalleryPanel />
  if (type === 'info')    return <InfoPanel />
  if (type === 'video')   return <VideoPanel />
  return null
}

// --- Gallery Panel ---
const SAMPLE_IMAGES = [
  'https://picsum.photos/seed/ar1/400/300',
  'https://picsum.photos/seed/ar2/400/300',
  'https://picsum.photos/seed/ar3/400/300',
]

function GalleryPanel() {
  const [current, setCurrent] = useState(0)

  const prev = (e) => {
    e.stopPropagation()
    setCurrent((c) => (c - 1 + SAMPLE_IMAGES.length) % SAMPLE_IMAGES.length)
  }

  const next = (e) => {
    e.stopPropagation()
    setCurrent((c) => (c + 1) % SAMPLE_IMAGES.length)
  }

  return (
    <div style={panel.wrap}>
      <img
        src={SAMPLE_IMAGES[current]}
        alt="gallery"
        style={panel.image}
        draggable={false}
      />

      {/* Swipe nav */}
      <div style={panel.navRow}>
        <button style={panel.navBtn} onClick={prev}>‹</button>
        <span style={panel.dots}>
          {SAMPLE_IMAGES.map((_, i) => (
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
function InfoPanel() {
  return (
    <div style={{ ...panel.wrap, padding: '16px', overflowY: 'auto' }}>
      <h2 style={panel.title}>About This Object</h2>
      <p style={panel.body}>
        This floating marker represents a point of interest in your environment.
        Move closer to interact or explore the attached media.
      </p>
      <div style={panel.tag}>📍 Location Tag</div>
      <div style={panel.tag}>🕐 Last updated: today</div>
      <div style={panel.tag}>👁 42 views</div>
    </div>
  )
}

// --- Video Panel ---
function VideoPanel() {
  return (
    <div style={{ ...panel.wrap, display: 'flex', flexDirection: 'column' }}>
      <video
        style={panel.video}
        controls
        playsInline           // important for mobile
        preload="metadata"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Replace with real video src */}
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
      </video>
      <div style={{ padding: '12px' }}>
        <p style={panel.body}>Sample video content. Replace with your own source.</p>
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