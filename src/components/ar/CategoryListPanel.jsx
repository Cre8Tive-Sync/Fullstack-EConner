import { useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

/**
 * AR panel that lists places belonging to a selected category.
 * Appears centered in front of the camera. Tapping a place calls onSelectPlace(poi).
 */
export default function CategoryListPanel({ category, places, onSelectPlace, onClose }) {
  const { camera } = useThree()

  // Compute position + facing angle once on mount (same pattern as POIPanels3D)
  const panelData = useMemo(() => {
    const pos = camera.position.clone()
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()

    const distance = 4
    const baseAngle = Math.atan2(forward.x, forward.z)
    const x = pos.x + Math.sin(baseAngle) * distance
    const z = pos.z + Math.cos(baseAngle) * distance
    const position = new THREE.Vector3(x, pos.y + 0.4, z)
    const faceAngle = Math.atan2(pos.x - x, pos.z - z)
    return { position, faceAngle }
  }, [])

  return (
    <group>
      <group position={panelData.position}>
        <Html
          center
          transform
          occlude={false}
          distanceFactor={4}
          rotation={[0, panelData.faceAngle, 0]}
          style={{ width: '300px', height: '440px', pointerEvents: 'auto', zIndex: 20 }}
        >
          <div
            style={styles.panel}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ ...styles.header, borderBottomColor: category.sphereColor }}>
              <div style={{ ...styles.dot, background: category.sphereColor, boxShadow: `0 0 8px ${category.sphereColor}` }} />
              <h2 style={styles.title}>{category.name}</h2>
              <button style={styles.headerClose} onClick={onClose} aria-label="Close">✕</button>
            </div>

            <p style={styles.subtitle}>{category.description}</p>

            {/* Place list */}
            <div style={styles.list}>
              {places.length === 0 ? (
                <p style={styles.empty}>No places found in this category yet.</p>
              ) : (
                places.map((poi) => (
                  <button
                    key={poi.id}
                    style={styles.placeRow}
                    onClick={() => onSelectPlace(poi)}
                  >
                    {poi.images?.[0] ? (
                      <img src={poi.images[0]} alt="" style={styles.thumb} />
                    ) : (
                      <div style={{ ...styles.thumb, background: poi.sphereColor + '33', display: 'grid', placeItems: 'center' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: poi.sphereColor }} />
                      </div>
                    )}
                    <div style={styles.placeInfo}>
                      <span style={styles.placeName}>{poi.name}</span>
                      <span style={styles.placeHours}>{poi.hours || ''}</span>
                    </div>
                    <span style={{ ...styles.chevron, color: category.sphereColor }}>›</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </Html>
      </group>

      <FloatingCloseButton onClose={onClose} />
    </group>
  )
}

// Follows camera, pinned to bottom center — same pattern as POIPanels3D's ScreenCloseButton
function FloatingCloseButton({ onClose }) {
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
        <button style={styles.closeBtn} onClick={onClose}>Close</button>
      </Html>
    </group>
  )
}

const styles = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(130deg, rgba(96,43,11,0.86), rgba(48,21,8,0.92))',
    backdropFilter: 'blur(14px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.85)',
    overflow: 'hidden',
    boxShadow: '0 20px 56px rgba(0,0,0,0.45)',
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 14px 12px',
    borderBottom: '1px solid',
    flexShrink: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    margin: 0,
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 800,
    letterSpacing: '0.01em',
  },
  headerClose: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#fff',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    lineHeight: 1,
  },
  subtitle: {
    margin: '8px 14px 0',
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.65rem',
    lineHeight: 1.4,
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  empty: {
    margin: '20px auto',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.72rem',
    textAlign: 'center',
  },
  placeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s ease',
    width: '100%',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  placeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  placeName: {
    color: '#fff',
    fontSize: '0.76rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  placeHours: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.62rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chevron: {
    fontSize: '1.3rem',
    fontWeight: 700,
    lineHeight: 1,
    flexShrink: 0,
  },
  closeBtn: {
    padding: '10px 28px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    letterSpacing: '0.04em',
  },
}
