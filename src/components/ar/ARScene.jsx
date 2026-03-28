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
    if (!navigator.mediaDevices) {
      console.warn('navigator.mediaDevices not available (requires HTTPS)')
      return
    }

    let stopped = false

    function startCamera() {
      if (stopped || !videoRef.current) return

      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        .then((stream) => {
          if (stopped || !videoRef.current) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .catch((err) => console.warn('Video play failed:', err))
          }

          // iOS kills the camera stream when other permission prompts
          // (geolocation, device orientation) appear — restart if that happens
          stream.getVideoTracks().forEach((track) => {
            track.addEventListener('ended', () => {
              console.warn('Camera track ended, restarting...')
              startCamera()
            })
          })
        })
        .catch((err) => console.warn('Camera access denied:', err))
    }

    startCamera()

    return () => {
      stopped = true
      const tracks = videoRef.current?.srcObject?.getTracks()
      if (tracks) tracks.forEach((t) => t.stop())
    }
  }, [])

  return (
    <video
      ref={videoRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        objectFit: 'cover', zIndex: 0,
      }}
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

// Fallback: first POI directly in front, rest spread in an arc behind it
function FallbackPOIMarkers({ pois, targetedPoiId }) {
  const groupRef = useRef()
  const radius = 5 // close enough to see clearly

  return (
    <group ref={groupRef}>
      {pois.map((poi, i) => {
        let x, z
        if (i === 0) {
          // First POI: dead center in front of camera
          x = 0
          z = -radius
        } else {
          // Remaining POIs: spread in an arc to left and right
          const remaining = pois.length - 1
          const arcSpan = Math.PI * 0.7 // ~126 degrees
          const angle = -arcSpan / 2 + (arcSpan / Math.max(remaining - 1, 1)) * (i - 1)
          x = Math.sin(angle) * radius
          z = -Math.cos(angle) * radius
        }
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

// DEBUG: places a red sphere 5m in front of wherever the camera is looking
// after a short delay for AR.js orientation to settle
function DebugForwardSphere({ poiId, sphereRef }) {
  const { camera } = useThree()
  const placed = useRef(false)
  const timer = useRef(0)

  useFrame((_, delta) => {
    if (placed.current || !sphereRef.current) return

    timer.current += delta
    if (timer.current < 2) return

    const forward = new THREE.Vector3(0, 0, -5)
    forward.applyQuaternion(camera.quaternion)
    sphereRef.current.position.copy(camera.position).add(forward)
    placed.current = true
  })

  return (
    <mesh ref={sphereRef} position={[0, -9999, 0]} userData={{ interactive: true, poiId }}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
    </mesh>
  )
}

// DEBUG: 3D arrow that always points toward the debug sphere
// Floats 1.5m in front of the camera and rotates to face the target
function DirectionArrow({ targetRef }) {
  const { camera } = useThree()
  const arrowRef = useRef()

  useFrame(() => {
    if (!arrowRef.current || !targetRef?.current) return
    // Check if target is still hidden
    if (targetRef.current.position.y < -999) return

    // Position arrow 1.5m in front of camera, slightly below center
    const forward = new THREE.Vector3(0, -0.3, -1.5)
    forward.applyQuaternion(camera.quaternion)
    arrowRef.current.position.copy(camera.position).add(forward)

    // Make arrow point toward the target sphere
    arrowRef.current.lookAt(targetRef.current.position)
  })

  return (
    <group ref={arrowRef}>
      {/* Arrow shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
      </mesh>
      {/* Arrow head (cone) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.4]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
      </mesh>
    </group>
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

// ─── Compass HUD ────────────────────────────────────────────────────

function Compass() {
  const [heading, setHeading] = useState(null) // null = no data yet
  const smoothHeading = useRef(0)

  useEffect(() => {
    let active = true

    const onOrientation = (e) => {
      if (!active) return

      // iOS provides webkitCompassHeading (true north, 0-360)
      // Android/others: alpha is 0-360 but relative — we use it as best-effort
      let h = null
      if (e.webkitCompassHeading != null) {
        h = e.webkitCompassHeading
      } else if (e.alpha != null) {
        // On Android, alpha=0 is wherever the phone was pointing at page load
        // With absolute:true events this is true north; otherwise approximate
        h = 360 - e.alpha
      }

      if (h != null) {
        // Smooth the heading to avoid jitter
        let delta = h - smoothHeading.current
        if (delta > 180) delta -= 360
        if (delta < -180) delta += 360
        smoothHeading.current = (smoothHeading.current + delta * 0.3 + 360) % 360
        setHeading(smoothHeading.current)
      }
    }

    // Try absolute orientation first (true north on Android)
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {})
    }

    return () => {
      active = false
      window.removeEventListener('deviceorientationabsolute', onOrientation)
      window.removeEventListener('deviceorientation', onOrientation)
    }
  }, [])

  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const h = heading ?? 0
  const index = Math.round(h / 45) % 8
  const label = cardinals[index]

  return (
    <div style={styles.compass}>
      <div
        style={{
          ...styles.compassRing,
          transform: `rotate(${-h}deg)`,
        }}
      >
        {/* North needle */}
        <div style={styles.compassNeedle} />
        <span style={styles.compassN}>N</span>
      </div>
      <span style={styles.compassLabel}>
        {heading == null ? 'No compass' : `${label} ${Math.round(h)}°`}
      </span>
    </div>
  )
}

// ─── Nearby test POI (placed ~1m north of user on first GPS fix) ───

function useTestPOI(coords) {
  // Capture the user's first GPS position and create a test POI ~20m ahead
  const testPoi = useRef(null)

  if (coords && !testPoi.current) {
    // Offset ~10m north (latitude) — 1 degree latitude ≈ 111,320m
    // Must be >= AR.js gpsMinDistance (5m) to actually register as a distinct position
    const offsetLat = 10 / 111320
    testPoi.current = {
      id: 'poi-test',
      name: 'Test Marker',
      description:
        'This is a test marker placed 20 meters ahead of your starting position. If you can see this sphere and interact with it, AR is working!',
      lat: coords.latitude + offsetLat,
      lng: coords.longitude,
      category: 'test',
      images: [
        'https://picsum.photos/seed/test1/400/300',
        'https://picsum.photos/seed/test2/400/300',
      ],
      videoUrl: null,
      sphereColor: '#ff3366',
      sphereEmissive: '#aa1133',
      proximityRadius: 30,
      hours: 'Always visible',
      tips: 'This test marker proves the AR system is working. Walk toward it to see proximity detection.',
      relatedActivities: ['Testing', 'Demo'],
    }
  }

  return testPoi.current
}

// ─── Main ARScene ────────────────────────────────────────────────────

export default function ARScene() {
  const [targetedPoiId, setTargetedPoiId] = useState(null)
  const [activePoi, setActivePoi] = useState(null)
  const [arFailed, setArFailed] = useState(false)

  const { coords } = useGeolocation()
  const testPoi = useTestPOI(coords)

  // Merge test POI (first) with real POIs so it appears at index 0
  const allPois = useMemo(() => {
    return testPoi ? [testPoi, ...POIS] : POIS
  }, [testPoi])

  const { closestPOI } = useNearbyPOIs(coords, allPois)

  const targeted = targetedPoiId !== null

  const handleCapture = () => {
    if (!targetedPoiId) return
    const poi = allPois.find((p) => p.id === targetedPoiId)
    if (poi) setActivePoi(poi)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <CameraBackground />

      <Compass />

      {closestPOI && <ProximityIndicator poi={closestPOI} />}

      {arFailed && (
        <div style={styles.fallbackBanner}>
          Demo mode — location AR unavailable
        </div>
      )}

      {/* Debug overlay — remove after testing */}
      <div style={styles.debug}>
        <div>Mode: {arFailed ? 'FALLBACK' : 'AR.js'}</div>
        <div>GPS: {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (±${Math.round(coords.accuracy)}m)` : 'waiting...'}</div>
        <div>POIs loaded: {allPois.length}</div>
        <div>Test POI: {testPoi ? 'YES' : 'no (waiting for GPS)'}</div>
        <div>Targeted: {targetedPoiId || 'none'}</div>
      </div>

      <Canvas
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        camera={{ position: [0, 0, 0] }}
        gl={{ alpha: true, premultipliedAlpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 2]} intensity={1} />

        {/* DEBUG: sphere that stays in front of camera after AR.js orientation settles */}
        <DebugForwardSphere poiId={allPois[0]?.id} sphereRef={debugSphereRef} />
        <DirectionArrow targetRef={debugSphereRef} />

        {!arFailed ? (
          <LocationARProvider onError={() => setArFailed(true)}>
            <ARUpdater />
            <ClampedPOIs
              pois={allPois}
              coords={coords}
              targetedPoiId={targetedPoiId}
            />
          </LocationARProvider>
        ) : (
          <>
            <FallbackDeviceOrientationCamera />
            <FallbackPOIMarkers pois={allPois} targetedPoiId={targetedPoiId} />
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
          {allPois.find((p) => p.id === targetedPoiId)?.name}
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
  compass: {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    pointerEvents: 'none',
  },
  compassRing: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    position: 'relative',
    transition: 'transform 0.15s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassNeedle: {
    position: 'absolute',
    top: '6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '0',
    height: '0',
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    borderBottom: '12px solid #ff3333',
  },
  compassN: {
    position: 'absolute',
    top: '-1px',
    left: '50%',
    transform: 'translateX(-50%) translateY(-100%)',
    fontSize: '0.55rem',
    fontWeight: 700,
    color: '#ff3333',
    fontFamily: "'DM Sans', sans-serif",
  },
  compassLabel: {
    fontSize: '0.6rem',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "'DM Sans', sans-serif",
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  debug: {
    position: 'fixed',
    bottom: '6rem',
    left: '0.5rem',
    zIndex: 30,
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '0.6rem',
    padding: '6px 8px',
    borderRadius: '6px',
    lineHeight: 1.6,
    pointerEvents: 'none',
    maxWidth: '60vw',
    wordBreak: 'break-all',
  },
}
