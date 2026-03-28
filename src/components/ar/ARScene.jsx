import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import PanoramicView from './PanoramicView'

const xrStore = createXRStore()

// Shows rear camera as background
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
    hit ? onHit() : onMiss()
  })

  return null
}

// DEBUG: red sphere placed 5m in front of camera after 2s delay
function DebugForwardSphere({ poiId, sphereRef, onPlaced }) {
  const { camera } = useThree()
  const [show, setShow] = useState(false)
  const placed = useRef(false)
  const timer = useRef(0)
  const savedPos = useRef(new THREE.Vector3(0, -9999, 0))

  useFrame((_, delta) => {
    if (placed.current) return

    timer.current += delta
    if (timer.current < 2) return

    // Place sphere 5m in front of wherever the camera is looking
    const forward = new THREE.Vector3(0, 0, -5)
    forward.applyQuaternion(camera.quaternion)
    savedPos.current.copy(camera.position).add(forward)
    placed.current = true
    setShow(true)
    onPlaced?.()
  })

  if (!show) return null

  return (
    <mesh
      ref={sphereRef}
      position={[savedPos.current.x, savedPos.current.y, savedPos.current.z]}
      userData={{ interactive: true, poiId }}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
    </mesh>
  )
}

// DEBUG: green arrow that follows the camera and always points at the target
function DirectionArrow({ targetRef, visible }) {
  const { camera } = useThree()
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current || !targetRef?.current) return
    if (!targetRef.current.visible) return

    // Stick the arrow 1.5m in front of camera, slightly below center
    const offset = new THREE.Vector3(0, -0.3, -1.5)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)

    // Point the arrow toward the target
    // lookAt makes local -Z face the target, but we built the arrow along +Z
    // so we compute direction and use quaternion manually
    const dir = new THREE.Vector3()
    dir.subVectors(targetRef.current.position, groupRef.current.position).normalize()
    const quat = new THREE.Quaternion()
    // Build rotation: default forward is +Z, we want to rotate to face `dir`
    const up = new THREE.Vector3(0, 1, 0)
    const mtx = new THREE.Matrix4()
    mtx.lookAt(groupRef.current.position, targetRef.current.position, up)
    quat.setFromRotationMatrix(mtx)
    groupRef.current.quaternion.copy(quat)
  })

  return (
    <group ref={groupRef} visible={visible}>
      {/* Shaft — cylinder rotated from Y to Z axis */}
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
      </mesh>
      {/* Arrow head — cone tip pointing toward +Z (toward target via lookAt) */}
      <mesh position={[0, 0, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function Crosshair({ active }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="8"
          fill="none"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="20"
          y1="4"
          x2="20"
          y2="13"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="20"
          y1="27"
          x2="20"
          y2="36"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="4"
          y1="20"
          x2="13"
          y2="20"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="27"
          y1="20"
          x2="36"
          y2="20"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
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
      const clamped = getClampedCoords(coords.latitude, coords.longitude, poi, MAX_MARKER_DISTANCE)
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

// ─── Permission Gate ─────────────────────────────────────────────────
// iOS requires deviceorientation permission from a user gesture.
// This screen requests all permissions before launching the AR scene.

export default function ARScene() {
  const [permitted, setPermitted] = useState(false)

  const requestPermissions = async () => {
    // 1. Device orientation (iOS 13+)
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission()
        if (result !== 'granted') {
          alert('Device orientation permission is required for AR.')
          return
        }
      } catch (err) {
        console.warn('Orientation permission error:', err)
      }
    }

    // 2. Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      // Stop the test stream — CameraBackground will open its own
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.warn('Camera permission error:', err)
    }

    // 3. Geolocation (just trigger the prompt)
    navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true })

    setPermitted(true)
  }

  if (!permitted) {
    return (
      <div style={styles.permissionGate}>
        <div style={styles.permissionCard}>
          <h1 style={styles.permissionTitle}>Cre8Tive Sync AR</h1>
          <p style={styles.permissionDesc}>
            This app uses your camera, GPS, and motion sensors to show
            points of interest in augmented reality.
          </p>
          <button style={styles.permissionBtn} onClick={requestPermissions}>
            Start AR Experience
          </button>
        </div>
      </div>
    )
  }

  return <ARSceneInner />
}

// ─── Main ARScene (rendered after permissions granted) ──────────────

function ARSceneInner() {
  const [targetedPoiId, setTargetedPoiId] = useState(null)
  const [activePoi, setActivePoi] = useState(null)
  const [arFailed, setArFailed] = useState(false)
  const [debugPlaced, setDebugPlaced] = useState(false)
  const debugSphereRef = useRef()

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
      {/* Rear camera feed as background */}
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
        <div>Shutter: {targeted ? 'ENABLED' : 'disabled'}</div>
        <div>Panel open: {activePoi ? activePoi.name : 'no'}</div>
        <div>Debug sphere: {debugPlaced ? 'PLACED' : 'waiting...'}</div>
      </div>

      {/* HOW TO TEST — remove later */}
      <div style={styles.howTo}>
        1. Aim crosshair at red sphere{'\n'}
        2. Crosshair turns green + shutter lights up{'\n'}
        3. Tap shutter to open panel
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
        <DebugForwardSphere poiId={allPois[0]?.id} sphereRef={debugSphereRef} onPlaced={() => setDebugPlaced(true)} />
        <DirectionArrow targetRef={debugSphereRef} visible={debugPlaced} />

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

      <Crosshair active={targeted} />

      {/* POI name hint when targeted */}
      {targeted && !activePoi && (
        <div style={styles.targetHint}>
          {allPois.find((p) => p.id === targetedPoiId)?.name}
        </div>
      )}

      {panelOpen && <PanoramicView onClose={() => setPanelOpen(false)} />}
    </div>
  )
}

const styles = {
  arButton: {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
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
  howTo: {
    position: 'fixed',
    top: '50%',
    right: '0.5rem',
    transform: 'translateY(-50%)',
    zIndex: 30,
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '0.55rem',
    padding: '8px 10px',
    borderRadius: '6px',
    lineHeight: 1.8,
    pointerEvents: 'none',
    whiteSpace: 'pre-line',
    maxWidth: '35vw',
  },
  permissionGate: {
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  permissionCard: {
    textAlign: 'center',
    maxWidth: '320px',
  },
  permissionTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '1rem',
  },
  permissionDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  permissionBtn: {
    padding: '14px 36px',
    borderRadius: '999px',
    border: 'none',
    background: '#00ffcc',
    color: '#0a0a1a',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
}
