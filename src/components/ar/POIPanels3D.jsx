import { useMemo, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import PanelContent from './PanelContent'

function MapIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3a5 5 0 0 0-5 5c0 3.4 3.8 6.8 4.4 7.4a.9.9 0 0 0 1.2 0C13.2 14.8 17 11.4 17 8a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18.5c1.7-1.2 3.7-1.8 6-1.8h4c2.3 0 4.3.6 6 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReviewsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.2 6.2h11.6a1.7 1.7 0 0 1 1.7 1.7v6.4a1.7 1.7 0 0 1-1.7 1.7H11l-3.8 3.1v-3.1H6.2a1.7 1.7 0 0 1-1.7-1.7V7.9a1.7 1.7 0 0 1 1.7-1.7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MapPanel({ poi }) {
  const iframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${poi.lng - 0.01}%2C${poi.lat - 0.01}%2C${poi.lng + 0.01}%2C${poi.lat + 0.01}&layer=mapnik&marker=${poi.lat}%2C${poi.lng}`
  const openMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`

  return (
    <div style={styles.mapCard}>
      <div style={styles.mapHeader}>
        <h3 style={styles.mapTitle}>{poi.name}</h3>
      </div>
      <iframe
        title={`Map for ${poi.name}`}
        src={iframeUrl}
        style={styles.mapFrame}
        loading="lazy"
      />
      <a href={openMapUrl} target="_blank" rel="noreferrer" style={styles.mapDirections}>
        Open in Maps
      </a>
    </div>
  )
}

function ReviewsPanel({ poi }) {
  const reviews = useMemo(() => {
    const defaults = [
      { user: 'A. Reyes', rating: 5, text: `Amazing place. ${poi.tips || 'Worth the visit.'}` },
      { user: 'M. Santos', rating: 4, text: `Scenic and easy to find. Best part: ${poi.relatedActivities?.[0] || 'the view'}.` },
      { user: 'J. Cruz', rating: 5, text: 'Great stop for photos and local exploration. Highly recommended.' },
    ]
    return defaults
  }, [poi])

  return (
    <div style={styles.reviewsWrap}>
      <h3 style={styles.reviewsTitle}>Reviews</h3>
      <div style={styles.reviewsList}>
        {reviews.map((review, idx) => (
          <article key={`${review.user}-${idx}`} style={styles.reviewItem}>
            <div style={styles.reviewHead}>
              <span style={styles.reviewUser}>{review.user}</span>
              <span style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            </div>
            <p style={styles.reviewText}>{review.text}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export default function POIPanels3D({ poi, onClose }) {
  const { camera } = useThree()
  const [activeLeftPanel, setActiveLeftPanel] = useState(null)

  const panelData = useMemo(() => {
    const pos = camera.position.clone()
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()

    const baseAngle = Math.atan2(forward.x, forward.z)

    const makePanel = (angleOffset, distance, yOffset = 0.5) => {
      const angle = baseAngle + angleOffset
      const x = pos.x + Math.sin(angle) * distance
      const z = pos.z + Math.cos(angle) * distance
      const position = new THREE.Vector3(x, pos.y + yOffset, z)

      const dx = pos.x - x
      const dz = pos.z - z
      const faceAngle = Math.atan2(dx, dz)
      return { position, faceAngle }
    }

    return [
      makePanel(0.66, 4),   // left: controls + map/reviews (close to center, still visible)
      makePanel(0, 4),      // middle: location extended
      makePanel(-0.66, 4),  // right: media
    ]
  }, [])

  return (
    <group>
      <group position={panelData[0].position}>
        <Html
          center
          transform
          occlude={false}
          distanceFactor={4}
          rotation={[0, panelData[0].faceAngle, 0]}
          style={{ width: '260px', height: '360px', pointerEvents: 'auto', position: 'relative', zIndex: 30 }}
        >
          <div
            style={styles.leftPanelShell}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <aside style={styles.leftButtons}>
              <button
                style={styles.railButton}
                onClick={() => setActiveLeftPanel('map')}
              >
                <MapIcon />
                <span style={styles.railLabel}>Map</span>
              </button>
              <button
                style={styles.railButton}
                onClick={() => setActiveLeftPanel('reviews')}
              >
                <ReviewsIcon />
                <span style={styles.railLabel}>Reviews</span>
              </button>
            </aside>
          </div>
        </Html>
      </group>

      {/* Map / Reviews — rendered as a full-size panel, same dimensions as middle/right */}
      {activeLeftPanel && (
        <group position={panelData[0].position}>
          <Html
            center
            transform
            occlude={false}
            distanceFactor={4}
            rotation={[0, panelData[0].faceAngle, 0]}
            style={{ width: '260px', height: '360px', pointerEvents: 'auto', zIndex: 40 }}
          >
            <div
              style={styles.modalPanel}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                style={styles.modalCloseBtn}
                onClick={() => setActiveLeftPanel(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
              <section style={styles.modalContent}>
                {activeLeftPanel === 'map' && <MapPanel poi={poi} />}
                {activeLeftPanel === 'reviews' && <ReviewsPanel poi={poi} />}
              </section>
            </div>
          </Html>
        </group>
      )}

      <group position={panelData[1].position}>
        <Html
          center
          transform
          occlude={false}
          distanceFactor={4}
          rotation={[0, panelData[1].faceAngle, 0]}
          style={{ width: '260px', height: '360px', pointerEvents: 'auto', zIndex: 20 }}
        >
          <div
            style={styles.middlePanel}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div style={styles.middleTab}>{poi.name}</div>
            <PanelContent type="overview" poi={poi} />
          </div>
        </Html>
      </group>

      <group position={panelData[2].position}>
        <Html
          center
          transform
          occlude={false}
          distanceFactor={4}
          rotation={[0, panelData[2].faceAngle, 0]}
          style={{ width: '278px', height: '360px', pointerEvents: 'auto', zIndex: 10 }}
        >
          <div
            style={styles.mediaPanel}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <PanelContent type="gallery" poi={poi} />
          </div>
        </Html>
      </group>

      <ScreenCloseButton onClose={onClose} />
    </group>
  )
}

function ScreenCloseButton({ onClose }) {
  const { camera } = useThree()
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    const offset = new THREE.Vector3(0, -1, -2)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)
    groupRef.current.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'auto' }}>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close panel">Close</button>
      </Html>
    </group>
  )
}

const styles = {
  leftPanelShell: {
    display: 'flex',
    gap: '0',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    width: '260px',
    height: '360px',
    position: 'relative',
    padding: '12px 10px 0 0',
  },
  leftButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: 'auto',
    padding: '0',
    zIndex: 2,
  },
  railButton: {
    width: '58px',
    minHeight: '72px',
    borderRadius: '14px',
    background: 'linear-gradient(160deg, rgba(84,42,11,0.8), rgba(49,24,9,0.86))',
    border: '2px solid rgba(255,255,255,0.9)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.74rem',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
    transition: 'transform 0.16s ease, box-shadow 0.16s ease',
  },
  railButtonActive: {
    borderColor: 'rgba(255,255,255,1)',
    transform: 'translateY(-1px)',
    boxShadow: '0 14px 36px rgba(0,0,0,0.35)',
  },
  railLabel: {
    lineHeight: 1,
    marginTop: '1px',
  },
  leftDynamicContent: {
    flex: 1,
    height: '100%',
    background: 'rgba(0,0,0,0.14)',
    overflow: 'hidden',
  },
  modalOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 10,
    background: 'linear-gradient(130deg, rgba(96,43,11,0.95), rgba(48,21,8,0.98))',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.85)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 56px rgba(0,0,0,0.45)',
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    width: '32px',
    height: '32px',
    margin: '8px 8px 0 0',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#fff',
    fontSize: '1.2rem',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    backdropFilter: 'blur(8px)',
    transition: 'background 0.15s ease',
  },
  modalContent: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 8px 8px',
  },
  modalPanel: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(130deg, rgba(96,43,11,0.86), rgba(48,21,8,0.92))',
    backdropFilter: 'blur(14px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.85)',
    overflow: 'hidden',
    boxShadow: '0 20px 56px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
  },
  middlePanel: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(130deg, rgba(96,43,11,0.86), rgba(48,21,8,0.92))',
    backdropFilter: 'blur(14px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.85)',
    overflow: 'hidden',
    boxShadow: '0 20px 56px rgba(0,0,0,0.45)',
  },
  middleTab: {
    padding: '12px 16px 8px',
    fontSize: '0.7rem',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  mediaPanel: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(130deg, rgba(96,43,11,0.86), rgba(48,21,8,0.92))',
    backdropFilter: 'blur(14px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.85)',
    overflow: 'hidden',
    boxShadow: '0 20px 56px rgba(0,0,0,0.45)',
  },
  closeBtn: {
    padding: '10px 28px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    letterSpacing: '0.04em',
  },
  mapCard: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(15,18,22,0.55)',
  },
  mapHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },
  mapTitle: {
    margin: 0,
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.05rem',
    fontWeight: 800,
  },
  mapFrame: {
    border: 0,
    width: '100%',
    flex: 1,
    minHeight: 0,
    background: '#223',
  },
  mapDirections: {
    display: 'block',
    margin: '8px 8px 8px',
    padding: '8px 10px',
    textAlign: 'center',
    textDecoration: 'none',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: '9px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 700,
    background: 'rgba(255,255,255,0.08)',
  },
  reviewsWrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
    padding: '10px',
    overflow: 'hidden',
  },
  reviewsTitle: {
    margin: '0 0 10px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.1rem',
    fontWeight: 800,
  },
  reviewsList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '2px',
  },
  reviewItem: {
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.24)',
  },
  reviewHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  reviewUser: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  reviewStars: {
    fontSize: '0.78rem',
    color: '#ffd36a',
    letterSpacing: '0.05em',
  },
  reviewText: {
    margin: 0,
    color: 'rgba(255,255,255,0.84)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.74rem',
    lineHeight: 1.45,
  },
}
