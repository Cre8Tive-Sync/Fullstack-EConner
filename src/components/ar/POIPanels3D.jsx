import { useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import PanelContent from './PanelContent'

const PANEL_DEFS = [
  { id: 'overview', label: null, angleOffset: -0.55 },   // ~-31 degrees left
  { id: 'gallery',  label: 'Gallery',  angleOffset: 0 },  // center
  { id: 'details',  label: 'Details',  angleOffset: 0.55 }, // ~31 degrees right
]

const PANEL_DISTANCE = 4  // meters in front of user
const PANEL_Y = 0.3       // slight vertical offset

/**
 * Renders interactive HTML panels as 3D objects inside the AR scene.
 * Panels are placed in an arc in front of where the user was looking
 * when they opened the panel. The user physically turns to browse them.
 */
export default function POIPanels3D({ poi, onClose }) {
  const { camera } = useThree()
  const groupRef = useRef()

  // Capture the camera's forward direction at mount time.
  // Panels are placed relative to where the user was looking when they opened.
  const baseDirection = useMemo(() => {
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    // Project onto XZ plane for a horizontal arc
    forward.y = 0
    forward.normalize()
    return forward
  }, []) // intentionally empty — capture once on mount

  // Compute panel world positions in an arc around the camera
  const panelPositions = useMemo(() => {
    const baseAngle = Math.atan2(baseDirection.x, -baseDirection.z)

    return PANEL_DEFS.map((def) => {
      const angle = baseAngle + def.angleOffset
      const x = Math.sin(angle) * PANEL_DISTANCE
      const z = -Math.cos(angle) * PANEL_DISTANCE
      return new THREE.Vector3(x, PANEL_Y, z)
    })
  }, [baseDirection])

  return (
    <group ref={groupRef}>
      {PANEL_DEFS.map((def, i) => (
        <group key={def.id} position={panelPositions[i]}>
          {/* Make the Html face the origin (where the user is standing) */}
          <Html
            center
            transform
            occlude={false}
            distanceFactor={4}
            style={{
              width: '260px',
              height: '360px',
              pointerEvents: 'auto',
            }}
            // Face toward center (user position)
            rotation={[0, Math.atan2(panelPositions[i].x, -panelPositions[i].z), 0]}
          >
            <div
              style={styles.panel}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Panel tab label */}
              <div style={styles.panelTab}>
                {def.label || poi.name}
              </div>

              {/* Panel content */}
              <PanelContent type={def.id} poi={poi} />
            </div>
          </Html>
        </group>
      ))}

      {/* Close button — always in front of user at bottom */}
      <Html
        center
        transform
        distanceFactor={4}
        position={[baseDirection.x * 3, -1.5, -baseDirection.z * 3]}
        rotation={[0, Math.atan2(baseDirection.x, -baseDirection.z), 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <button style={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </Html>
    </group>
  )
}

const styles = {
  panel: {
    width: '260px',
    height: '360px',
    background: 'rgba(10, 10, 20, 0.88)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.12)',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    cursor: 'default',
    userSelect: 'none',
  },
  panelTab: {
    padding: '12px 16px 8px',
    fontSize: '0.7rem',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
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
    backdropFilter: 'blur(12px)',
    letterSpacing: '0.04em',
  },
}
