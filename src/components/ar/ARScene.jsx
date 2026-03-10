import { useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ARButton, XR } from '@react-three/xr'
import * as THREE from 'three'
import PanoramicView from './PanoramicView'

// Crosshair raycaster — checks if center of screen hits the sphere
function CrosshairRaycaster({ onHit, onMiss }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  useFrame(() => {
    // Always cast from center of screen (where crosshair is)
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit = hits.find((h) => h.object.userData.interactive)
    hit ? onHit() : onMiss()
  })

  return null
}

// The floating interactive sphere
function FloatingSphere({ isTargeted }) {
  const ref = useRef()

  // Gentle float animation
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.05
      ref.current.rotation.y += 0.005
    }
  })

  return (
    <mesh ref={ref} position={[0, 0, -1.5]} userData={{ interactive: true }}>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial
        color={isTargeted ? '#00ffcc' : '#4488ff'}
        emissive={isTargeted ? '#00ffcc' : '#1133aa'}
        emissiveIntensity={isTargeted ? 0.6 : 0.2}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  )
}

export default function ARScene() {
  const [targeted, setTargeted] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>

      {/* AR Enter Button */}
      <ARButton style={styles.arButton} />

      {/* Three.js Canvas */}
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 0, 0] }}>
        <XR>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1} />

          <FloatingSphere isTargeted={targeted} />

          <CrosshairRaycaster
            onHit={() => setTargeted(true)}
            onMiss={() => setTargeted(false)}
          />
        </XR>
      </Canvas>

      {/* Crosshair — always center screen */}
      <Crosshair active={targeted} />

      {/* Open button — only when targeted */}
      {targeted && !panelOpen && (
        <button style={styles.openButton} onClick={() => setPanelOpen(true)}>
          <span style={styles.openIcon}>⊕</span> View Details
        </button>
      )}

      {/* Panoramic panel — AR still visible behind it */}
      {panelOpen && (
        <PanoramicView onClose={() => setPanelOpen(false)} />
      )}
    </div>
  )
}

function Crosshair({ active }) {
  return (
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="8"
          fill="none"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line x1="20" y1="4" x2="20" y2="13" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="20" y1="27" x2="20" y2="36" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="4" y1="20" x2="13" y2="20" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="27" y1="20" x2="36" y2="20" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        {active && <circle cx="20" cy="20" r="3" fill="#00ffcc" />}
      </svg>
    </div>
  )
}

const styles = {
  arButton: {
    position: 'fixed',
    top: '1.5rem', right: '1.5rem',
    padding: '0.5rem 1.2rem',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '999px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    zIndex: 20,
  },
  openButton: {
    position: 'fixed',
    bottom: '3rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.9rem 2rem',
    background: 'rgba(0, 255, 204, 0.15)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #00ffcc',
    borderRadius: '999px',
    color: '#00ffcc',
    fontSize: '1rem',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 20,
    letterSpacing: '0.03em',
    animation: 'fadeUp 0.3s ease',
  },
  openIcon: {
    fontSize: '1.2rem',
  }
}