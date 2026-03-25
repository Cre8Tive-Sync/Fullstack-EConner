import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import PanoramicView from './PanoramicView'
import ProximityIndicator from './ProximityIndicator'
import { useGeolocation } from './hooks/useGeolocation'
import { useNearbyPOIs } from './hooks/useNearbyPOIs'
import { POIS } from './data/pois'

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

    const euler = new THREE.Euler(deg2rad(beta), deg2rad(alpha), deg2rad(-gamma), 'YXZ')
    targetQ.current.setFromEuler(euler)

    const screenAdjust = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)
    targetQ.current.multiply(screenAdjust)

    const screenOrient = window.screen?.orientation?.angle || window.orientation || 0
    const orientAdjust = new THREE.Quaternion()
    orientAdjust.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -deg2rad(screenOrient))
    targetQ.current.multiply(orientAdjust)

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

// Crosshair raycaster — checks if center of screen hits the interactive text
function CrosshairRaycaster({ onHit, onMiss }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  useFrame(() => {
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit = hits.find((h) => h.object.userData.interactive)
    hit ? onHit() : onMiss() || true
  })

  return null
}

// Screen-anchored floating "Apayao" text — always 1.5 units in front of camera
function FloatingText({ isTargeted }) {
  const ref = useRef()

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 1024, 256)

    // Text shadow for depth
    ctx.shadowColor = 'rgba(0, 255, 204, 0.3)'
    ctx.shadowBlur = 20

    ctx.font = 'bold 120px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Apayao', 512, 128)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame(({ camera, clock }) => {
    if (!ref.current) return

    const dir = new THREE.Vector3(0, 0, -1.5).applyQuaternion(camera.quaternion)
    ref.current.position.copy(camera.position).add(dir)
    ref.current.position.y += Math.sin(clock.elapsedTime * 0.6) * 0.03
  })

  return (
    <sprite
      ref={ref}
      scale={[1.2, 0.3, 1]}
      userData={{ interactive: true }}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={isTargeted ? 1 : 0.8}
        depthTest={false}
      />
    </sprite>
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

// Camera shutter button — activates when crosshair targets the text
function ShutterButton({ targeted, onCapture }) {
  return (
    <button
      style={{
        ...styles.shutter,
        opacity: targeted ? 1 : 0.4,
        cursor: targeted ? 'pointer' : 'default',
      }}
      disabled={!targeted}
      onClick={onCapture}
    >
      <div
        style={{
          ...styles.shutterInner,
          background: targeted ? '#00ffcc' : '#fff',
          transform: targeted ? 'scale(1)' : 'scale(0.92)',
        }}
      />
    </button>
  )
}

export default function ARScene() {
  const [targeted, setTargeted] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  // GPS proximity detection (kept for future use + ProximityIndicator)
  const { coords } = useGeolocation()
  const { closestPOI } = useNearbyPOIs(coords, POIS)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Rear camera feed — always visible */}
      <CameraBackground />

      {/* Show proximity indicator if near a real POI */}
      {closestPOI && <ProximityIndicator poi={closestPOI} />}

      {/* Three.js Canvas — transparent so camera shows through */}
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 0, 0] }}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 2]} intensity={1} />

        <DeviceOrientationCamera />
        <FloatingText isTargeted={targeted} />
        <CrosshairRaycaster
          onHit={() => setTargeted(true)}
          onMiss={() => setTargeted(false)}
        />
      </Canvas>

      <Crosshair active={targeted} />

      {!panelOpen && (
        <ShutterButton targeted={targeted} onCapture={() => setPanelOpen(true)} />
      )}

      {panelOpen && <PanoramicView onClose={() => setPanelOpen(false)} />}
    </div>
  )
}

const styles = {
  shutter: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.8)',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 20,
    transition: 'opacity 0.2s',
  },
  shutterInner: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    transition: 'background 0.2s, transform 0.15s',
  },
}
