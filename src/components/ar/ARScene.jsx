import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import POIPanels3D from './POIPanels3D'
import ProximityIndicator from './ProximityIndicator'
import GPSPlacedObject from './GPSPlacedObject'
import POIMarker from './POIMarker'
import { useGeolocation } from './hooks/useGeolocation'
import { useNearbyPOIs, getClampedCoords } from './hooks/useNearbyPOIs'
import { useLocationAR, useLocationARSetup, LocationARContext } from './hooks/useLocationAR'
import { POIS } from './data/pois'

const MAX_MARKER_DISTANCE = 200 // meters

// ─── AR.js Integration Components ────────────────────────────────────

function LocationARProvider({ onError, children }) {
  const arState = useLocationARSetup({ onError })

  return (
    <LocationARContext.Provider value={arState}>
      {children}
    </LocationARContext.Provider>
  )
}

function ARUpdater() {
  const { orientControls } = useLocationAR()

  useFrame(() => {
    orientControls?.current?.update()
  }, -1)

  return null
}

// ─── Fallback Components (used when AR.js fails) ────────────────────

function CameraBackground() {
  const videoRef = useRef()

  useEffect(() => {
    if (!navigator.mediaDevices) return

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
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
      autoPlay
      playsInline
      muted
      {...{ 'webkit-playsinline': 'true' }}
    />
  )
}

function FallbackDeviceOrientationCamera() {
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

// Fallback: place POI spheres in an arc around camera for desktop testing
function FallbackPOIMarkers({ pois, targetedPoiId }) {
  const groupRef = useRef()
  const count = pois.length
  const arcSpan = Math.PI * 0.8 // 144-degree arc in front
  const radius = 8

  return (
    <group ref={groupRef}>
      {pois.map((poi, i) => {
        const angle = -arcSpan / 2 + (arcSpan / Math.max(count - 1, 1)) * i
        const x = Math.sin(angle) * radius
        const z = -Math.cos(angle) * radius
        return (
          <group key={poi.id} position={[x, 0, z]}>
            <POIMarker poi={poi} isTargeted={targetedPoiId === poi.id} />
          </group>
        )
      })}
    </group>
  )
}

// ─── Shared Components ───────────────────────────────────────────────

function CrosshairRaycaster({ onHit, onMiss }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  useFrame(() => {
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit = hits.find((h) => h.object.userData.interactive)
    if (hit && hit.object.userData.poiId) {
      onHit(hit.object.userData.poiId)
    } else {
      onMiss()
    }
  })

  return null
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

// ─── GPS-placed POIs with distance clamping ─────────────────────────

function ClampedPOIs({ pois, coords, targetedPoiId }) {
  const clampedPois = useMemo(() => {
    if (!coords) return pois.map((poi) => ({ poi, lat: poi.lat, lng: poi.lng }))

    return pois.map((poi) => {
      const clamped = getClampedCoords(
        coords.latitude,
        coords.longitude,
        poi,
        MAX_MARKER_DISTANCE
      )
      return { poi, lat: clamped.lat, lng: clamped.lng }
    })
  }, [pois, coords?.latitude, coords?.longitude])

  return (
    <>
      {clampedPois.map(({ poi, lat, lng }) => (
        <GPSPlacedObject key={poi.id} lat={lat} lng={lng}>
          <POIMarker poi={poi} isTargeted={targetedPoiId === poi.id} />
        </GPSPlacedObject>
      ))}
    </>
  )
}

// ─── Main ARScene ────────────────────────────────────────────────────

export default function ARScene() {
  const [targetedPoiId, setTargetedPoiId] = useState(null)
  const [activePoi, setActivePoi] = useState(null)
  const [arFailed, setArFailed] = useState(false)

  const { coords } = useGeolocation()
  const { closestPOI } = useNearbyPOIs(coords, POIS)

  const targeted = targetedPoiId !== null

  const handleCapture = () => {
    if (!targetedPoiId) return
    const poi = POIS.find((p) => p.id === targetedPoiId)
    if (poi) setActivePoi(poi)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <CameraBackground />

      {closestPOI && <ProximityIndicator poi={closestPOI} />}

      {arFailed && (
        <div style={styles.fallbackBanner}>
          Demo mode — location AR unavailable
        </div>
      )}

      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 0, 0] }}
        gl={{ alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 2]} intensity={1} />

        {!arFailed ? (
          <LocationARProvider onError={() => setArFailed(true)}>
            <ARUpdater />
            <ClampedPOIs
              pois={POIS}
              coords={coords}
              targetedPoiId={targetedPoiId}
            />
          </LocationARProvider>
        ) : (
          <>
            <FallbackDeviceOrientationCamera />
            <FallbackPOIMarkers pois={POIS} targetedPoiId={targetedPoiId} />
          </>
        )}

        {/* Disable raycaster when panels are open */}
        {!activePoi && (
          <CrosshairRaycaster
            onHit={(poiId) => setTargetedPoiId(poiId)}
            onMiss={() => setTargetedPoiId(null)}
          />
        )}

        {/* 3D panels rendered inside the scene */}
        {activePoi && (
          <POIPanels3D poi={activePoi} onClose={() => setActivePoi(null)} />
        )}
      </Canvas>

      {/* Hide crosshair + UI when panels are open */}
      {!activePoi && <Crosshair active={targeted} />}

      {/* POI name hint when targeted */}
      {targeted && !activePoi && (
        <div style={styles.targetHint}>
          {POIS.find((p) => p.id === targetedPoiId)?.name}
        </div>
      )}

      {!activePoi && (
        <ShutterButton targeted={targeted} onCapture={handleCapture} />
      )}
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
  fallbackBanner: {
    position: 'fixed',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.4rem 1rem',
    background: 'rgba(255, 165, 0, 0.2)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 165, 0, 0.4)',
    borderRadius: '999px',
    color: '#ffaa00',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 600,
    zIndex: 15,
    pointerEvents: 'none',
  },
  targetHint: {
    position: 'fixed',
    top: '60%',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.35rem 1rem',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: '999px',
    color: '#00ffcc',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 600,
    zIndex: 15,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
}
