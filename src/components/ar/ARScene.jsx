import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import * as THREE from 'three'
import PanoramicView from './PanoramicView'

const xrStore = createXRStore()

// Shows rear camera as background
function CameraBackground() {
  const videoRef = useRef()

  useEffect(() => {
    if (!navigator.mediaDevices) {
      console.warn('Camera requires HTTPS. Run with: npm run dev -- --https')
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
      .catch((err) => console.warn('Camera access denied:', err))

    return () => {
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <video
      ref={videoRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      playsInline
      muted
    />
  )
}

// Wires device orientation to the Three.js camera using proper quaternion math
function DeviceOrientationCamera() {
  const { camera } = useThree()
  const orient = useRef({ alpha: 0, beta: 90, gamma: 0 })
  const targetQ = useRef(new THREE.Quaternion())
  const currentQ = useRef(new THREE.Quaternion())
  const initialized = useRef(false)

  useEffect(() => {
    const onOrientation = (e) => {
      orient.current = { alpha: e.alpha ?? 0, beta: e.beta ?? 90, gamma: e.gamma ?? 0 }
    }
    window.addEventListener('deviceorientation', onOrientation)

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(console.warn)
    }

    return () => window.removeEventListener('deviceorientation', onOrientation)
  }, [])

  useFrame(() => {
    const { alpha, beta, gamma } = orient.current
    const deg2rad = THREE.MathUtils.degToRad

    // Standard device orientation → Three.js quaternion conversion
    // (algorithm from Three.js DeviceOrientationControls)
    const euler = new THREE.Euler(deg2rad(beta), deg2rad(alpha), deg2rad(-gamma), 'YXZ')
    targetQ.current.setFromEuler(euler)

    // Remap from device coords to screen coords: rotate -90° around X
    const screenAdjust = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)
    targetQ.current.multiply(screenAdjust)

    // Compensate for current screen orientation (portrait vs landscape)
    const screenOrient = window.screen?.orientation?.angle || window.orientation || 0
    const orientAdjust = new THREE.Quaternion()
    orientAdjust.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -deg2rad(screenOrient))
    targetQ.current.multiply(orientAdjust)

    // Smooth interpolation to reduce jitter
    if (!initialized.current) {
      currentQ.current.copy(targetQ.current)
      initialized.current = true
    } else {
      currentQ.current.slerp(targetQ.current, 0.3)
    }

    camera.quaternion.copy(currentQ.current)
  })

  return null
}

// Crosshair raycaster — checks if center of screen hits the sphere
function CrosshairRaycaster({ onHit, onMiss }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  useFrame(() => {
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit = hits.find((h) => h.object.userData.interactive)
    hit ? onHit() : onMiss()
  })

  return null
}

// The floating interactive sphere — anchored in front of the user's initial facing direction
function FloatingSphere({ isTargeted }) {
  const ref = useRef()
  const { camera } = useThree()
  const anchorPos = useRef(null)

  useFrame(({ clock }) => {
    if (!ref.current) return

    // On first frame, place the sphere 1.5m in front of wherever the camera is looking
    if (!anchorPos.current) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      anchorPos.current = dir.multiplyScalar(1.5)
    }

    ref.current.position.x = anchorPos.current.x
    ref.current.position.y = anchorPos.current.y + Math.sin(clock.elapsedTime * 0.8) * 0.05
    ref.current.position.z = anchorPos.current.z
    ref.current.rotation.y += 0.005
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

function Crosshair({ active }) {
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', zIndex: 10,
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="8" fill="none"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="20" y1="4" x2="20" y2="13" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="20" y1="27" x2="20" y2="36" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="4" y1="20" x2="13" y2="20" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        <line x1="27" y1="20" x2="36" y2="20" stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'} strokeWidth="1.5" />
        {active && <circle cx="20" cy="20" r="3" fill="#00ffcc" />}
      </svg>
    </div>
  )
}

export default function ARScene() {
  const [targeted, setTargeted] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Rear camera feed as background */}
      <CameraBackground />

      {/* AR Enter Button (WebXR — only works over HTTPS) */}
      <button style={styles.arButton} onClick={() => xrStore.enterAR()}>Enter AR</button>

      {/* Three.js Canvas — transparent so camera shows through */}
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 0, 0] }}
        gl={{ alpha: true }}
      >
        <XR store={xrStore}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1} />

          <DeviceOrientationCamera />
          <FloatingSphere isTargeted={targeted} />
          <CrosshairRaycaster
            onHit={() => setTargeted(true)}
            onMiss={() => setTargeted(false)}
          />
        </XR>
      </Canvas>

      <Crosshair active={targeted} />

      {targeted && !panelOpen && (
        <button style={styles.openButton} onClick={() => setPanelOpen(true)}>
          <span style={styles.openIcon}>⊕</span> View Details
        </button>
      )}

      {panelOpen && <PanoramicView onClose={() => setPanelOpen(false)} />}
    </div>
  )
}

const styles = {
  arButton: {
    position: 'fixed', top: '1.5rem', right: '1.5rem',
    padding: '0.5rem 1.2rem',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '999px', fontSize: '0.85rem', cursor: 'pointer', zIndex: 20,
  },
  openButton: {
    position: 'fixed', bottom: '3rem', left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '0.9rem 2rem',
    background: 'rgba(0, 255, 204, 0.15)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #00ffcc', borderRadius: '999px',
    color: '#00ffcc', fontSize: '1rem',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    cursor: 'pointer', zIndex: 20, letterSpacing: '0.03em',
  },
  openIcon: { fontSize: '1.2rem' },
}
