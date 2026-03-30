import { useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import PanelContent from './PanelContent'

// Close button that follows the camera so it's always visible
function ScreenCloseButton({ onClose }) {
  const { camera } = useThree()
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    // Place below center of camera view, 2m out
    const offset = new THREE.Vector3(0, -1, -2)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)
    // Face the camera
    groupRef.current.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'auto' }}>
        <button style={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </Html>
    </group>
  )
}

const PANEL_DEFS = [
  { id: 'overview', label: null, angleOffset: -0.65 },   // ~-31 degrees left
  { id: 'details',  label: 'Details',  angleOffset: 0 },   // center
  { id: 'gallery',  label: 'Media',    angleOffset: 0.65 }, // ~31 degrees right
]

const PANEL_DISTANCE = 4  // meters in front of user
const PANEL_Y = 0.5       // slight vertical offset

/**
 * Renders interactive HTML panels as 3D objects inside the AR scene.
 * Panels are placed in an arc in front of where the user was looking
 * when they opened the panel. The user physically turns to browse them.
 */
export default function POIPanels3D({ poi, onClose }) {
  const { camera } = useThree()
  const groupRef = useRef()

  // Capture camera position + forward direction once at mount time.
  // Panels arc around the camera's position at open time, facing inward.
  const { panelData } = useMemo(() => {
    const pos = camera.position.clone()
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    // Project onto XZ plane for a horizontal arc
    forward.y = 0
    forward.normalize()

    const baseAngle = Math.atan2(forward.x, forward.z)

    const data = PANEL_DEFS.map((def) => {
      const angle = baseAngle + def.angleOffset
      // Place panels in front of camera — forward is +Z in camera-local,
      // so sin/cos relative to forward direction
      const x = pos.x + Math.sin(angle) * PANEL_DISTANCE
      const z = pos.z + Math.cos(angle) * PANEL_DISTANCE
      const position = new THREE.Vector3(x, pos.y + PANEL_Y, z)

      // Rotation: face the panel back toward the camera position
      const dx = pos.x - x
      const dz = pos.z - z
      const faceAngle = Math.atan2(dx, dz)

      return { position, faceAngle }
    })

    return { panelData: data }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={groupRef}>
      {PANEL_DEFS.map((def, i) => (
        <group key={def.id} position={panelData[i].position}>
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
            rotation={[0, panelData[i].faceAngle, 0]}
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

      {/* Close button — screen-space overlay anchored to camera */}
      <ScreenCloseButton onClose={onClose} />
    </group>
  )
}

const styles = {
  panel: {
    width: '260px',
    height: '360px',
    background: 'rgba(30, 12, 4, 0.45)',
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
